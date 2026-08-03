import type { PronunciationLexiconEntry } from './normalizationTypes';

export const vietnamesePronunciationLexicon: PronunciationLexiconEntry[] = [
  {
    id: 'sga',
    canonical: 'SGA',
    category: 'acronym',
    safeAliases: [
      { text: 'S G A', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: "S G A's", accentProfiles: ['mixed-unknown'], confidence: 'medium', correctionMode: 'automatic' },
      { text: 'ess gee ay', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'ess gee ayz', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'ess jee ay', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'ess jee ayz', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'ét gi ây', accentProfiles: ['southern-vietnamese', 'mekong-delta-vietnamese'], confidence: 'medium', correctionMode: 'automatic' },
      { text: 'ét zi ây', accentProfiles: ['southern-vietnamese'], confidence: 'medium', correctionMode: 'automatic' },
      { text: 'ét di ây', accentProfiles: ['mekong-delta-vietnamese'], confidence: 'medium', correctionMode: 'automatic' },
    ],
    ambiguousAliases: [],
    contextTerms: [],
    priority: 100,
  },

  {
    id: 'roadmap',
    canonical: 'roadmap',
    category: 'business',
    safeAliases: [
      { text: 'road map', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'road-map', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
    ],
    ambiguousAliases: [
      { text: 'role map', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'context-required' },
      { text: 'route map', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'context-required' },
      { text: 'gô map', accentProfiles: ['mekong-delta-vietnamese'], confidence: 'low', correctionMode: 'operator-suggestion' },
    ],
    contextTerms: ['startup', 'product', 'growth', 'development', 'milestone', 'timeline'],
    priority: 80,
  },

  {
    id: 'cohort',
    canonical: 'cohort',
    category: 'program',
    safeAliases: [
      { text: 'co-hort', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'co hort', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
    ],
    ambiguousAliases: [
      { text: 'co host', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'context-required' },
      { text: 'co-host', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'context-required' },
      { text: 'court', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'operator-suggestion' },
    ],
    contextTerms: ['incubation', 'program', 'participant', 'incubatee', 'batch'],
    negativeContextTerms: ['event host', 'podcast host', 'co-host of the event'],
    priority: 80,
  },

  {
    id: 'pain-point',
    canonical: 'pain point',
    category: 'business',
    safeAliases: [
      { text: 'painpoint', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'pain-point', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
    ],
    ambiguousAliases: [
      { text: 'pinpoint', accentProfiles: ['general-vietnamese'], confidence: 'low', correctionMode: 'context-required' },
    ],
    contextTerms: ['customer', 'user', 'problem', 'challenge', 'interview', 'feedback'],
    negativeContextTerms: ['pinpoint the cause', 'pinpoint the error', 'painting'],
    priority: 90,
  },

  // Extended small set
  {
    id: 'design-thinking',
    canonical: 'Design Thinking',
    category: 'design-thinking',
    safeAliases: [
      { text: 'design tinking', accentProfiles: ['mixed-unknown'], confidence: 'high', correctionMode: 'automatic' },
      { text: 'đi zain tin king', accentProfiles: ['general-vietnamese'], confidence: 'medium', correctionMode: 'operator-suggestion' },
    ],
    ambiguousAliases: [],
    contextTerms: ['empathy', 'ideation', 'prototype', 'iteration'],
    priority: 60,
  },

  {
    id: 'pitch-deck',
    canonical: 'pitch deck',
    category: 'entrepreneurship',
    safeAliases: [
      { text: 'pitch desk', accentProfiles: ['general-vietnamese'], confidence: 'high', correctionMode: 'automatic' },
    ],
    ambiguousAliases: [],
    contextTerms: ['investor', 'fundraising', 'presentation'],
    priority: 70,
  },
];

export default vietnamesePronunciationLexicon;
