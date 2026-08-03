/**
 * Live Translate session over a raw Live API WebSocket.
 *
 * Why raw WebSocket instead of @google/genai's `ai.live.connect()`:
 * `LiveConnectConfig` in @google/genai v1.52.0 exposes no `translationConfig`
 * field, so the SDK cannot start a Live Translate session. The Live Translate
 * guide documents the raw `setup` message, and that is what we send here.
 * The SDK is still used server-side to mint ephemeral tokens.
 *
 * Lifecycle handled here:
 *   token -> connect -> setup -> setupComplete -> stream audio -> transcripts
 *   ...and on drop: reconnect with the stored session-resumption handle.
 */
import {
  LIVE_TRANSLATE_MODEL,
  LIVE_WS_BASE,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  TOKEN_ENDPOINT,
} from '../config';
import { bytesToBase64 } from './base64';
import type {
  ConnectionStatus,
  LiveServerMessage,
  LiveSetupMessage,
  TranslationConfig,
} from './types';

export interface SessionCallbacks {
  onStatus(status: ConnectionStatus, detail?: string): void;
  /** Incremental transcript text in the spoken (source) language. */
  onSourceDelta(text: string): void;
  /** Incremental transcript text in the target language. */
  onTargetDelta(text: string): void;
  /** The model finished a turn — the caller should finalise the current pair. */
  onTurnComplete(): void;
  /** Translated 24 kHz PCM audio, base64. */
  onAudio(base64Pcm: string): void;
  /** The model was interrupted — drop any queued playback. */
  onInterrupted(): void;
  /** Non-fatal notice worth surfacing to the operator. */
  onNotice(message: string): void;
}

export class LiveTranslateSession {
  private ws: WebSocket | null = null;
  private callbacks: SessionCallbacks;

  /**
   * Translation direction for this session. Fixed for its lifetime: it is part
   * of the `setup` message, which is only sent at connect, so changing it means
   * a new session — the UI enforces that by locking the pickers while running.
   */
  private translation: TranslationConfig;

  /** Set once the server acknowledges `setup`; gates outbound audio. */
  private ready = false;

  /** True from start() until stop(); controls whether we auto-reconnect. */
  private running = false;

  /** Latest resumption handle from the server, replayed on reconnect. */
  private resumptionHandle: string | undefined;

  private reconnectAttempts = 0;
  private reconnectTimer: number | undefined;

  constructor(callbacks: SessionCallbacks, translation: TranslationConfig) {
    this.callbacks = callbacks;
    this.translation = translation;
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** Open the session. Safe to call once; use stop() before calling again. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.reconnectAttempts = 0;
    await this.connect();
  }

  /** Close the session and stop reconnecting. */
  stop(): void {
    this.running = false;
    this.ready = false;
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.ws?.close();
    this.ws = null;
    this.callbacks.onStatus('stopped');
  }

  /**
   * Stream one chunk of 16 kHz mono PCM16 from the microphone.
   * Silently drops chunks that arrive while the socket is down — the mic keeps
   * running across reconnects and we would rather lose 100 ms than throw.
   */
  sendAudioChunk(pcm16: Int16Array): void {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return;

    const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: bytesToBase64(bytes),
            mimeType: 'audio/pcm;rate=16000',
          },
        },
      }),
    );
  }

  /**
   * Tell the server the mic has paused so it flushes any cached audio.
   * The guide recommends this whenever the stream pauses for over a second.
   */
  sendAudioStreamEnd(): void {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  }

  // --- internals -----------------------------------------------------------

  private async connect(): Promise<void> {
    this.ready = false;
    this.callbacks.onStatus('requesting-token');

    let token: string;
    try {
      token = await this.fetchToken();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.callbacks.onStatus('error', `Could not get an ephemeral token: ${detail}`);
      this.scheduleReconnect();
      return;
    }

    this.callbacks.onStatus('connecting');

    // Ephemeral tokens go in `access_token`, not `key`.
    const ws = new WebSocket(`${LIVE_WS_BASE}?access_token=${encodeURIComponent(token)}`);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify(this.buildSetupMessage()));
    };

    ws.onmessage = (event) => {
      void this.handleMessage(event.data);
    };

    ws.onerror = () => {
      // The close handler runs next and owns the reconnect decision; a WS error
      // event carries no useful detail, so we only note it.
      this.callbacks.onNotice('WebSocket error');
    };

    ws.onclose = (event) => {
      this.ready = false;
      if (!this.running) return;
      this.callbacks.onNotice(
        `Connection closed (${event.code}${event.reason ? `: ${event.reason}` : ''})`,
      );
      this.scheduleReconnect();
    };
  }

  private async fetchToken(): Promise<string> {
    const response = await fetch(TOKEN_ENDPOINT, { method: 'POST' });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`${response.status} ${response.statusText} ${body}`.trim());
    }
    const data = (await response.json()) as { token?: string };
    if (!data.token) throw new Error('Token server returned no token');
    return data.token;
  }

  private buildSetupMessage(): LiveSetupMessage {
    const setup: LiveSetupMessage['setup'] = {
      // The wire protocol expects the fully-qualified resource name.
      model: `models/${LIVE_TRANSLATE_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        translationConfig: this.translation,
      },
      // Both transcriptions on: input gives us the source caption line, output
      // gives us the translated one. This is what drives the whole UI.
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // Passing the previous handle resumes context after a drop; handles stay
      // valid for 2 hours after the session ends.
      sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
      contextWindowCompression: { slidingWindow: {} },
    };

    return { setup };
  }

  private async handleMessage(raw: unknown): Promise<void> {
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (raw instanceof Blob) {
      // Browsers deliver Live API frames as Blobs.
      text = await raw.text();
    } else if (raw instanceof ArrayBuffer) {
      text = new TextDecoder().decode(raw);
    } else {
      return;
    }

    let message: LiveServerMessage;
    try {
      message = JSON.parse(text) as LiveServerMessage;
    } catch {
      this.callbacks.onNotice('Received a non-JSON frame from the Live API');
      return;
    }

    if (message.error) {
      this.callbacks.onStatus(
        'error',
        message.error.message ?? `Live API error ${message.error.code ?? ''}`.trim(),
      );
      return;
    }

    if (message.setupComplete) {
      this.ready = true;
      this.reconnectAttempts = 0;
      this.callbacks.onStatus('live');
    }

    // Store the newest handle so a reconnect can resume this session.
    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) {
      this.resumptionHandle = message.sessionResumptionUpdate.newHandle;
    }

    // The server warns before it closes; reconnecting now avoids a caption gap.
    if (message.goAway) {
      this.callbacks.onNotice(
        `Server will close the connection${
          message.goAway.timeLeft ? ` in ${message.goAway.timeLeft}` : ''
        } — reconnecting`,
      );
      this.ready = false;
      this.ws?.close();
      return;
    }

    const content = message.serverContent;
    if (!content) return;

    // A single event can carry several parts at once — handle all of them,
    // never `else if` between transcript and audio.
    if (content.inputTranscription?.text) {
      this.callbacks.onSourceDelta(content.inputTranscription.text);
    }
    if (content.outputTranscription?.text) {
      this.callbacks.onTargetDelta(content.outputTranscription.text);
    }
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onAudio(part.inlineData.data);
        }
      }
    }
    if (content.interrupted) {
      this.callbacks.onInterrupted();
    }
    if (content.turnComplete) {
      this.callbacks.onTurnComplete();
    }
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer !== undefined) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts++;
    this.callbacks.onStatus('reconnecting', `retrying in ${Math.round(delay / 100) / 10}s`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }
}
