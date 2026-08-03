import type { EventTranslationProfile } from './types';
import { uiiSipShare3Glossary } from '../glossaries/uiiSipShare3Glossary';

export const uiiSipShare3Profile: EventTranslationProfile = {
  id: 'uii-sip-share-3-2026',
  title: 'UII SIP & SHARE #3',
  subtitle: 'AI-Powered Customer Insight for Growth',
  date: '31 July 2026',
  sourceLanguage: 'vi',
  targetLanguage: 'en',
  speakers: [
    { name: 'Phạm Lê Thắng', role: 'Sales Director', organization: 'Cloud Ace Vietnam' },
    { name: 'Tình Võ', role: 'Account Manager', organization: 'Cloud Ace Việt Nam' },
  ],
  sections: [
    { id: 'warm-up', label: 'Warm-up Discussion', mode: 'discussion' },
    { id: 'keynote', label: 'Keynote Speech', mode: 'presentation' },
    { id: 'fishbowl', label: 'Fishbowl Conversation', mode: 'discussion' },
    { id: 'networking', label: 'Networking and Bonding', mode: 'networking' },
  ],
  glossary: uiiSipShare3Glossary,
  translationSettings: {
    defaultAudioEnabled: false,
    defaultEchoTargetLanguage: true,
    operatorMode: true,
    softSegmentLimitMs: 15000,
    hardSegmentLimitMs: 25000,
    normalFinaliseDelayMs: 1200,
    metricExtraDelayMs: 400,
  },
};
