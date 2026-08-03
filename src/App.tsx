import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlBar } from './components/ControlBar';
import { CaptionStage } from './components/CaptionStage';
import OperatorSuggestions from './components/OperatorSuggestions';
import { useLiveTranslation } from './hooks/useLiveTranslation';
import { listInputDevices, listOutputDevices } from './lib/audioCapture';
import { toDeviceOptions, type MediaDeviceOption } from './lib/deviceOptions';
import { downloadTranscript } from './lib/exportTranscript';
import { AUTO_DETECT } from './lib/languages';
import type { TranslationSettings } from './lib/types';
import type { VietnameseAccentProfile } from './lib/normalizationTypes';
import {
  DEFAULT_ECHO_TARGET_LANGUAGE,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from './config';

export default function App() {
  const [settings, setSettings] = useState<TranslationSettings>({
    sourceLanguage: DEFAULT_SOURCE_LANGUAGE,
    targetLanguage: DEFAULT_TARGET_LANGUAGE,
    echoTargetLanguage: DEFAULT_ECHO_TARGET_LANGUAGE,
  });

  // Load persisted pronunciation profile if present.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pronunciationProfile');
      if (raw) {
        setSettings((s) => ({ ...s, pronunciationProfile: raw as VietnameseAccentProfile }));
      } else {
        setSettings((s) => ({ ...s, pronunciationProfile: 'mixed-unknown' }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist pronunciation profile when it changes.
  useEffect(() => {
    try {
      const p = (settings as any).pronunciationProfile;
      if (p) localStorage.setItem('pronunciationProfile', p);
    } catch {
      // ignore
    }
  }, [settings]);

  const live = useLiveTranslation(settings);

  const [devices, setDevices] = useState<MediaDeviceOption[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState('');
  const [showSource, setShowSource] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [cabinAudioLanguage, setCabinAudioLanguage] = useState(
    settings.targetLanguage,
  );
  const [cabinEnabled, setCabinEnabled] = useState(false);
  const prevSettingsRef = useRef<TranslationSettings | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(toDeviceOptions(await listInputDevices(), 'Microphone'));
    } catch {
      // Device enumeration can fail before any permission prompt; the default
      // device still works, so this is not worth surfacing.
    }

    try {
      setOutputDevices(toDeviceOptions(await listOutputDevices(), 'Speaker'));
    } catch {
      // Output enumeration may fail in some browsers without a prior permission.
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  // Keep the cabin audio language in sync with the chosen caption language.
  // This ensures the small separate selector follows the main target language
  // when the operator changes the captions language.
  useEffect(() => {
    setCabinAudioLanguage(settings.targetLanguage);
  }, [settings.targetLanguage]);

  /** Q&A usually runs the other way round; swapping should be one click. */
  const handleSwapLanguages = useCallback(() => {
    setSettings((prev) =>
      prev.sourceLanguage === AUTO_DETECT
        ? prev // Nothing to swap in — the picker is disabled in this state.
        : {
            ...prev,
            sourceLanguage: prev.targetLanguage,
            targetLanguage: prev.sourceLanguage,
          },
    );
  }, []);

  const handleToggleCabin = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setSettings((prev) => {
          prevSettingsRef.current = prev;
          return {
            ...prev,
            sourceLanguage: 'vi',
            targetLanguage: cabinAudioLanguage,
            echoTargetLanguage: true,
          };
        });
        live.setAudioEnabled(true);
        setCabinEnabled(true);
      } else {
        setSettings((prev) => {
          const restored = prevSettingsRef.current ?? prev;
          prevSettingsRef.current = null;
          return restored;
        });
        live.setAudioEnabled(false);
        setCabinEnabled(false);
      }
    },
    [live, cabinAudioLanguage],
  );

  const handleStart = useCallback(async () => {
    await live.start(selectedDeviceId || undefined);
    // Labels only become readable after permission is granted.
    void refreshDevices();
  }, [live, selectedDeviceId, refreshDevices]);

  const restartSession = useCallback(async () => {
    await live.stop();
    await handleStart();
  }, [live, handleStart]);

  // Operator shortcuts. Ignored while a form control has focus so typing in the
  // device picker does not trigger them.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;

      if (event.key === 'h' || event.key === 'H') {
        setChromeVisible((v) => !v);
      } else if (event.key === 'f' || event.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      } else if (event.key === '+' || event.key === '=') {
        setFontScale((s) => Math.min(2, Number((s + 0.05).toFixed(2))));
      } else if (event.key === '-' || event.key === '_') {
        setFontScale((s) => Math.max(0.7, Number((s - 0.05).toFixed(2))));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={`app${chromeVisible ? '' : ' chrome-hidden'}`}>
      {chromeVisible ? (
        <ControlBar
          status={live.status}
          statusDetail={live.statusDetail}
          isRunning={live.isRunning}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          outputDevices={outputDevices}
          selectedOutputDeviceId={selectedOutputDeviceId}
          onSelectOutputDevice={(id) => {
            setSelectedOutputDeviceId(id);
            live.setOutputDevice(id || null);
          }}
          settings={settings}
          onSettings={setSettings}
          onSwapLanguages={handleSwapLanguages}
          cabinEnabled={cabinEnabled}
          onToggleCabin={handleToggleCabin}
          cabinAudioLanguage={cabinAudioLanguage}
          onCabinAudioLanguage={setCabinAudioLanguage}
          onStart={() => void handleStart()}
          onStop={() => void live.stop()}
          sessionTargetLanguage={live.sessionTargetLanguage}
          onRestart={() => void restartSession()}
          micLabel={live.micLabel}
          micLevel={live.micLevel}
          audioEnabled={live.audioEnabled}
          onToggleAudio={live.setAudioEnabled}
          showSource={showSource}
          onToggleSource={setShowSource}
          fontScale={fontScale}
          onFontScale={setFontScale}
          onExport={() => downloadTranscript(live.history)}
          onClear={live.clearHistory}
        />
      ) : null}

      <OperatorSuggestions suggestions={live.operatorSuggestions} onAction={(id, action) => live.applyOperatorAction(id, action)} />

      <CaptionStage
        history={live.history}
        liveSource={live.liveSource}
        liveTarget={live.liveTarget}
        processingPhase={live.processingPhase}
        showSource={showSource}
        fontScale={fontScale}
        settings={settings}
      />

      {chromeVisible ? (
        <footer className="notice-bar">
          <span className="hint">H hide controls · F fullscreen · +/− caption size</span>
          {live.notices.length > 0 ? (
            <span className="notices">{live.notices[live.notices.length - 1]}</span>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
