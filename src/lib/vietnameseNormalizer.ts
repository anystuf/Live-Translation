import type {
  NormalizationContext,
  NormalizationResult,
  AppliedCorrection,
} from './normalizationTypes';
import { vietnamesePronunciationLexicon } from './vietnameseLexicon';

const protectedPatterns = [
  /https?:\/\/[\w\-.~:\/\?#[\]@!$&'()*+,;=%]+/gi,
  /\b[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g,
];

const defaultWeights = {
  exactSafeAlias: 50,
  strongContext: 20,
  additionalContextPer: 5,
  additionalContextMax: 15,
  selectedAccentProfile: 10,
  generalVietnameseAlias: 5,
  highPriorityEntry: 10,
  ambiguousAlias: -15,
  lowConfidenceRegionalAlias: -20,
  negativeContext: -40,
  replacementIsCommonWord: -15,
};

function preserveCapitalization(original: string, replacement: string) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase())
    return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export function normalizeVietnameseEnglishTerminology(
  text: string,
  context: NormalizationContext,
  sessionAlwaysApplyIds: string[] = [],
): NormalizationResult {
  const rawText = text;
  if (!text) return { rawText, normalizedText: text, corrections: [], suggestions: [] };

  // Protect URLs/emails by skipping replacement inside those spans.
  const protectedSpans: Array<{ start: number; end: number }> = [];
  for (const p of protectedPatterns) {
    let m: RegExpExecArray | null;
    p.lastIndex = 0;
    while ((m = p.exec(text))) {
      protectedSpans.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  const corrections: AppliedCorrection[] = [];
  const suggestions: NormalizationResult['suggestions'] = [];

  // Collect candidate matches without mutating text yet.
  type Candidate = {
    entryId: string;
    original: string;
    start: number;
    end: number;
    replacement: string;
    score: number;
    reason: AppliedCorrection['reason'];
  };

  const candidates: Candidate[] = [];

  const ctxLower = `${context.previousText ?? ''} ${context.currentText} ${context.nextText ?? ''}`.toLowerCase();

  for (const entry of vietnamesePronunciationLexicon) {
    const checkVariants = (variants: any[], aliasType: 'safe' | 'ambiguous') => {
      for (const v of variants) {
        const esc = v.text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Simple case-insensitive match; boundaries are handled conservatively
        const pattern = new RegExp(esc, 'gi');
        let m: RegExpExecArray | null;
        pattern.lastIndex = 0;
        while ((m = pattern.exec(text))) {
          const start = m.index;
          const end = start + m[0].length;
          if (protectedSpans.some((s) => start >= s.start && end <= s.end)) continue;

          let score = 0;
          let reason: AppliedCorrection['reason'] = 'safe-alias';

          // exact safe alias base score
          if (aliasType === 'safe') score += defaultWeights.exactSafeAlias;
          else score += -15; // ambiguous base penalty

          // context matches
          let ctxMatches = 0;
          if (entry.contextTerms) {
            for (const term of entry.contextTerms) {
              if (ctxLower.includes(term.toLowerCase())) ctxMatches++;
            }
          }
          if (ctxMatches > 0) score += defaultWeights.strongContext + Math.min(defaultWeights.additionalContextMax, (ctxMatches - 1) * defaultWeights.additionalContextPer);

          // accent profile
          if (v.accentProfiles && v.accentProfiles.includes(context.selectedAccentProfile)) score += defaultWeights.selectedAccentProfile;
          else if (v.accentProfiles.includes('general-vietnamese')) score += defaultWeights.generalVietnameseAlias;

          // entry priority
          if ((entry.priority ?? 0) >= 90) score += defaultWeights.highPriorityEntry;

          // session-level always-apply for operator-approved entries
          if (sessionAlwaysApplyIds && sessionAlwaysApplyIds.includes(entry.id)) score += 1000;

          // penalties
          if (v.confidence === 'low') score += defaultWeights.lowConfidenceRegionalAlias;
          if (aliasType === 'ambiguous') score += defaultWeights.ambiguousAlias;

          // negative context
          if (entry.negativeContextTerms) {
            for (const n of entry.negativeContextTerms) {
              if (ctxLower.includes(n.toLowerCase())) score += defaultWeights.negativeContext;
            }
          }

          // If replacement would change a common English word, penalize lightly,
          // but avoid penalizing when the canonical is multiple words (e.g. "pain point").
          if (/^[a-z]+$/i.test(m[0]) && m[0].toLowerCase() !== entry.canonical.toLowerCase() && !/\s/.test(entry.canonical)) {
            score += defaultWeights.replacementIsCommonWord;
          }

          const matchedText = m[0];
          const replacement = preserveCapitalization(matchedText, entry.canonical);

          candidates.push({ entryId: entry.id, original: m[0], start, end, replacement, score, reason });
        }
      }
    };

    checkVariants(entry.safeAliases, 'safe');
    checkVariants(entry.ambiguousAliases, 'ambiguous');
  }

  // Sort candidates by start position then longer-first to apply longer phrases before shorter
  candidates.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  // Apply non-overlapping corrections building a new string
  let out = '';
  let cursor = 0;
  for (const c of candidates) {
    if (c.start < cursor) continue; // overlapping, skip
    // decide action
    if (c.score >= 70) {
      // automatic
      out += text.slice(cursor, c.start) + c.replacement;
      corrections.push({ entryId: c.entryId, original: c.original, replacement: c.replacement, confidenceScore: c.score, reason: c.reason });
      cursor = c.end;
    } else if (c.score >= 45) {
      // suggestion
      suggestions.push({ entryId: c.entryId, original: c.original, proposedReplacement: c.replacement, confidenceScore: c.score });
      // do not change text
    }
  }
  out += text.slice(cursor);

  return { rawText, normalizedText: out, corrections, suggestions };
}

export default normalizeVietnameseEnglishTerminology;
