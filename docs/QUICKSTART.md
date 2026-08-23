# Quickstart (Phase 1)

Phase 1 goal: type a title into Airtable, set `Status = Start`, and get back a rendered, uploaded YouTube video with no manual workflow editing.

This repo is meant to run inside a **GitHub Codespace** (or any machine with Docker) — it was authored on a machine with no local Docker/ffmpeg, so the steps below are what to run once you have a real container environment.

## 1. Open in a Codespace

From the repo's GitHub page: **Code → Codespaces → Create codespace on main**. The `.devcontainer/devcontainer.json` brings up two containers automatically (n8n and the worker API) via `docker-compose.yml`.

If you'd rather run locally with Docker Desktop instead of Codespaces, `docker compose up --build` from the repo root does the same thing.

## 2. Configure secrets

```bash
cp .env.example .env
```

Fill in at minimum:
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID` (see `airtable/fields.md` for how to create the base)
- `GEMINI_API_KEY` (free tier — [aistudio.google.com](https://aistudio.google.com/apikey))
- `PEXELS_API_KEY` and/or `PIXABAY_API_KEY` (both free)
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` (see `docs/API_KEYS.md`)

Leave `LLM_PROVIDER=gemini` and `TTS_PROVIDER=edge-tts` (the Phase 1 defaults), or set `LLM_PROVIDER=mock` to test the pipeline without any LLM key.

## 3. Install and test the worker logic

```bash
npm install
npm run build
npm test              # unit tests, offline (mock LLM, mocked HTTP)
npm run validate:n8n  # structural check of every n8n/*.json workflow
npm run dry-run        # exercises script -> scenes locally; add API keys to exercise more stages
```

## 4. Bring up n8n + the worker

```bash
docker compose up --build
```
n8n: http://localhost:5678 · worker API: http://localhost:4000/health

## 5. Import the workflows

In n8n: **Workflows → Import from File**, import all six files in `n8n/`. For each:
- Create an **Airtable Personal Access Token credential** named `Airtable account` (used by every Airtable node) and select it on each Airtable node.
- Open every Airtable node and replace `REPLACE_WITH_YOUR_BASE_ID` with your real base ID.
- The HTTP Request nodes already point at `http://worker:4000/...` — that's the worker container's name on the Docker network, so it resolves automatically inside Codespaces/Docker Compose. No change needed there.

See `docs/N8N.md` for what each workflow does and how the error-handling branches work.

## 6. Run the Phase 1 acceptance test

1. Open your Airtable base → Videos table → add a row: `Title`, `Category` = one of `financial-crime`/`dark-business`/`mysteries`/`history`/`ai-tech`, `Default Runtime` = `1` (for a fast first test).
2. Set `Status` = `Start`.
3. Open n8n → activate **00 - Master Orchestrator** (or run it manually once to test without waiting for the schedule).
4. Watch the Videos row's `Status` progress: `Narrating` → `Rendering` → `Ready to Publish` → `Published`.
5. Confirm `Render URL/Path` points at a playable MP4 inside the worker's `/data` volume, and `YouTube ID` is set.

If a step fails, `Status` becomes `Failed` and a row appears in the `Errors` table with the message — fix the cause and set `Status` back to `Start` to retry.

## Known gaps to verify in the Codespace

These were written and unit-tested for their logic, but couldn't be exercised end-to-end on the machine this was built on (no Docker/ffmpeg/Chromium/API keys there):
- `services/voice/edgeTts.ts` calls the `msedge-tts` npm package's `setMetadata`/`toFile` API from memory — re-check its signature against the installed package if voice generation errors.
- Remotion rendering needs Chromium; `Dockerfile.worker` installs a standard dependency set, but Remotion's Docker requirements do shift between versions — see [Remotion's Docker guide](https://www.remotion.dev/docs/docker) if `/render` fails with a browser-launch error. The `ffmpeg` engine (`"engine": "ffmpeg"` in the `/render` request) is a Chromium-free fallback.
- The n8n workflow JSON was authored to n8n's current (2024+) node schema (`httpRequest` v4.2, `airtable` v2.1, dual main/error outputs via `onError: continueErrorOutput`). If a node shows as unrecognized after import, rebuild just that node in the n8n UI using the method/URL/body shown in the JSON — none of the actual logic lives in n8n, so this doesn't block the pipeline.
