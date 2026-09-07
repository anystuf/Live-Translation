/**
 * Operator controls. Hidden with the "H" key so the projector shows only
 * captions once the talk is running.
 */
import { memo } from 'react';
import type { MediaDeviceOption } from '../lib/deviceOptions';
import { StatusPill } from './StatusPill';
import { MicMeter } from './MicMeter';
import { AUTO_DETECT, LANGUAGES } from '../lib/languages';
import type { ConnectionStatus, TranslationSettings } from '../lib/types';
import type { VietnameseAccentProfile } from '../lib/normalizationTypes';

export const ControlBar = memo(function ControlBar({
  status,
  statusDetail,
  isRunning,
  devices,
  selectedDeviceId,
  onSelectDevice,
  outputDevices,
  selectedOutputDeviceId,
  onSelectOutputDevice,
  settings,
  mode,
  onModeChange,
  onSettings,
  onSwapLanguages,
  cabinEnabled,
  onToggleCabin,
  cabinAudioLanguage,
  onCabinAudioLanguage,
  onStart,
  onStop,
  sessionTargetLanguage,
  onRestart,
  micLabel,
  micLevel,
  audioEnabled,
  onToggleAudio,
  showSource,
  onToggleSource,
  fontScale,
  onFontScale,
  onExport,
  onClear,
}: {
  status: ConnectionStatus;
  statusDetail: string;
  isRunning: boolean;
  devices: MediaDeviceOption[];
  selectedDeviceId: string;
  onSelectDevice(id: string): void;
  outputDevices: MediaDeviceOption[];
  selectedOutputDeviceId: string;
  onSelectOutputDevice(id: string): void;
  settings: TranslationSettings;
  mode: 'translate' | 'transcribe';
  onModeChange(mode: 'translate' | 'transcribe'): void;
  onSettings(next: TranslationSettings): void;
  onSwapLanguages(): void;
  cabinEnabled: boolean;
  onToggleCabin(enabled: boolean): void;
  cabinAudioLanguage: string;
  onCabinAudioLanguage(language: string): void;
  onStart(): void;
  onStop(): void;
  sessionTargetLanguage: string | null;
  onRestart(): void;
  micLabel: string;
  micLevel: number;
  audioEnabled: boolean;
  onToggleAudio(enabled: boolean): void;
  showSource: boolean;
  onToggleSource(show: boolean): void;
  fontScale: number;
  onFontScale(scale: number): void;
  onExport(): void;
  onClear(): void;
}) {
  // The direction is fixed inside the Live API `setup` message, so it can only
  // be chosen between sessions — same rule as the microphone.
  const lockedWhileRunning = isRunning
    ? 'Stop translating to change the direction'
    : undefined;
  return (
    <header className="control-bar">
      <div className="control-group brand">
        <span className="brand-mark">Live Translation</span>
      </div>

      <div className="control-group tab-group" role="tablist" aria-label="Mode">
        <button
          type="button"
          className={`tab-button ${mode === 'translate' ? 'active' : ''}`}
          onClick={() => onModeChange('translate')}
          role="tab"
          aria-selected={mode === 'translate'}
        >
          Translate
        </button>
        <button
          type="button"
          className={`tab-button ${mode === 'transcribe' ? 'active' : ''}`}
          onClick={() => onModeChange('transcribe')}
          role="tab"
          aria-selected={mode === 'transcribe'}
        >
          Transcribe
        </button>
      </div>

      <div className="control-group">
        <StatusPill status={status} detail={statusDetail} />
      </div>

      <div className="control-group">
        <select
          className="device-select"
          value={selectedDeviceId}
          onChange={(event) => onSelectDevice(event.target.value)}
          disabled={isRunning}
          aria-label="Microphone"
        >
          <option value="">Default microphone</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <select
          className="device-select"
          value={selectedOutputDeviceId}
          onChange={(event) => onSelectOutputDevice(event.target.value)}
          disabled={isRunning || outputDevices.length === 0}
          aria-label="Audio output"
        >
          <option value="">Default speaker</option>
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <select
          className="lang-select"
          value={settings.sourceLanguage}
          onChange={(event) => onSettings({ ...settings, sourceLanguage: event.target.value })}
          disabled={isRunning}
          aria-label="Spoken language"
          title={
            lockedWhileRunning ??
            'Language spoken on stage. The model detects this itself — the choice only labels the source caption line and the exported transcript.'
          }
        >
          <option value={AUTO_DETECT}>Auto-detect</option>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>

        {mode === 'translate' ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-swap"
              onClick={onSwapLanguages}
              disabled={isRunning || settings.sourceLanguage === AUTO_DETECT}
              title={
                lockedWhileRunning ??
                (settings.sourceLanguage === AUTO_DETECT
                  ? 'Pick a spoken language before swapping'
                  : 'Swap the two languages')
              }
              aria-label="Swap languages"
            >
              ⇄
            </button>

            <select
              className="lang-select"
              value={settings.targetLanguage}
              onChange={(event) => onSettings({ ...settings, targetLanguage: event.target.value })}
              disabled={isRunning}
              aria-label="Caption language"
              title={lockedWhileRunning ?? 'Language the captions are translated into'}
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="control-group">
        {isRunning ? (
          <button type="button" className="btn btn-stop" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-start" onClick={onStart}>
            {mode === 'transcribe' ? 'Start transcribing' : 'Start translating'}
          </button>
        )}
      </div>

      <div className="control-group">
        {isRunning && settings.targetLanguage !== sessionTargetLanguage ? (
          <div className="restart-notice" role="status" aria-live="polite">
            <span>Language change requires a restart to take effect.</span>
            <button type="button" className="btn btn-ghost" onClick={onRestart} disabled={!isRunning}>
              Restart to apply
            </button>
          </div>
        ) : null}

        {audioEnabled ? (
          <label className="toggle" title={lockedWhileRunning ?? 'Choose the cabin audio language for in-ear playback'}>
            <select
              className="lang-select"
              value={cabinAudioLanguage}
              onChange={(event) => onCabinAudioLanguage(event.target.value)}
              disabled={isRunning}
              aria-label="Cabin audio language"
            >
              <option value="en">English</option>
              <option value="ru">Russian</option>
              <option value="zh-Hans">Chinese (Simplified)</option>
              <option value="vi">Vietnamese</option>
            </select>
          </label>
        ) : null}

        <button
          type="button"
          className={`btn btn-ghost btn-cabin${cabinEnabled ? ' active' : ''}`}
          onClick={() => onToggleCabin(!cabinEnabled)}
          disabled={isRunning}
          aria-pressed={cabinEnabled}
          title={
            lockedWhileRunning ??
            'Toggle cabin translation preset (sets source to Vietnamese and enables cabin audio)'
          }
        >
          Cabin
        </button>
      </div>

      <div className="control-group grow">
        <MicMeter level={micLevel} label={micLabel} />
      </div>

      <div className="control-group">
        <label className="toggle" title="Show the spoken-language line under each caption">
          <input
            type="checkbox"
            checked={showSource}
            onChange={(event) => onToggleSource(event.target.checked)}
          />
          <span>Source</span>
        </label>

        <label
          className="toggle"
          title={
            lockedWhileRunning ??
            'When the speaker is already using the caption language, pass it through instead of going silent. Off means those stretches vanish from the captions.'
          }
        >
          <input
            type="checkbox"
            checked={settings.echoTargetLanguage}
            disabled={isRunning}
            onChange={(event) =>
              onSettings({ ...settings, echoTargetLanguage: event.target.checked })
            }
          />
          <span>Echo</span>
        </label>

        <label className="toggle" title="This setting helps rank terminology corrections; it does not identify the speaker's accent.">
          <select
            value={(settings.pronunciationProfile ?? 'mixed-unknown') as VietnameseAccentProfile}
            disabled={isRunning}
            onChange={(event) => onSettings({ ...settings, pronunciationProfile: event.target.value as VietnameseAccentProfile })}
            aria-label="Pronunciation support"
          >
            <option value="mixed-unknown">Pronunciation support: Mixed / Unknown</option>
            <option value="general-vietnamese">General Vietnamese English</option>
            <option value="southern-vietnamese">Southern Vietnamese English</option>
            <option value="mekong-delta-vietnamese">Mekong Delta Vietnamese English</option>
          </select>
        </label>

        <label
          className="toggle"
          title="Play translated audio to the selected cabin language. Keep off if room speakers can reach the microphone."
        >
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(event) => onToggleAudio(event.target.checked)}
          />
          <span>Audio</span>
        </label>
      </div>

      <div className="control-group">
        <label className="slider" title="Caption size">
          <span aria-hidden="true">A</span>
          <input
            type="range"
            min={0.7}
            max={2}
            step={0.05}
            value={fontScale}
            onChange={(event) => onFontScale(Number(event.target.value))}
            aria-label="Caption size"
          />
        </label>
      </div>

      <div className="control-group">
        <button type="button" className="btn btn-ghost" onClick={onExport}>
          Export
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Clear
        </button>
      </div>
    </header>
  );
});
