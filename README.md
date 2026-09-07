# UEH Live Translation

Real-time Vietnamese → English captions for speaker events at UEH University.

A laptop takes the lectern microphone, streams it to the Gemini Live API's
translation model, and projects large English captions with the Vietnamese
source beneath them. Optionally plays the translated English audio for
interpreter headsets.

```
┌──────────────────────────────────────────────────────────────┐
│ UEH Live Translation  ● Live   [mic ▾] [Stop]  ▓▓▓▓▁▁▁▁      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Good morning, and welcome to today's seminar.              │
│   Xin chào buổi sáng, và chào mừng đến với hội thảo hôm nay. │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Setup

Requires Node 20+ and a Gemini API key from
[AI Studio](https://aistudio.google.com/apikey).

```powershell
npm install
Copy-Item .env.example .env
# edit .env and set GEMINI_API_KEY
npm run dev
```

Open http://localhost:5173 and press **Start translating**.

The API key stays on the server. The browser receives only short-lived
ephemeral tokens, so nothing sensitive ends up in the bundle or in devtools.

## Operating it at an event

**Before the talk**

1. Plug in the lectern mic and select it in the device dropdown.
2. Press Start and speak — confirm the **mic meter moves**. If it does not, the
   problem is the cable or the device selection, not the software. A silent
   meter and a silent room look identical in the captions.
3. Confirm captions appear, then press **F** for fullscreen and **H** to hide
   the controls.

**Keyboard shortcuts**

| Key | Action |
| --- | --- |
| `H` | Show / hide the control bar |
| `F` | Fullscreen |
| `+` / `-` | Caption size |

**Audio output is off by default.** Only turn it on for headphones or a separate
feed — if room speakers can reach the lectern mic, the model will hear its own
English output and translate it again.

**Export** downloads the full bilingual transcript as Markdown. Do it before
closing the tab; nothing is persisted server-side.

### If something goes wrong mid-talk

The app reconnects automatically. A Live API connection only lasts about ten
minutes, so several reconnects during a long talk are normal — captions resume
with context intact via session resumption, and the status pill shows amber
while it happens. Occasional dropped audio during a reconnect is expected.

If the status pill goes red, check the message in the footer. The usual causes
are a missing or invalid `GEMINI_API_KEY` and API quota.

## How it works

```
browser                                    server
mic → AudioWorklet → 16 kHz PCM16
    → WebSocket (Live Translate)           POST /api/token
    ← Vietnamese + English transcripts           ↓
    ← 24 kHz PCM audio                     ai.authTokens.create(GEMINI_API_KEY)
```

The Vietnamese line comes from `inputAudioTranscription` and the English line
from `outputAudioTranscription` on the same session, which is why the two stay
aligned.

The client talks to the Live API over a raw WebSocket rather than through
`@google/genai`: as of v1.52.0 the SDK's `LiveConnectConfig` has no
`translationConfig` field, so it cannot start a translation session. The SDK is
still used server-side for token minting. See
[`docs/live-api-reference.md`](docs/live-api-reference.md) for the protocol
details and their sources, and [`CLAUDE.md`](CLAUDE.md) for the reasoning behind
each decision.

## Configuration

| Where | What |
| --- | --- |
| `src/config.ts` | Model, source/target language, audio rates, chunk size |
| `.env` | `GEMINI_API_KEY`, port, allowed origins, token lifetimes |

To translate into a different language, change `TARGET_LANGUAGE` in
`src/config.ts` to any of the 70+ supported BCP-47 codes. The source language is
auto-detected, so `SOURCE_LANGUAGE` only affects labelling.

## Known limitations

Documented by Google for the Live Translate model:

- Voice consistency degrades after long pauses and with multiple speakers.
- Language detection struggles with heavy accents and similar language pairs.
- Background noise is not fully filtered — microphone placement matters.

## Scripts

```powershell
npm run dev        # token server + Vite dev server
npm run build      # typecheck and build to dist/
npm run typecheck
npm start          # production server: frontend + token API
```

### Public deployment on Render

GitHub Pages can display the interface but cannot run the token server. Deploy
this repository as a Render web service to run both parts on one HTTPS URL:

1. Open [Render](https://render.com), choose **New → Blueprint**, and connect
   this GitHub repository.
2. Render reads `render.yaml`. When prompted, enter `GEMINI_API_KEY` as a secret.
3. Create the service and wait for the first deployment to finish.
4. Open the generated `https://...onrender.com` address and allow microphone
   access.

The production server serves `dist/` and `/api/token` from the same origin.
Render's generated URL is allowed automatically. For a custom domain, set:

```text
ALLOWED_ORIGINS=https://your-domain.example
```

The free Render plan may sleep while unused, so its first request can take a
little longer. For event use, choose an always-on plan and test the microphone,
network, Gemini quota, and a full reconnect cycle before the talk.
