# API Keys (Phase 1)

All of these go in `.env` (copy from `.env.example`). Never commit `.env`.

## Airtable
Personal access token: [airtable.com/create/tokens](https://airtable.com/create/tokens), scopes `data.records:read` + `data.records:write` on your base.
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`

## Gemini (LLM)
Free tier key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- `GEMINI_API_KEY`

## Pexels / Pixabay (stock assets)
Both free, sign up and grab an API key from their developer pages:
- `PEXELS_API_KEY` — [pexels.com/api](https://www.pexels.com/api/)
- `PIXABAY_API_KEY` — [pixabay.com/api/docs](https://pixabay.com/api/docs/)

## YouTube Data API v3
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/), enable **YouTube Data API v3**.
2. Create an OAuth 2.0 Client ID (type: Desktop app) → `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`.
3. Run the OAuth consent flow once (e.g. via [Google's OAuth Playground](https://developers.google.com/oauthplayground), scope `https://www.googleapis.com/auth/youtube.upload`, using your own client ID/secret in Playground's settings) to obtain a **refresh token** → `YOUTUBE_REFRESH_TOKEN`. The worker exchanges this for short-lived access tokens on every upload (`services/youtube/upload.ts`), so you only need to do this once per channel.

## edge-tts

No key needed — it's a free Microsoft service. `TTS_PROVIDER=edge-tts` is the default.

## ElevenLabs (optional, paid, opt-in only)

Only needed if you want higher-quality narration for a specific job. It is **never used automatically** — `TTS_PROVIDER` stays `edge-tts` as the default; ElevenLabs only runs when a Videos record's `Voice Provider` field is explicitly set to `elevenlabs`.
1. Get an API key from [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) → `ELEVENLABS_API_KEY`.
2. Set that job's `Voice` field to a real ElevenLabs **voice ID** (not a name like `en-US-AndrewNeural` — find voice IDs under Voices in your ElevenLabs dashboard).

## Higgsfield (optional, paid, opt-in only)

AI-generated images/video for scenes where real stock footage search comes up empty. **Never used automatically** — only kicks in when a Videos record's `AI Image Usage`/`AI Video Usage` checkbox is on, and only as a fallback after Pexels/Pixabay search misses.
- `HIGGSFIELD_API_KEY` from [higgsfield.ai](https://higgsfield.ai).
- The integration (`services/assets/higgsfield.ts`) was written without an account to verify the exact API against, so double-check it works (and adjust `HIGGSFIELD_API_BASE_URL`/endpoint paths if needed) before relying on it.
