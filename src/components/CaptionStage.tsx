/**
 * The projector view.
 *
 * The translation is the primary line because that is what the audience needs;
 * the spoken source sits underneath, smaller, so the speaker and organisers can
 * confirm the system heard correctly. Recent history scrolls above the live
 * line so a late glance still catches the last sentence.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import type { CaptionEntry, TranslationSettings } from '../lib/types';
import { langAttribute, languageLabel } from '../lib/languages';
import { getProcessingLabel } from '../lib/processingState';

export const CaptionStage = memo(function CaptionStage({
  history,
  liveSource,
  liveTarget,
  processingPhase,
  showSource,
  fontScale,
  settings,
}: {
  history: CaptionEntry[];
  liveSource: string;
  liveTarget: string;
  processingPhase: 'idle' | 'thinking' | 'typing' | 'answering';
  showSource: boolean;
  fontScale: number;
  /** Direction of the utterance in progress. Past entries carry their own. */
  settings: TranslationSettings;
}) {
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const targetEndRef = useRef<HTMLDivElement>(null);
  const sourceEndRef = useRef<HTMLDivElement>(null);
  const targetAtEndRef = useRef(true);
  const sourceAtEndRef = useRef(true);

  const updateAtEnd = useCallback(
    (el: HTMLElement, ref: React.MutableRefObject<boolean>) => {
      ref.current = el.scrollHeight - el.scrollTop - el.clientHeight < 16;
    },
    [],
  );

  const handleTargetScroll = useCallback(() => {
    const targetEl = targetScrollRef.current;
    if (targetEl) updateAtEnd(targetEl, targetAtEndRef);
  }, [updateAtEnd]);

  const handleSourceScroll = useCallback(() => {
    const sourceEl = sourceScrollRef.current;
    if (sourceEl) updateAtEnd(sourceEl, sourceAtEndRef);
  }, [updateAtEnd]);

  useEffect(() => {
    const targetEl = targetScrollRef.current;
    if (!targetEl) return;

    targetEl.addEventListener('scroll', handleTargetScroll, { passive: true });
    updateAtEnd(targetEl, targetAtEndRef);
    return () => targetEl.removeEventListener('scroll', handleTargetScroll);
  }, [handleTargetScroll, updateAtEnd]);

  useEffect(() => {
    if (!showSource) return;

    const sourceEl = sourceScrollRef.current;
    if (!sourceEl) return;

    sourceEl.addEventListener('scroll', handleSourceScroll, { passive: true });
    updateAtEnd(sourceEl, sourceAtEndRef);
    return () => sourceEl.removeEventListener('scroll', handleSourceScroll);
  }, [showSource, handleSourceScroll, updateAtEnd]);

  // Keep the newest caption in view, but only if the operator hasn't scrolled up.
  useEffect(() => {
    if (targetEndRef.current && targetAtEndRef.current) {
      targetEndRef.current.scrollIntoView({ block: 'end' });
    }
    if (showSource && sourceEndRef.current && sourceAtEndRef.current) {
      sourceEndRef.current.scrollIntoView({ block: 'end' });
    }
  }, [history.length, liveSource, liveTarget, showSource]);

  const isEmpty = history.length === 0 && !liveTarget && !liveSource;
  const processingLabel = getProcessingLabel(processingPhase);

  return (
    <section
      className="caption-stage"
      style={{ ['--font-scale' as string]: String(fontScale) }}
      aria-label="Live captions"
    >
      {isEmpty ? (
        <div className="caption-placeholder">
          <p className="placeholder-title">Waiting for speech…</p>
          <p className="placeholder-sub">
            {languageLabel(settings.sourceLanguage)} → {languageLabel(settings.targetLanguage)}
          </p>
        </div>
      ) : null}

      <div className={`caption-panels ${showSource ? 'split' : 'single'}`}>
        <section className="caption-panel caption-panel--target" aria-label="Translated captions">
          {showSource ? <div className="panel-label">Translated</div> : null}
          <div className="caption-scroll" ref={targetScrollRef}>
            {liveTarget || liveSource ? (
              <div className="processing-state" aria-live="polite">
                <span className={`processing-dot phase-${processingPhase}`} />
                <span>{processingLabel}</span>
              </div>
            ) : null}
            {history.map((entry) => (
              <article key={entry.id} className="caption-block past">
                <p className="caption-target" lang={langAttribute(entry.targetLanguage)}>
                  {entry.target}
                </p>
              </article>
            ))}

            {liveTarget ? (
              <article className="caption-block current" aria-live="polite">
                <p className="caption-target" lang={langAttribute(settings.targetLanguage)}>
                  {liveTarget}
                  <span className="caret" aria-hidden="true" />
                </p>
              </article>
            ) : null}

            <div ref={targetEndRef} />
          </div>
        </section>

        {showSource ? (
          <section className="caption-panel caption-panel--source" aria-label="Source captions">
            <div className="panel-label">Source</div>
            <div className="caption-scroll" ref={sourceScrollRef}>
              {history.map((entry) => (
                <article key={entry.id} className="caption-block past">
                  <p className="caption-source" lang={langAttribute(entry.sourceLanguage)}>
                    {entry.source}
                  </p>
                </article>
              ))}

              {liveSource ? (
                <article className="caption-block current" aria-live="polite">
                  <p className="caption-source" lang={langAttribute(settings.sourceLanguage)}>
                    {liveSource}
                    <span className="caret" aria-hidden="true" />
                  </p>
                </article>
              ) : null}

              <div ref={sourceEndRef} />
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
});
