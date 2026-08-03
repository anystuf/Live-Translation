export const MIN_FINALISE_WORDS = 8;
export const SHORT_TURN_DELAY_MS = 1400;
export const READY_TURN_DELAY_MS = 800;

export function getTurnFinaliseDelayMs(source: string, target: string): number {
  const combinedText = `${source} ${target}`.trim();
  if (!combinedText) return SHORT_TURN_DELAY_MS;

  const wordCount = combinedText.split(/\s+/).filter(Boolean).length;
  return wordCount >= MIN_FINALISE_WORDS ? READY_TURN_DELAY_MS : SHORT_TURN_DELAY_MS;
}
