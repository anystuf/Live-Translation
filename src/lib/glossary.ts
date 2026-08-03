export type GlossaryEntry = {
  id: string;
  canonical: string;
  sourcePatterns: RegExp[];
  targetPatterns?: RegExp[];
  sourceReplacement?: string;
  targetReplacement?: string;
  contextPatterns?: RegExp[];
  priority?: number;
};

export type GlossaryResult = {
  text: string;
  corrections: Array<{
    entryId: string;
    original: string;
    replacement: string;
  }>;
};

const protectedPatterns = [
  /https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+/gi,
  /\b[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g,
];

const isProtected = (text: string): boolean => protectedPatterns.some((pattern) => pattern.test(text));

export function applyGlossary(text: string, glossary: GlossaryEntry[]): GlossaryResult {
  let result = text;
  const corrections: GlossaryResult['corrections'] = [];

  for (const entry of [...glossary].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
    const patterns = entry.sourcePatterns;
    const replacement = entry.sourceReplacement ?? entry.canonical;

    for (const pattern of patterns) {
      const match = result.match(pattern);
      if (!match) continue;
      const original = match[0];
      if (isProtected(original)) continue;
      result = result.replace(pattern, replacement);
      corrections.push({ entryId: entry.id, original, replacement });
    }
  }

  return { text: result, corrections };
}
