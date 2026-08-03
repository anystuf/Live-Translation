export type FinalisationReason =
  | 'turnComplete'
  | 'punctuation'
  | 'metric'
  | 'longSegment'
  | 'force'
  | 'manual';

export interface FinaliserConfig {
  minDelayMs: number;
  normalDelayMs: number;
  longPauseDelayMs: number;
  forceDelayMs: number;
  softSegmentLimitMs: number;
  hardSegmentLimitMs: number;
  metricExtraDelayMs: number;
}

export interface SegmentState {
  id: string;
  startedAt: number;
  lastUpdatedAt: number;
  rawSource: string;
  rawTarget: string;
  turnCompleteReceived: boolean;
}

const punctuationRe = /[\.\?!…]+$/;
const metricRe = /(?:\b\d+[\d,.]*(?:%|\s*(?:percent|‰|‰|\b)|\s*(?:million|billion|trillion|usd|dollars|us dollars|hours|hrs|minutes|mins|days|months|years|x|times|roas|roi|tco|credits))\b)/i;
const fillerOnlyRe = /^(?:\s*(?:à|ờ|ừ|dạ|vâng|thôi|rồi|à vâng|ờ thì|uh|um|yeah|yes|okay|hello|right|well)+\s*)$/i;

export interface FinalisationDecision {
  delayMs: number;
  reason: FinalisationReason;
}

export function analyseFinalisationDelay(
  state: SegmentState,
  config: FinaliserConfig,
): FinalisationDecision {
  const source = state.rawSource.trim();
  const target = state.rawTarget.trim();
  const duration = Date.now() - state.startedAt;

  if (!source && !target) {
    return { delayMs: config.minDelayMs, reason: 'manual' };
  }

  if (duration >= config.hardSegmentLimitMs) {
    return { delayMs: 0, reason: 'force' };
  }

  if (fillerOnlyRe.test(source) && !target) {
    return { delayMs: config.longPauseDelayMs, reason: 'longSegment' };
  }

  if (punctuationRe.test(source) || punctuationRe.test(target)) {
    return { delayMs: config.minDelayMs, reason: 'punctuation' };
  }

  if (metricRe.test(source) || metricRe.test(target)) {
    return { delayMs: config.normalDelayMs + config.metricExtraDelayMs, reason: 'metric' };
  }

  if (duration >= config.softSegmentLimitMs) {
    return { delayMs: config.minDelayMs, reason: 'longSegment' };
  }

  return { delayMs: config.normalDelayMs, reason: 'turnComplete' };
}

export function isFillerOnly(text: string): boolean {
  return fillerOnlyRe.test(text.trim());
}
