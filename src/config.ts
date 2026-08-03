/**
 * Client configuration for the UEH live translation stage display.
 *
 * Every value here traces back to the Gemini Live API documentation — see
 * docs/live-api-reference.md for the citation behind each one.
 */

/** Recommended model for all Live Translate use cases. */
export const LIVE_TRANSLATE_MODEL = 'gemini-3.5-live-translate-preview';

/**
 * Live API WebSocket endpoint.
 *
 * When authenticating with an ephemeral token (`auth_tokens/...`) the method is
 * `BidiGenerateContentConstrained` and the credential goes in an `access_token`
 * query parameter — not `key`. Ephemeral tokens are v1alpha only.
 */
export const LIVE_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

/**
 * Where the language pickers start. The operator can change all three before
 * pressing Start; these are only the defaults for a UEH event.
 *
 * The source language is *not* a protocol field — the model detects it from the
 * audio — so this value only labels the source caption line and the exported
 * transcript. See src/lib/languages.ts.
 */
export const DEFAULT_SOURCE_LANGUAGE = 'vi';

/** Target language for the captions. BCP-47, sent as `targetLanguageCode`. */
export const DEFAULT_TARGET_LANGUAGE = 'en';

/**
 * If the speaker switches into the target language, echo it through rather than
 * silencing it. On by default: UEH speakers mix English terminology into
 * Vietnamese sentences, and silencing those stretches drops content.
 */
export const DEFAULT_ECHO_TARGET_LANGUAGE = true;

/** Live API audio input contract: raw PCM, 16-bit, mono, little-endian, 16 kHz. */
export const INPUT_SAMPLE_RATE = 16_000;

/** Live API audio output contract: raw PCM, 16-bit, mono, little-endian, 24 kHz. */
export const OUTPUT_SAMPLE_RATE = 24_000;

/** Optimal realtime chunk size per the Live Translate guide. */
export const CHUNK_MS = 100;

/** Samples per outbound chunk at the input rate. */
export const CHUNK_SAMPLES = (INPUT_SAMPLE_RATE * CHUNK_MS) / 1000;

/** Where the browser fetches an ephemeral token. */
export const TOKEN_ENDPOINT = '/api/token';

/**
 * A Live API connection lasts roughly 10 minutes. A university talk runs far
 * longer, so we reconnect using the session-resumption handle the server sends.
 */
export const RECONNECT_BASE_DELAY_MS = 500;
export const RECONNECT_MAX_DELAY_MS = 8_000;

/** How many finalised caption pairs to keep in the scrollback. */
export const MAX_HISTORY_ENTRIES = 400;
