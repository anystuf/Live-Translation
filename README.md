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
npm start          # token server only (production)
```

### GitHub Pages deployment

This project is ready for GitHub Pages hosting from the generated `dist/` folder.

1. If this folder is not already a Git repository, initialize it and push it to GitHub:

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

2. If you are publishing to a repository site, set `VITE_BASE_PATH` to the repo path.
   For example:

```text
VITE_BASE_PATH=/your-repo-name/
```

   If you are publishing to a user or organization site, use `/` instead.

3. Build the app locally:

```powershell
npm ci
npm run build
```

4. The build output will be in `dist/`. You can preview it locally with:

```powershell
npm run preview
```

A GitHub Actions workflow is included in `.github/workflows/pages.yml` to build
and publish the site automatically whenever you push to `main`.

> Note: GitHub Pages can host only the static frontend. The token server in
`server/index.ts` cannot run on Pages.
>
> For a fully working deployment, host the token server on a separate HTTPS-capable
> server and configure `ALLOWED_ORIGINS` to include the Pages origin.
>
For production, serve `dist/` as static files and run the token server behind
the same origin, with `ALLOWED_ORIGINS` set accordingly. The Live API requires
HTTPS for microphone access anywhere other than `localhost`.
>>>>>>> 92195cf (Initial project import for Live Translation UI)
