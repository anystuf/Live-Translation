export type MergeMode = 'replacement' | 'duplicate' | 'overlap' | 'append' | 'empty';

export interface MergeResult {
  text: string;
  mode: MergeMode;
}

const normalize = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .trim();

const safeOverlapLength = (previous: string, incoming: string): number => {
  const max = Math.min(previous.length, incoming.length);

  for (let length = max; length > 0; length -= 1) {
    if (previous.endsWith(incoming.slice(0, length))) {
      return length;
    }
  }

  return 0;
};

export function mergeIncrementalText(previous: string, incoming: string): MergeResult {
  const prev = normalize(previous);
  const next = normalize(incoming);

  if (!next) {
    return { text: prev, mode: 'empty' };
  }

  if (!prev) {
    return { text: next, mode: 'append' };
  }

  if (prev === next) {
    return { text: prev, mode: 'duplicate' };
  }

  if (prev.includes(next)) {
    return { text: prev, mode: 'duplicate' };
  }

  // Prefer a replacement when the incoming text is a direct extension of
  // the previous (it starts with the previous). This avoids treating cases
  // where the previous appears later in the incoming string (repeated
  // fragments) as a clean replacement, which can produce duplicated output.
  if (next.startsWith(prev)) {
    return { text: next, mode: 'replacement' };
  }

  const overlap = safeOverlapLength(prev, next);
  if (overlap > 0) {
    return { text: prev + next.slice(overlap), mode: 'overlap' };
  }

  return { text: `${prev} ${next}`, mode: 'append' };
}
