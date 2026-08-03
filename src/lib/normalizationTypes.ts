export type VietnameseAccentProfile =
  | 'general-vietnamese'
  | 'southern-vietnamese'
  | 'mekong-delta-vietnamese'
  | 'mixed-unknown';

export type CorrectionMode = 'automatic' | 'context-required' | 'operator-suggestion';

export interface AccentVariant {
  text: string;
  accentProfiles: VietnameseAccentProfile[];
  confidence: 'high' | 'medium' | 'low';
  correctionMode: CorrectionMode;
}

export interface PronunciationLexiconEntry {
  id: string;
  canonical: string;
  category:
    | 'acronym'
    | 'design-thinking'
    | 'innovation'
    | 'entrepreneurship'
    | 'startup'
    | 'business'
    | 'program';
  ipa?: string;
  pronunciationHint?: string;
  safeAliases: AccentVariant[];
  ambiguousAliases: AccentVariant[];
  contextTerms?: string[];
  negativeContextTerms?: string[];
  priority: number;
}

export interface NormalizationContext {
  selectedAccentProfile: VietnameseAccentProfile;
  previousText?: string;
  currentText: string;
  nextText?: string;
  eventGlossaryTerms?: string[];
  section?: string;
}

export interface AppliedCorrection {
  entryId: string;
  original: string;
  replacement: string;
  confidenceScore: number;
  reason: 'safe-alias' | 'context-supported' | 'accent-supported' | 'operator-approved';
}

export interface NormalizationResult {
  rawText: string;
  normalizedText: string;
  corrections: AppliedCorrection[];
  suggestions: Array<{
    entryId: string;
    original: string;
    proposedReplacement: string;
    confidenceScore: number;
  }>;
}
