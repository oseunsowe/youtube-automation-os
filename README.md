# YouTube Automation OS

An importable, configurable automation pipeline for documentary-style, faceless YouTube channels:

`Airtable (control panel) -> n8n (orchestration, 2 human approval gates) -> AI script -> scene plan -> stock assets -> TTS narration -> Remotion/FFmpeg/JSON2Video render -> YouTube upload`

Full roadmap and design rationale: [`TODO.md`](TODO.md) (see §27 for the second-pass architecture review). Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Setup: [`docs/QUICKSTART.md`](docs/QUICKSTART.md).

## Status

**Phase 1** (`TODO.md` §7) plus the architecture refinements from a second reference-automation review (`TODO.md` §27): `Airtable -> n8n (script approval -> scenes/assets/voice/render -> final approval) -> YouTube upload`, with pluggable LLM/voice/render/storage providers, a runtime-derived scene count, and a source/copyright ledger. Research/fact-checking, competitor intelligence, and analytics remain later sprints (`TODO.md` §23).

Built and unit-tested (`npm test`, offline — mock LLM provider, mocked HTTP; **37+ tests passing, verified locally**):
- `services/llm` — Gemini (retries once on malformed output) + deterministic mock provider, category-aware prompts (`prompts/`)
- `services/scenes` — script → scene-plan splitter, targeting a runtime-derived scene count and routing visual types through configurable priorities
- `services/assets` — Pexels/Pixabay search + download, full source/copyright ledger
- `services/voice` — provider abstraction (`edge-tts` implemented; piper/kokoro/elevenlabs registered), narration per scene, real-duration probing via ffprobe
- `services/render` — provider abstraction (Remotion with ffmpeg fallback, plus JSON2Video), same Scene JSON regardless of engine
- `services/storage` — provider abstraction (`local` implemented; google_drive/r2/s3 registered)
- `services/youtube` — resumable upload via OAuth refresh token
- `services/airtable` — REST client, expanded production-config field mapping, Media Assets ledger writer
- `renderer/remotion` — the actual Remotion composition/scene components
- `n8n/` — the orchestrator (three approval-gated branches) + one standalone workflow per stage
- `airtable/` — schema (Videos, Media Assets, Errors) + manual setup instructions (no API-created base on the free plan)
- `docker-compose.yml` / `Dockerfile.worker` / `.devcontainer/` — Codespaces-first deployment

**Verified locally** (no Docker needed): `npm install && npm run build && npm test` — all green — and `npm run dry-run` with `LLM_PROVIDER=mock`, which produced real edge-tts narration audio end to end.

**Not yet verified**: `docker compose up`, n8n workflow import against a live instance, real Remotion/ffmpeg/JSON2Video rendering, and the two-approval-gate flow end to end. `docs/QUICKSTART.md`'s "Known gaps to verify" section covers the couple of integration points that couldn't be checked against live services from here.

## Quickstart

```bash
cp .env.example .env   # fill in your keys, see docs/API_KEYS.md
npm install
npm run build
npm test
npm run validate:n8n
docker compose up --build
```

Then see [`docs/QUICKSTART.md`](docs/QUICKSTART.md) for importing the n8n workflows and running the acceptance test (including approving the script and the final render).

## Repository layout

- `services/` — the actual pipeline logic (TypeScript, Express API), called by n8n over HTTP
- `renderer/remotion/` — the Remotion video composition
- `n8n/` — importable workflow JSON
- `config/`, `prompts/` — provider registry, category profiles, category-specific prompt files
- `airtable/` — base schema + setup instructions
- `docs/` — architecture, quickstart, n8n, Airtable, API key setup
- `tests/`, `examples/` — unit tests and fixture data
