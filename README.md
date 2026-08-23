# YouTube Automation OS

An importable, configurable automation pipeline for documentary-style, faceless YouTube channels:

`Airtable (control panel) -> n8n (orchestration) -> AI script -> scene plan -> stock assets -> TTS narration -> Remotion/FFmpeg render -> YouTube upload`

Full roadmap and design rationale: [`TODO.md`](TODO.md). Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Setup: [`docs/QUICKSTART.md`](docs/QUICKSTART.md).

## Phase 1 status

This is the **Phase 1** minimum working clone (`TODO.md` §7): prove `Airtable -> n8n -> script -> scenes -> narration -> rendered video -> YouTube upload` end to end, before adding research/fact-checking, competitor intelligence, or analytics.

Built and unit-tested (`npm test`, offline — mock LLM provider, mocked HTTP):
- `services/llm` — Gemini + deterministic mock provider, category-aware prompts (`prompts/`)
- `services/scenes` — script → scene-plan splitter
- `services/assets` — Pexels/Pixabay search + download
- `services/voice` — edge-tts narration per scene, real-duration probing via ffprobe
- `services/render` — Remotion renderer with an ffmpeg-only fallback
- `services/youtube` — resumable upload via OAuth refresh token
- `services/airtable` — REST client + status/job mapping
- `renderer/remotion` — the actual Remotion composition/scene components
- `n8n/` — the orchestrator workflow + one standalone workflow per stage
- `airtable/` — schema + manual setup instructions (no API-created base on the free plan)
- `docker-compose.yml` / `Dockerfile.worker` / `.devcontainer/` — Codespaces-first deployment

**Not yet verified end to end** — this repo was built on a machine with no Docker, ffmpeg, or Python available, so `docker compose up`, n8n workflow import, real Remotion/ffmpeg rendering, and a real Airtable-triggered run all still need to happen once, in a Codespace or any Docker host. `docs/QUICKSTART.md` walks through exactly that, including a "Known gaps to verify" section for the couple of integration points (the `msedge-tts` call shape, Remotion's Chromium deps in Docker, exact n8n node schema) that couldn't be checked against a live instance from here.

## Quickstart

```bash
cp .env.example .env   # fill in your keys, see docs/API_KEYS.md
npm install
npm run build
npm test
npm run validate:n8n
docker compose up --build
```

Then see [`docs/QUICKSTART.md`](docs/QUICKSTART.md) for importing the n8n workflows and running the acceptance test.

## Repository layout

- `services/` — the actual pipeline logic (TypeScript, Express API), called by n8n over HTTP
- `renderer/remotion/` — the Remotion video composition
- `n8n/` — importable workflow JSON
- `config/`, `prompts/` — provider registry, category profiles, category-specific prompt files
- `airtable/` — base schema + setup instructions
- `docs/` — architecture, quickstart, n8n, Airtable, API key setup
- `tests/`, `examples/` — unit tests and fixture data
