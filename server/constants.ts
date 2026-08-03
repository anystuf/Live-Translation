/**
 * Shared server constants.
 *
 * Kept separate from src/config.ts because the server is compiled under
 * tsconfig.node.json and must not pull in any browser-only types.
 */

/**
 * The Live Translate model. Per the Live Translate guide this is the
 * recommended model for all Live Translate use cases.
 * https://ai.google.dev/gemini-api/docs/live-api/live-translate
 */
export const LIVE_TRANSLATE_MODEL = 'gemini-3.5-live-translate-preview';
