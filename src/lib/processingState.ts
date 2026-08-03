export type CaptionProcessingPhase = 'idle' | 'thinking' | 'typing' | 'answering';

export interface ProcessingPhaseInput {
  isRunning: boolean;
  hasPendingText: boolean;
  hasPreview: boolean;
  isFinalizing: boolean;
}

export function deriveProcessingPhase({
  isRunning,
  hasPendingText,
  hasPreview,
  isFinalizing,
}: ProcessingPhaseInput): CaptionProcessingPhase {
  if (!isRunning) return 'idle';
  if (isFinalizing) return 'answering';
  if (hasPreview) return 'typing';
  if (hasPendingText) return 'thinking';
  return 'idle';
}

export function getProcessingLabel(phase: CaptionProcessingPhase): string {
  switch (phase) {
    case 'thinking':
      return 'Thinking';
    case 'typing':
      return 'Typing';
    case 'answering':
      return 'Answering';
    case 'idle':
    default:
      return 'Listening';
  }
}
