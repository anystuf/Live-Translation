import type { GlossaryEntry } from '../../lib/glossary';

export type EventSectionMode = 'presentation' | 'discussion' | 'networking';

export type EventSection = {
  id: string;
  label: string;
  mode: EventSectionMode;
};

export type EventSpeaker = {
  name: string;
  role?: string;
  organization?: string;
};

export type EventTranslationProfile = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  sourceLanguage: string;
  targetLanguage: string;
  speakers?: EventSpeaker[];
  sections?: EventSection[];
  glossary: GlossaryEntry[];
  translationSettings?: {
    defaultAudioEnabled?: boolean;
    defaultEchoTargetLanguage?: boolean;
    operatorMode?: boolean;
    softSegmentLimitMs?: number;
    hardSegmentLimitMs?: number;
    normalFinaliseDelayMs?: number;
    metricExtraDelayMs?: number;
  };
};
