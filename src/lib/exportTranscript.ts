/**
 * Export the session transcript. Organisers usually want the bilingual record
 * afterwards, and it is the only artefact of the event that survives the tab
 * being closed.
 */
import type { CaptionEntry } from '../lib/types';
import { languageLabel } from './languages';

function timestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour12: false });
}

/**
 * Directions used across the session, in the order they first appear — the
 * operator may have stopped, switched languages and started again.
 */
function directions(entries: CaptionEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const key = `${entry.sourceLanguage}>${entry.targetLanguage}`;
    if (!seen.has(key)) {
      seen.set(
        key,
        `${languageLabel(entry.sourceLanguage)} → ${languageLabel(entry.targetLanguage)}`,
      );
    }
  }
  return [...seen.values()];
}

export function buildTranscriptMarkdown(entries: CaptionEntry[]): string {
  const header = [
    '# Live Translation transcript',
    '',
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    `Direction: ${directions(entries).join(', ') || '—'}`,
    `Utterances: ${entries.length}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = entries
    .map((entry) => {
      const lines = [
        `### ${timestamp(entry.at)}`,
        '',
        `**${languageLabel(entry.targetLanguage)}:** ${entry.target}`,
      ];
      if (entry.source) lines.push('', `_${languageLabel(entry.sourceLanguage)}:_ ${entry.source}`);
      return lines.join('\n');
    })
    .join('\n\n');

  return `${header}${body}\n`;
}

export function downloadTranscript(entries: CaptionEntry[]): void {
  const markdown = buildTranscriptMarkdown(entries);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const link = document.createElement('a');
  link.href = url;
  link.download = `live-translation-transcript-${stamp}.md`;
  link.click();

  URL.revokeObjectURL(url);
}
