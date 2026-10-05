export type CaptionPair = {
  source: string;
  target: string;
};

type ProtectedName = {
  canonical: string;
  sourceAliases: RegExp[];
  targetAliases: RegExp[];
  negativeSourcePatterns?: RegExp[];
};

/**
 * Event-specific names that speech recognition may interpret as ordinary
 * Vietnamese words and then translate by meaning. Keep corrections paired:
 * "Chàm" really can mean "indigo", so it is only treated as the person's
 * name when the source and translation provide matching evidence.
 */
const protectedNames: ProtectedName[] = [
  {
    canonical: 'Chamira',
    sourceAliases: [/\bchamira\b/giu, /\bchàm\b/giu],
    targetAliases: [/\bchamira\b/giu, /\bindigo\b/giu, /\bidigo\b/giu],
    negativeSourcePatterns: [/\bmàu\s+chàm\b/giu, /\bthuốc\s+nhuộm\s+chàm\b/giu],
  },
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

function replaceAll(text: string, patterns: RegExp[], replacement: string): string {
  return patterns.reduce((result, pattern) => {
    pattern.lastIndex = 0;
    return result.replace(pattern, replacement);
  }, text);
}

export function protectProperNames(source: string, target: string): CaptionPair {
  let correctedSource = source;
  let correctedTarget = target;

  for (const name of protectedNames) {
    // Requiring evidence on both sides avoids changing a legitimate discussion
    // of the colour/dye "chàm" → "indigo" based on either word alone.
    if (
      matchesAny(correctedSource, name.negativeSourcePatterns ?? []) ||
      !matchesAny(correctedSource, name.sourceAliases) ||
      !matchesAny(correctedTarget, name.targetAliases)
    ) {
      continue;
    }

    correctedSource = replaceAll(correctedSource, name.sourceAliases, name.canonical);
    correctedTarget = replaceAll(correctedTarget, name.targetAliases, name.canonical);
  }

  return { source: correctedSource, target: correctedTarget };
}
