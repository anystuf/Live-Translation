import type { GlossaryEntry } from '../../lib/glossary';

export const uiiSipShare3Glossary: GlossaryEntry[] = [
  { id: 'event-friday', canonical: 'Friday', sourcePatterns: [/\bFriday\b/gi], priority: 100 },
  { id: 'event-ueh', canonical: 'UEH', sourcePatterns: [/\bUEH\b/gi], priority: 100 },
  { id: 'event-uii', canonical: 'UII', sourcePatterns: [/\bUII\b/gi, /\byou eye eye\b/gi, /\bU I I\b/gi], priority: 100 },
  { id: 'event-sip-share', canonical: 'SIP & SHARE', sourcePatterns: [/\bsip\s+and\s+share\b/gi, /\bship\s+and\s+share\b/gi], priority: 90 },
  { id: 'event-cloud-ace', canonical: 'Cloud Ace', sourcePatterns: [/\bcloud\s+age\b/gi], priority: 90 },
  { id: 'event-google-cloud', canonical: 'Google Cloud', sourcePatterns: [/\bgoogle\s+cloud\b/gi], priority: 80 },
  { id: 'event-google-cloud-platform', canonical: 'Google Cloud Platform', sourcePatterns: [/\bgoogle\s+cloud\s+platform\b/gi], priority: 80 },
  { id: 'event-vertex-ai', canonical: 'Vertex AI', sourcePatterns: [/\bvertex\s+(?:a\s*i|ai)\b/gi], priority: 80 },
  { id: 'event-bigquery', canonical: 'BigQuery', sourcePatterns: [/\bbig\s+query\b/gi], priority: 80 },
  { id: 'event-dataplex', canonical: 'Dataplex', sourcePatterns: [/\bdata\s+flex\b/gi], priority: 80 },
  { id: 'event-alloydb', canonical: 'AlloyDB', sourcePatterns: [/\balloy\s*d\s*b\b/gi], priority: 80 },
  { id: 'event-pubsub', canonical: 'Pub/Sub', sourcePatterns: [/\bpub\s*sub\b/gi], priority: 80 },
  { id: 'event-roas', canonical: 'ROAS', sourcePatterns: [/\bR\s*O\s*A\s*S\b/gi, /\broas\b/gi], priority: 80 },
  { id: 'event-tco', canonical: 'TCO', sourcePatterns: [/\bT\s*C\s*O\b/gi, /\btco\b/gi], priority: 80 },
  { id: 'event-ai', canonical: 'AI', sourcePatterns: [/\bA\s*I\b/gi, /\bAI\b/gi], priority: 70 },
  { id: 'event-data-analytics', canonical: 'Data and Analytics', sourcePatterns: [/\bdata\s+and\s+analytics\b/gi], priority: 60 },
];
