/**
 * Minimal typings for the raw Live API WebSocket protocol.
 *
 * We hand-roll these because @google/genai (v1.52.0) has no `translationConfig`
 * on LiveConnectConfig, so the SDK cannot express a Live Translate session.
 * Field names follow the JSON wire format (camelCase).
 */

export interface TranslationConfig {
  /** BCP-47 target language code, e.g. "en". */
  targetLanguageCode: string;
  /** Echo input that is already in the target language instead of silencing it. */
  echoTargetLanguage: boolean;
}

/**
 * What the operator chose in the control bar. `sourceLanguage` is display-only
 * (the API has no source field); the other two go into `translationConfig`.
 */
import type { VietnameseAccentProfile } from './normalizationTypes';

export interface TranslationSettings {
  /** BCP-47 code, or `AUTO_DETECT`. Labels the source line; never sent. */
  sourceLanguage: string;
  targetLanguage: string;
  echoTargetLanguage: boolean;
  /** Optional pronunciation profile selected by the operator. */
  pronunciationProfile?: VietnameseAccentProfile;
}

export interface LiveSetupMessage {
  setup: {
    model: string;
    generationConfig: {
      responseModalities: ['AUDIO'];
      translationConfig: TranslationConfig;
    };
    /** Empty object enables transcription of the incoming (Vietnamese) audio. */
    inputAudioTranscription: Record<string, never>;
    /** Empty object enables transcription of the outgoing (English) audio. */
    outputAudioTranscription: Record<string, never>;
    /** Ask the server to emit resumption handles so we survive disconnects. */
    sessionResumption?: { handle?: string };
    /** Sliding-window compression keeps long sessions from hitting the limit. */
    contextWindowCompression?: { slidingWindow: Record<string, never> };
  };
}

export interface InlineData {
  mimeType?: string;
  /** Base64-encoded PCM. */
  data?: string;
}

export interface ServerContent {
  modelTurn?: { parts?: Array<{ inlineData?: InlineData; text?: string }> };
  /** Transcript of the input audio — Vietnamese. */
  inputTranscription?: { text?: string };
  /** Transcript of the output audio — English. */
  outputTranscription?: { text?: string };
  turnComplete?: boolean;
  generationComplete?: boolean;
  interrupted?: boolean;
}

export interface LiveServerMessage {
  setupComplete?: Record<string, unknown>;
  serverContent?: ServerContent;
  sessionResumptionUpdate?: { newHandle?: string; resumable?: boolean };
  /** Sent shortly before the server closes the connection. */
  goAway?: { timeLeft?: string };
  usageMetadata?: { totalTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
}

export type ConnectionStatus =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'stopped'
  | 'error';

/** One finalised utterance: what was said, and what it means. */
export interface CaptionEntry {
  id: string;
  /** Source-language transcript. */
  source: string;
  /** Target-language transcript. */
  target: string;
  /** Languages in force when this entry was captured — the operator can change
   *  them between runs, and old captions must keep their own labels. */
  sourceLanguage: string;
  targetLanguage: string;
  /** Wall-clock time the entry was finalised. */
  at: number;
}

// Normalization metadata added by the Vietnamese-English terminology layer.
export interface CaptionNormalizationMeta {
  /** Normalized source text (preserve original `source`). */
  normalizedSource?: string;
  /** Corrections applied to produce the normalized text. */
  corrections?: Array<{
    entryId: string;
    original: string;
    replacement: string;
    confidenceScore?: number;
  }>;
}

// Extend CaptionEntry with optional normalization metadata without breaking
// existing consumers.
export type CaptionEntryWithNormalization = CaptionEntry & CaptionNormalizationMeta;
