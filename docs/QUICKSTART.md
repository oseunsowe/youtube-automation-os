# Quickstart (Phase 1)

Phase 1 goal: type a title into Airtable, set `Status = Start`, and get back a rendered, uploaded YouTube video with no manual workflow editing.

This repo is meant to run inside a **GitHub Codespace** (or any machine with Docker) — it was authored on a machine with no local Docker/ffmpeg, so the steps below are what to run once you have a real container environment.

## 1. Open in a Codespace

From the repo's GitHub page: **Code → Codespaces → Create codespace on main**. `.devcontainer/devcontainer.json` runs `docker-compose.yml` automatically, bringing up two containers (n8n and the worker API), and its `initializeCommand` auto-creates `.env` from `.env.example` if you don't already have one (Compose needs `.env` to exist just to start, even with empty values).

If you'd rather run locally with Docker Desktop instead of Codespaces, `cp .env.example .env` once yourself, then `docker compose up --build` from the repo root does the same thing.

## 2. Configure secrets

`.env` already exists (step 1 created it with empty values). Open it and fill in at minimum:
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID` (see `airtable/fields.md` for how to create the base)
- `GEMINI_API_KEY` (free tier — [aistudio.google.com](https://aistudio.google.com/apikey))
- `PEXELS_API_KEY` and/or `PIXABAY_API_KEY` (both free)
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` (see `docs/API_KEYS.md`)

Leave `LLM_PROVIDER=gemini` and `TTS_PROVIDER=edge-tts` (the Phase 1 defaults), or set `LLM_PROVIDER=mock` to test the pipeline without any LLM key.

The containers already started with the empty `.env` from step 1, and `env_file` values are only read at container start — after filling in real keys, restart the stack so they take effect: **Dev Containers: Rebuild Container** from the command palette (or `docker compose restart` in the terminal).

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

1. Open your Airtable base → Videos table → add a row: `Title`, `Category` = one of `financial-crime`/`dark-business`/`mysteries`/`history`/`ai-tech`, `Target Runtime` = `1` (for a fast first test).
2. Set `Status` = `Start`.
3. Open n8n → activate **00 - Master Orchestrator**.
4. Within a minute, `Status` becomes `Script Review` and `Script` fills in with the generated narration. Read it, then check `Script Approved`.
5. Within a minute, the pipeline runs scenes → assets → narration → render (`Status` passes through `Narrating` → `Rendering`), then becomes `Final Review` with `Render URL/Path` pointing at a playable MP4 inside the worker's `/data` volume. Watch it, then check `Final Video Approved`.
6. Within a minute, it uploads to YouTube and `Status` becomes `Published` with `YouTube ID` set.

If a step fails, `Status` becomes `Failed`, `Failed Stage` records which branch (`script`/`production`/`publish`), and a row appears in the `Errors` table with the message — fix the cause and set `Status` back to `Start` to retry. A record whose `Retry Count` has already hit 3 is skipped by B1's search formula rather than retried forever unattended.

## 7. Optional: try topic discovery instead of typing a title

By default (`TOPIC_MODE=manual`) you type the `Title` yourself, as above. To have topics suggested automatically instead:

1. Get a `YOUTUBE_API_KEY` (see `docs/API_KEYS.md`) and set `TOPIC_MODE=discovery` in `.env`, then restart the stack.
2. In n8n, the orchestrator now has a fourth branch (B0/B0b, see `docs/N8N.md`) with its own `Daily Discovery` schedule trigger (06:00). You can also right-click it → **Execute step** to run it once immediately instead of waiting.
3. Rows with `Status = Topic Review` appear in Airtable with a suggested `Title`, `Opportunity Score`, and `Opportunity Rationale` explaining the score.
4. Check `Topic Approved` on the ones you like — within a minute `Status` flips to `Start` and it flows into the normal pipeline exactly like a manually-typed title.

## Known gaps to verify in the Codespace

These were written and unit-tested for their logic, but couldn't be exercised end-to-end on the machine this was built on (no Docker/ffmpeg/Chromium/API keys there):
- `services/voice/edgeTts.ts` calls the `msedge-tts` npm package's `setMetadata`/`toFile` API — this one *has* been verified locally via `npm run dry-run` with `LLM_PROVIDER=mock` and produced real narration audio, so it should just work.
- Remotion rendering needs Chromium; `Dockerfile.worker` installs a standard dependency set, but Remotion's Docker requirements do shift between versions — see [Remotion's Docker guide](https://www.remotion.dev/docs/docker) if `/render` fails with a browser-launch error. The `ffmpeg` engine (`"engine": "ffmpeg"` in the `/render` request) is a Chromium-free fallback; `json2video` is a third option if you have a JSON2Video API key.
- The n8n workflow JSON was authored to n8n's current (2024+) node schema (`httpRequest` v4.2, `airtable` v2.1, dual main/error outputs via `onError: continueErrorOutput`). If a node shows as unrecognized after import, rebuild just that node in the n8n UI using the method/URL/body shown in the JSON — none of the actual logic lives in n8n, so this doesn't block the pipeline.
- `services/render/json2video.ts` was written from general knowledge of JSON2Video's REST API without an account to verify against -- re-check it against their docs before relying on `RENDER_PROVIDER=json2video`.
