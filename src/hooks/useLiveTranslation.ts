/**
 * Wires the WebSocket session, the mic and playback together, and exposes the
 * caption state the UI renders.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_HISTORY_ENTRIES } from '../config';
import { startCapture, type CaptureHandle } from '../lib/audioCapture';
import { AudioPlayback } from '../lib/audioPlayback';
import { LiveTranslateSession } from '../lib/liveTranslateSession';
import { detectCabinCommand } from '../lib/commands';
import { mergeIncrementalText } from '../lib/mergeIncrementalText';
import { createFrameCoalescer } from '../lib/frameCoalescer';
import type { CaptionEntry, ConnectionStatus, TranslationSettings } from '../lib/types';
import type { AppliedCorrection } from '../lib/normalizationTypes';
import { normalizeVietnameseEnglishTerminology } from '../lib/vietnameseNormalizer';
import { getTurnFinaliseDelayMs } from '../lib/turnFinalization';

export interface UseLiveTranslation {
  status: ConnectionStatus;
  statusDetail: string;
  /** Source-language transcript for the utterance in progress. */
  liveSource: string;
  /** Target-language transcript for the utterance in progress. */
  liveTarget: string;
  processingPhase: 'idle' | 'thinking' | 'typing' | 'answering';
  /** Finalised utterances, oldest first. */
  history: CaptionEntry[];
  notices: string[];
  micLabel: string;
  micLevel: number;
  audioEnabled: boolean;
  isRunning: boolean;
  sessionTargetLanguage: string | null;
  start(deviceId?: string): Promise<void>;
  stop(): Promise<void>;
  setAudioEnabled(enabled: boolean): void;
  setOutputDevice(deviceId: string | null): void;
  clearHistory(): void;
  operatorSuggestions: Array<{
    id: string;
    entryId: string; // lexicon id
    captionId: string; // caption this suggestion belongs to
    original: string;
    proposedReplacement: string;
    confidenceScore: number;
  }>;
  applyOperatorAction(suggestionId: string, action: 'apply' | 'ignore' | 'always-apply'): void;
}

/**
 * @param settings The operator's chosen direction. Read at Start (the target
 * language is part of the Live API `setup` message, so it cannot change
 * mid-session) and stamped onto each caption as it is finalised.
 */
export function useLiveTranslation(settings: TranslationSettings): UseLiveTranslation {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('');
  const [liveSource, setLiveSource] = useState('');
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'thinking' | 'typing' | 'answering'>('idle');
  const [liveTarget, setLiveTarget] = useState('');
  const [history, setHistory] = useState<CaptionEntry[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [micLabel, setMicLabel] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [audioEnabled, setAudioEnabledState] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTargetLanguage, setSessionTargetLanguage] = useState<string | null>(null);
  const outputDeviceIdRef = useRef<string | null>(null);

  const sessionRef = useRef<LiveTranslateSession | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);

  // Playback is toggled from the UI while callbacks are already bound, so the
  // audio callback reads a ref rather than a captured state value.
  const audioEnabledRef = useRef(false);

  // Transcript deltas arrive far faster than a sensible React render, and
  // finalisation must see the newest text, so the accumulators live in refs and
  // are mirrored into state.
  const sourceRef = useRef('');
  const targetRef = useRef('');
  const finaliseTimerRef = useRef<number | null>(null);
  const liveSourceCoalescerRef = useRef<ReturnType<typeof createFrameCoalescer<string>> | null>(null);
  const liveTargetCoalescerRef = useRef<ReturnType<typeof createFrameCoalescer<string>> | null>(null);
  const operatorSuggestionsRef = useRef<Array<{
    id: string;
    entryId: string;
    captionId: string;
    original: string;
    proposedReplacement: string;
    confidenceScore: number;
  }>>([]);
  const [operatorSuggestions, setOperatorSuggestions] = useState(operatorSuggestionsRef.current);
  const sessionAlwaysApplyRef = useRef<string[]>([]);
  const processingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    liveSourceCoalescerRef.current = createFrameCoalescer<string>((value) => {
      sourceRef.current = value;
      setLiveSource(value);
    });
    liveTargetCoalescerRef.current = createFrameCoalescer<string>((value) => {
      targetRef.current = value;
      setLiveTarget(value);
    });

    return () => {
      liveSourceCoalescerRef.current?.dispose();
      liveTargetCoalescerRef.current?.dispose();
    };
  }, []);

  // Callbacks are bound once at Start and outlive any render, so they read the
  // settings through a ref rather than a captured value.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const pushNotice = useCallback((message: string) => {
    setNotices((prev) => [...prev.slice(-4), message]);
  }, []);

  const updateProcessingPhase = useCallback((phase: 'idle' | 'thinking' | 'typing' | 'answering') => {
    setProcessingPhase(phase);
  }, []);

  const clearProcessingTimer = useCallback(() => {
    if (processingTimerRef.current !== null) {
      window.clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }, []);

  const applyCabinCommand = useCallback(() => {
    if (!audioEnabledRef.current) {
      audioEnabledRef.current = true;
      setAudioEnabledState(true);
    }
    pushNotice('Cabin translation command detected — English audio enabled.');
  }, [pushNotice]);

  const maybeHandleCabinCommand = useCallback(
    (source: string, target: string) => {
      if (detectCabinCommand(`${source} ${target}`).type !== 'enableCabin') return false;
      applyCabinCommand();
      sourceRef.current = '';
      targetRef.current = '';
      setLiveSource('');
      setLiveTarget('');
      return true;
    },
    [applyCabinCommand],
  );

  /** Move the in-progress utterance into history and reset the accumulators. */
  const finaliseTurn = useCallback(() => {
    if (finaliseTimerRef.current !== null) {
      window.clearTimeout(finaliseTimerRef.current);
      finaliseTimerRef.current = null;
    }

    const source = sourceRef.current.trim();
    const target = targetRef.current.trim();

    if (!source && !target) {
      sourceRef.current = '';
      targetRef.current = '';
      setLiveSource('');
      setLiveTarget('');
      setProcessingPhase('idle');
      clearProcessingTimer();
      return;
    }

    if (maybeHandleCabinCommand(source, target)) return;

    sourceRef.current = '';
    targetRef.current = '';
    setLiveSource('');
    setLiveTarget('');
    setProcessingPhase('idle');
    clearProcessingTimer();

    const { sourceLanguage, targetLanguage } = settingsRef.current;

    // Normalize Vietnamese-source terminology without mutating raw text.
    const normalizationContext = {
      selectedAccentProfile: (settingsRef.current as any).pronunciationProfile ?? 'mixed-unknown',
      previousText: undefined,
      currentText: source,
      nextText: undefined,
    };
    const normalized = normalizeVietnameseEnglishTerminology(source, normalizationContext, sessionAlwaysApplyRef.current);

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          id: entryId,
          source,
          target,
          sourceLanguage,
          targetLanguage,
          at: Date.now(),
          // Normalization metadata
          ...(normalized.normalizedText && { normalizedSource: normalized.normalizedText }),
          ...(normalized.corrections.length > 0 && { corrections: normalized.corrections.map((c) => ({ entryId: c.entryId, original: c.original, replacement: c.replacement, confidenceScore: c.confidenceScore })) }),
          operatorEdited: false,
        },
      ];
      return next.length > MAX_HISTORY_ENTRIES ? next.slice(next.length - MAX_HISTORY_ENTRIES) : next;
    });

    // Publish operator suggestions for this caption, if any
    if (normalized.suggestions.length > 0) {
      const newSugs = normalized.suggestions.map((s, i) => ({
        id: `${entryId}-s${i}`,
        entryId: s.entryId,
        captionId: entryId,
        original: s.original,
        proposedReplacement: s.proposedReplacement,
        confidenceScore: s.confidenceScore,
      }));
      operatorSuggestionsRef.current = [...operatorSuggestionsRef.current, ...newSugs];
      setOperatorSuggestions(operatorSuggestionsRef.current.slice());
    }
  }, [maybeHandleCabinCommand]);

  const scheduleFinaliseTurn = useCallback(() => {
    if (finaliseTimerRef.current !== null) {
      window.clearTimeout(finaliseTimerRef.current);
    }

    const source = sourceRef.current.trim();
    const target = targetRef.current.trim();
    const delayMs = getTurnFinaliseDelayMs(source, target);

    finaliseTimerRef.current = window.setTimeout(() => {
      finaliseTimerRef.current = null;
      finaliseTurn();
    }, delayMs);
  }, [finaliseTurn]);

  const start = useCallback(
    async (deviceId?: string) => {
      if (sessionRef.current) return;

      setNotices([]);
      setStatusDetail('');

      const playback = new AudioPlayback();
      playbackRef.current = playback;
      if (outputDeviceIdRef.current) {
        void playback.setOutputDevice(outputDeviceIdRef.current);
      }

      const session = new LiveTranslateSession(
        {
          onStatus: (next, detail) => {
            setStatus(next);
            setStatusDetail(detail ?? '');
          },
          onSourceDelta: (text) => {
            const merged = mergeIncrementalText(sourceRef.current, text);
            liveSourceCoalescerRef.current?.push(merged.text);
            clearProcessingTimer();
            updateProcessingPhase('thinking');
            processingTimerRef.current = window.setTimeout(() => {
              updateProcessingPhase('typing');
            }, 450);
          },
          onTargetDelta: (text) => {
            const merged = mergeIncrementalText(targetRef.current, text);
            liveTargetCoalescerRef.current?.push(merged.text);
            clearProcessingTimer();
            updateProcessingPhase('typing');
          },
          onTurnComplete: () => {
            clearProcessingTimer();
            updateProcessingPhase('answering');
            scheduleFinaliseTurn();
          },
          onAudio: (base64) => {
            if (!audioEnabledRef.current) return;
            void playback.enqueue(base64);
          },
          onInterrupted: () => playback.clear(),
          onNotice: pushNotice,
        },
        {
          targetLanguageCode: settingsRef.current.targetLanguage,
          echoTargetLanguage: settingsRef.current.echoTargetLanguage,
        },
      );
      sessionRef.current = session;
      setSessionTargetLanguage(settingsRef.current.targetLanguage);

      try {
        const capture = await startCapture({
          deviceId,
          onChunk: (pcm) => session.sendAudioChunk(pcm),
        });
        captureRef.current = capture;
        setMicLabel(capture.deviceLabel);
      } catch (error) {
        // Most often: permission denied, or the exact device is gone.
        const detail = error instanceof Error ? error.message : String(error);
        setStatus('error');
        setStatusDetail(`Microphone unavailable: ${detail}`);
        sessionRef.current = null;
        playbackRef.current = null;
        return;
      }

      setIsRunning(true);
      await session.start();
    },
    [finaliseTurn, pushNotice],
  );

  const stop = useCallback(async () => {
    // Flush whatever the server still holds before tearing the socket down.
    sessionRef.current?.sendAudioStreamEnd();

    await captureRef.current?.stop();
    captureRef.current = null;

    sessionRef.current?.stop();
    sessionRef.current = null;
    setSessionTargetLanguage(null);

    await playbackRef.current?.close();
    playbackRef.current = null;

    finaliseTurn();
    setIsRunning(false);
    setMicLevel(0);
  }, [finaliseTurn]);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    audioEnabledRef.current = enabled;
    setAudioEnabledState(enabled);
    if (!enabled) {
      playbackRef.current?.clear();
    }
  }, []);

  const setOutputDevice = useCallback((deviceId: string | null) => {
    outputDeviceIdRef.current = deviceId;
    if (playbackRef.current) {
      void playbackRef.current.setOutputDevice(deviceId);
    }
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  // Poll the VU meter rather than setting state on every 100 ms audio chunk.
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setMicLevel(captureRef.current?.getLevel() ?? 0);
    }, 100);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // Release the mic and socket if the operator closes the tab mid-event.
  useEffect(() => {
    return () => {
      void captureRef.current?.stop();
      sessionRef.current?.stop();
      void playbackRef.current?.close();
    };
  }, []);

  return {
    status,
    statusDetail,
    liveSource,
    liveTarget,
    processingPhase,
    history,
    notices,
    micLabel,
    micLevel,
    audioEnabled,
    isRunning,
    sessionTargetLanguage,
    start,
    stop,
    setAudioEnabled,
    setOutputDevice,
    clearHistory,
    operatorSuggestions,
    applyOperatorAction(suggestionId: string, action: 'apply' | 'ignore' | 'always-apply') {
      const sugs = operatorSuggestionsRef.current;
      const idx = sugs.findIndex((s) => s.id === suggestionId);
      if (idx === -1) return;
      const sug = sugs[idx];

      if (action === 'ignore') {
        operatorSuggestionsRef.current = sugs.filter((s) => s.id !== suggestionId);
        setOperatorSuggestions(operatorSuggestionsRef.current.slice());
        return;
      }

      if (action === 'always-apply') {
        sessionAlwaysApplyRef.current.push(sug.entryId);
        // fall through to apply immediately
      }

      // Apply: update the matching caption in history, adding operator-approved correction
      setHistory((prev) =>
        prev.map((entry) => {
          if (entry.id !== sug.captionId) return entry;
          const normalizedSource = (entry as any).normalizedSource ?? entry.source;
          const replaced = normalizedSource.replace(sug.original, sug.proposedReplacement);
          const corrections = ((entry as any).corrections ?? []) as AppliedCorrection[];
          corrections.push({ entryId: sug.entryId, original: sug.original, replacement: sug.proposedReplacement, confidenceScore: sug.confidenceScore, reason: 'operator-approved' });
          return { ...(entry as any), normalizedSource: replaced, corrections, operatorEdited: true } as CaptionEntry;
        }),
      );

      // Remove suggestion from the list
      operatorSuggestionsRef.current = sugs.filter((s) => s.id !== suggestionId);
      setOperatorSuggestions(operatorSuggestionsRef.current.slice());
    },
  };
}
