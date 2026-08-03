/**
 * Ephemeral token server.
 *
 * The browser must never hold GEMINI_API_KEY. Instead it asks this server for a
 * short-lived ephemeral token, which it then uses as the `access_token` query
 * parameter on the Live API WebSocket.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 *   - auth_tokens.create is v1alpha only -> httpOptions.apiVersion = 'v1alpha'
 *   - `uses`                  : how many sessions the token may start (we use 1)
 *   - `expireTime`            : overall token lifetime (default 30 min)
 *   - `newSessionExpireTime`  : window in which a NEW session may be started
 *   - `liveConnectConstraints`: locks fields into the token so a leaked token
 *                               cannot be repurposed against another model.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { LIVE_TRANSLATE_MODEL } from './constants.js';

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.GEMINI_API_KEY;

const TOKEN_EXPIRE_MINUTES = Number(process.env.TOKEN_EXPIRE_MINUTES ?? 30);
const TOKEN_NEW_SESSION_EXPIRE_MINUTES = Number(
  process.env.TOKEN_NEW_SESSION_EXPIRE_MINUTES ?? 2,
);

if (!API_KEY) {
  console.error(
    '\n[fatal] GEMINI_API_KEY is not set.\n' +
      '        Copy .env.example to .env and add your key from https://aistudio.google.com/apikey\n',
  );
  process.exit(1);
}

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalhostOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

// v1alpha is required for ephemeral token support.
const ai = new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: { apiVersion: 'v1alpha' },
});

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / curl requests have no Origin header.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (typeof origin === 'string' && isLocalhostOrigin(origin))
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: LIVE_TRANSLATE_MODEL });
});

/**
 * Mint one ephemeral token. The client calls this before every (re)connect,
 * because a Live API connection lasts ~10 minutes and `uses: 1` means each
 * token is good for exactly one session.
 */
app.post('/api/token', async (_req, res) => {
  try {
    const now = Date.now();
    const expireTime = new Date(now + TOKEN_EXPIRE_MINUTES * 60_000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime: new Date(
          now + TOKEN_NEW_SESSION_EXPIRE_MINUTES * 60_000,
        ).toISOString(),
        // Lock the model into the token. We deliberately do NOT lock the full
        // config: @google/genai's LiveConnectConfig type has no
        // `translationConfig` field (verified in v1.52.0), so the translation
        // settings are sent by the client in the raw `setup` message instead.
        liveConnectConstraints: {
          model: LIVE_TRANSLATE_MODEL,
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    if (!token.name) {
      throw new Error('Token response contained no name');
    }

    // AuthToken only carries `name`, so we report the expiry we requested.
    res.json({
      token: token.name,
      model: LIVE_TRANSLATE_MODEL,
      expiresAt: expireTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[token] mint failed:', message);
    res.status(502).json({ error: 'Failed to mint ephemeral token', detail: message });
  }
});

app.listen(PORT, () => {
  console.log(`[token-server] listening on http://localhost:${PORT}`);
  console.log(`[token-server] model: ${LIVE_TRANSLATE_MODEL}`);
  console.log(`[token-server] allowed origins: ${allowedOrigins.join(', ')}`);
});
