/**
 * The projector view.
 *
 * The translation is the primary line because that is what the audience needs;
 * the spoken source sits underneath, smaller, so the speaker and organisers can
 * confirm the system heard correctly. Recent history scrolls above the live
 * line so a late glance still catches the last sentence.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  mode,
  onEditSource,
  onEditTarget,
}: {
  history: CaptionEntry[];
  liveSource: string;
  liveTarget: string;
  processingPhase: 'idle' | 'thinking' | 'typing' | 'answering';
  showSource: boolean;
  mode?: 'translate' | 'transcribe';
  fontScale: number;
  /** Direction of the utterance in progress. Past entries carry their own. */
  settings: TranslationSettings;
  onEditSource?: (value: string) => void;
  onEditTarget?: (value: string) => void;
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

  const [editingTarget, setEditingTarget] = useState(false);
  const [editingSource, setEditingSource] = useState(false);
  const [targetDraft, setTargetDraft] = useState(liveTarget);
  const [sourceDraft, setSourceDraft] = useState(liveSource);

  useEffect(() => {
    if (!editingTarget) setTargetDraft(liveTarget);
  }, [editingTarget, liveTarget]);

  useEffect(() => {
    if (!editingSource) setSourceDraft(liveSource);
  }, [editingSource, liveSource]);

  const isEmpty = history.length === 0 && !liveTarget && !liveSource;
  const processingLabel = getProcessingLabel(processingPhase);
  const hasActiveTarget = Boolean(liveTarget) || processingPhase !== 'idle' || history.length > 0;
  const hasActiveSource = Boolean(liveSource) || processingPhase !== 'idle' || history.length > 0;

  const submitTargetEdit = useCallback(() => {
    const value = targetDraft.trim();
    onEditTarget?.(value);
    setEditingTarget(false);
  }, [onEditTarget, targetDraft]);

  const submitSourceEdit = useCallback(() => {
    const value = sourceDraft.trim();
    onEditSource?.(value);
    setEditingSource(false);
  }, [onEditSource, sourceDraft]);

  const beginTargetEdit = useCallback(() => {
    setTargetDraft(liveTarget || '');
    setEditingTarget(true);
  }, [liveTarget]);

  const beginSourceEdit = useCallback(() => {
    setSourceDraft(liveSource || '');
    setEditingSource(true);
  }, [liveSource]);

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

      <div className={`caption-panels ${showSource && mode !== 'transcribe' ? 'split' : 'single'}`}>
        {mode !== 'transcribe' ? (
          <section className="caption-panel caption-panel--target" aria-label="Translated captions">
          <div className="panel-header">
            {showSource ? <div className="panel-label">Translated</div> : null}
          </div>
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

            {hasActiveTarget && !editingTarget ? (
              <article className="caption-block current" aria-live="polite">
                <p
                  className="caption-target caption-editable"
                  lang={langAttribute(settings.targetLanguage)}
                  onClick={beginTargetEdit}
                  role="textbox"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      beginTargetEdit();
                    }
                  }}
                >
                  {liveTarget || ' '}
                  <span className="caret" aria-hidden="true" />
                </p>
              </article>
            ) : null}

            {editingTarget ? (
              <article className="caption-block current caption-editor-block" aria-live="polite">
                <textarea
                  className="caption-editor"
                  value={targetDraft}
                  onChange={(event) => setTargetDraft(event.target.value)}
                  onBlur={submitTargetEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitTargetEdit();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setEditingTarget(false);
                      setTargetDraft(liveTarget || '');
                    }
                  }}
                  autoFocus
                />
              </article>
            ) : null}

            <div ref={targetEndRef} />
          </div>
          </section>
        ) : null}

        {showSource ? (
          <section className="caption-panel caption-panel--source" aria-label="Source captions">
            <div className="panel-header">
              <div className="panel-label">Source</div>
            </div>
            <div className="caption-scroll" ref={sourceScrollRef}>
              {history.map((entry) => (
                <article key={entry.id} className="caption-block past">
                  <p className="caption-source" lang={langAttribute(entry.sourceLanguage)}>
                    {entry.source}
                  </p>
                </article>
              ))}

              {hasActiveSource && !editingSource ? (
                <article className="caption-block current" aria-live="polite">
                  <p
                    className="caption-source caption-editable"
                    lang={langAttribute(settings.sourceLanguage)}
                    onClick={beginSourceEdit}
                    role="textbox"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        beginSourceEdit();
                      }
                    }}
                  >
                    {liveSource || ' '}
                    <span className="caret" aria-hidden="true" />
                  </p>
                </article>
              ) : null}

              {editingSource ? (
                <article className="caption-block current caption-editor-block" aria-live="polite">
                  <textarea
                    className="caption-editor"
                    value={sourceDraft}
                    onChange={(event) => setSourceDraft(event.target.value)}
                    onBlur={submitSourceEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitSourceEdit();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setEditingSource(false);
                        setSourceDraft(liveSource || '');
                      }
                    }}
                    autoFocus
                  />
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
