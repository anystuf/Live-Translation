# Live API reference notes

Every non-obvious value in this codebase, and where it came from. Verified
2026-07-29 against the Gemini Live API docs and `@google/genai` v1.52.0.

Update this file when you verify something new — it exists so the next change
does not have to re-derive the protocol.

## Sources

| Topic | URL |
| --- | --- |
| Live Translate guide | https://ai.google.dev/gemini-api/docs/live-api/live-translate |
| Live API overview | https://ai.google.dev/gemini-api/docs/live |
| Capabilities guide | https://ai.google.dev/gemini-api/docs/live-guide |
| Session management | https://ai.google.dev/gemini-api/docs/live-session |
| Ephemeral tokens | https://ai.google.dev/gemini-api/docs/ephemeral-tokens |
| WebSocket reference | https://ai.google.dev/api/live |

Plain-text versions for fetching: append `.md.txt` to any of the above.
The docs index is at https://ai.google.dev/gemini-api/docs/llms.txt.

## Model

`gemini-3.5-live-translate-preview` — the recommended model for all Live
Translate use cases. Set in `src/config.ts` and `server/constants.ts`.

Note the general Live API model is `gemini-3.1-flash-live-preview`; it is
**not** what we use, because it has no translation config.

## Translation config

Only two fields exist. There is no source-language, voice, speaker or dubbing
option — the model auto-detects the source language.

```json
"translationConfig": {
  "targetLanguageCode": "en",
  "echoTargetLanguage": true
}
```

- `targetLanguageCode` — BCP-47. Vietnamese is `vi`, English is `en`. Defaults
  to `en`. The guide's full table (78 codes) is transcribed into
  `src/lib/languages.ts`, which is what the operator's picker lists.
- `echoTargetLanguage` — when the input is *already* English, echo it through
  instead of silencing it. Set `true` here because UEH speakers mix English
  terminology into Vietnamese sentences, and silencing those stretches would
  drop content from the captions.

On the wire, `translationConfig` lives **inside `generationConfig`**, not
alongside it.

Because `setup` is only sent at connect, the direction is fixed for a
connection's lifetime — including across our reconnects, which replay the same
setup. The UI therefore locks the language pickers while a session is running.

The "spoken language" picker in the UI sends nothing. It exists to set the
`lang` attribute on the source caption line and to name the direction in the
exported transcript; `auto` omits both claims.

## Full setup message we send

```json
{
  "setup": {
    "model": "models/gemini-3.5-live-translate-preview",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "translationConfig": { "targetLanguageCode": "en", "echoTargetLanguage": true }
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "sessionResumption": {},
    "contextWindowCompression": { "slidingWindow": {} }
  }
}
```

`inputAudioTranscription` / `outputAudioTranscription` take an empty object to
enable. Input transcription follows the input audio language (Vietnamese);
output transcription follows the output language (English). These two fields are
what the entire caption UI renders.

## Audio contract

| Direction | Format |
| --- | --- |
| Input | Raw PCM, 16-bit, little-endian, mono, **16 kHz**, MIME `audio/pcm;rate=16000` |
| Output | Raw PCM, 16-bit, little-endian, mono, **24 kHz** |

Optimal chunk size is **100 ms** → 1600 samples at 16 kHz (`CHUNK_SAMPLES`).

PCM travels base64-encoded in JSON both ways.

Send `{"realtimeInput": {"audioStreamEnd": true}}` when the mic pauses for over
a second, so the server flushes cached audio.

Use `realtimeInput` for all realtime input. `clientContent` is only for seeding
initial history and must not be used for live input. The Live Translate model
additionally **rejects text input** — audio only.

## Ephemeral tokens

Created server-side with `ai.authTokens.create()`. Requires
`httpOptions: { apiVersion: 'v1alpha' }` on both the client construction and the
call config.

| Field | Meaning | Ours |
| --- | --- | --- |
| `uses` | Sessions the token may start | `1` |
| `expireTime` | Overall lifetime | 30 min |
| `newSessionExpireTime` | Window to start a new session | 2 min |
| `liveConnectConstraints` | Locks model/config into the token | model only |

### The WebSocket URL differs for ephemeral tokens

Verified in `node_modules/@google/genai/dist/index.mjs` (around line 16676):
when the API key starts with `auth_tokens/`, the SDK switches the method to
`BidiGenerateContentConstrained` and the query parameter to `access_token`.

```
wss://generativelanguage.googleapis.com/ws/
  google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained
  ?access_token=<token.name>
```

With a plain API key it would instead be `...GenerativeService.BidiGenerateContent?key=<key>`.
We never do that from the browser.

The SDK logs a warning that ephemeral token support is experimental — expect it
to change, and re-check this on SDK upgrades.

## Session lifetime

- A connection lasts roughly **10 minutes**.
- Audio-only sessions run ~15 minutes without compression; we enable
  `contextWindowCompression: { slidingWindow: {} }` to go longer.
- Context window is 128k tokens.

**Session resumption:** include `sessionResumption` in setup and the server
sends `sessionResumptionUpdate` messages containing `newHandle`. Store the
newest handle and pass it back as `sessionResumption.handle` when reconnecting.
Handles stay valid for **2 hours** after the session ends.

**GoAway:** the server sends `goAway` with `timeLeft` shortly before it closes
the connection. We reconnect immediately on receiving it rather than waiting for
the close, which avoids a visible caption gap.

## Server messages we handle

| Field | Handling |
| --- | --- |
| `setupComplete` | Mark ready; only now may audio be sent |
| `serverContent.inputTranscription.text` | Append to the Vietnamese line |
| `serverContent.outputTranscription.text` | Append to the English line |
| `serverContent.modelTurn.parts[].inlineData.data` | Base64 24 kHz PCM → playback |
| `serverContent.interrupted` | Clear the playback queue |
| `serverContent.turnComplete` | Finalise the caption pair into history |
| `sessionResumptionUpdate.newHandle` | Store for reconnect |
| `goAway.timeLeft` | Reconnect early |

**A single event can contain several of these at once.** Check every field
independently; never chain them with `else if`.

## Documented limitations to expect on the day

From the Live Translate guide:

- Voice consistency degrades after long pauses and in multi-speaker scenarios.
- Language detection struggles with heavy accents and with similar language
  pairs.
- Background-noise filtering is incomplete — a quiet mic position matters.
- Audio input only; no text input.

Also relevant: code execution and URL context are unsupported, and function
calling is synchronous only. None are used here.
