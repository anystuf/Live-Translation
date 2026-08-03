/**
 * VU meter. At a live event the single most useful diagnostic is "is the mic
 * actually receiving anything" — a silent room and a dead cable look identical
 * in the captions but completely different here.
 */
export function MicMeter({ level, label }: { level: number; label: string }) {
  // Perceptual curve: linear amplitude barely moves for normal speech.
  const width = Math.min(100, Math.round(Math.sqrt(level) * 100));

  return (
    <div className="mic-meter" title={label}>
      <div className="mic-meter-track">
        <div
          className={`mic-meter-fill${width > 92 ? ' clipping' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="mic-meter-label">{label || 'No microphone'}</span>
    </div>
  );
}
