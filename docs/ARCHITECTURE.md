# Architecture (Phase 1)

```text
Airtable (Videos table, Status=Start)
        |
        v
n8n "00 - Master Orchestrator"  (polls every minute)
        |
        |  HTTP calls, one per stage
        v
worker (Express/TypeScript API, container "worker")
  /script/generate   -> services/llm        (Gemini or mock)
  /scenes/build       -> services/scenes    (script -> Scene[] plan)
  /assets/attach       -> services/assets    (Pexels/Pixabay search + download)
  /voice/generate      -> services/voice     (edge-tts per-scene narration + real duration)
  /render               -> services/render    (Remotion, falls back to ffmpeg)
  /youtube/upload       -> services/youtube   (resumable upload via refresh token)
        |
        v
Airtable Status/fields updated after every stage; Errors table on failure
```

## Why n8n workflows are thin

All real logic (LLM prompting, scene splitting, TTS, asset search, rendering, YouTube upload) lives in `services/` as plain TypeScript functions with unit tests (`tests/unit/`). The n8n workflows in `n8n/` are just HTTP calls in sequence plus Airtable status updates. This means:
- The logic is testable without n8n running (`npm test`).
- A broken n8n JSON import doesn't lose any logic — the worker API is the source of truth, and a node can be rebuilt in the n8n UI in a minute.

## Two render paths

`services/render/index.ts` prefers **Remotion** (`renderer/remotion/`) for richer, componentized scenes (Ken Burns pans, quote cards, captions), and automatically falls back to a plain **ffmpeg** pipeline (`services/render/ffmpeg.ts`) if Remotion/Chromium isn't available. Remotion requires Docker/Codespaces; the ffmpeg path only needs the `ffmpeg` binary.

## Provider abstraction

`services/llm/provider.ts` defines the `LLMProvider` interface. `gemini` and `mock` are implemented; `openai`/`anthropic`/`ollama` are registered as named-but-not-implemented in `services/llm/index.ts` so adding them later doesn't require touching call sites. `config/providers.json` documents the same set for humans.

## Data layout

Everything a job produces lives under `DATA_DIR/<videoId>/`: `script.json`, `scenes.json`, `assets/`, `audio/`, `render-work/`, `output/final.mp4`. In Docker this is the `worker_data` volume.

## What's deliberately not in Phase 1

Research/fact-checking, competitor intelligence, opportunity scoring, Shorts/Reels repurposing, and analytics are later phases in `youtube-automation-os-TODO.md` (§9, §10, §18, §19) — Phase 1 only proves `Airtable -> n8n -> script -> scenes -> narration -> rendered video -> YouTube upload`.
