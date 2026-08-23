# Architecture

```text
Airtable (Videos table -- control panel, statuses, approvals)
        |
        v
n8n "00 - Master Orchestrator"  (three branches, one per approval gate -- see docs/N8N.md)
        |
        |  HTTP calls, one per stage
        v
worker (Express/TypeScript API, container "worker")
  /script/generate   -> services/llm        (Gemini or mock)
  /scenes/build       -> services/scenes    (script -> Scene[] plan, runtime-derived scene count)
  /assets/attach       -> services/assets    (Pexels/Pixabay search + download + copyright ledger)
  /voice/generate      -> services/voice     (edge-tts per-scene narration + real duration)
  /render               -> services/render    (Remotion / ffmpeg / JSON2Video)
  /youtube/upload       -> services/youtube   (resumable upload via refresh token)
        |
        v
Airtable Status/fields updated after every stage; Media Assets + Errors tables
        |
        v (background only, when actually needed)
      Supabase -- competitor datasets, analytics history, cached research,
                  large scene datasets -- NOT part of the normal operator
                  workflow and not implemented yet; Airtable stays the
                  single control panel (see "DO NOT CHANGE" in TODO.md).
```

Design principle: *the system should have the simplicity of a one-click reference automation, but the production depth of a documentary studio.* The operator's experience is "choose topic, choose category, click Start, review script, review video, publish" -- everything else (research, scene direction, asset sourcing, rendering, QC) happens behind that.

## Why n8n workflows are thin

All real logic (LLM prompting, scene splitting, TTS, asset search, rendering, YouTube upload) lives in `services/` as plain TypeScript functions with unit tests (`tests/unit/`). The n8n workflows in `n8n/` are just HTTP calls in sequence plus Airtable status updates. This means:
- The logic is testable without n8n running (`npm test`).
- A broken n8n JSON import doesn't lose any logic — the worker API is the source of truth, and a node can be rebuilt in the n8n UI in a minute.
- Each pipeline stage is independently callable/testable (via the standalone `n8n/06`-`13` files or directly via `curl`), giving the same "independently testable stages, structured input/output" property a full subworkflow split would, without shipping empty subworkflow shells for stages (research, QC, repurposing, analytics) that don't have logic behind them yet.

## Two human approval gates

Per TODO.md's Update 11, the pipeline pauses twice rather than running fully unattended: after script generation (`Status='Script Review'`, gated on `Script Approved`) and after rendering (`Status='Final Review'`, gated on `Final Video Approved`). See `docs/N8N.md` for how this is implemented as three independently-polling orchestrator branches.

## Render, voice, and storage provider abstraction

- **Render** (`services/render/index.ts`, `RENDER_PROVIDER`): prefers **Remotion** (`renderer/remotion/`) for richer, componentized scenes (Ken Burns pans, quote cards, captions) and automatically falls back to a plain **ffmpeg** pipeline if Remotion/Chromium isn't available; **JSON2Video** (`services/render/json2video.ts`) is a hosted alternative using the same Scene JSON.
- **Voice** (`services/voice/provider.ts`, `TTS_PROVIDER`): `edge-tts` is implemented; `piper`/`kokoro`/`elevenlabs` are registered-but-not-implemented.
- **Storage** (`services/storage/`, `STORAGE_PROVIDER`): `local` is implemented; `google_drive`/`r2`/`s3` are registered-but-not-implemented. Every module resolves paths through this rather than joining `DATA_DIR` directly, so switching backends later doesn't mean touching call sites.
- **LLM** (`services/llm/provider.ts`, `LLM_PROVIDER`): `gemini` and `mock` are implemented; `openai`/`anthropic`/`ollama` are registered-but-not-implemented.

`config/providers.json` documents the full set (including stock asset providers `pexels`/`pixabay` implemented, `wikimedia`/`archives` planned) for humans.

## Visual router and scene density

`services/scenes/splitter.ts` targets a runtime-derived scene count (roughly one visual change every 5-12 seconds depending on `Scene Density`) instead of one scene per script paragraph, and routes each scene's visual type through a rotation built from the Videos record's priority toggles (`Stock Footage Priority`, `Document Usage`, etc.). `map`/`chart` usage currently route to the plain image renderer -- there's no dedicated map/chart Remotion component yet (that's Phase 2 in `TODO.md` §8, unchanged by the patch).

## Source/copyright ledger

Every downloaded stock asset gets a `Media Assets` Airtable row (source URL, license, attribution, download date, usage status) written by the worker right after `/assets/attach`, if Airtable credentials are configured -- see `services/assets/index.ts#scenesToMediaAssets` and `services/airtable/index.ts#recordMediaAsset`.

## Data layout

Everything a job produces lives under `DATA_DIR/<videoId>/`: `script.json`, `scenes.json`, `assets/`, `audio/`, `render-work/`, `output/final.mp4`. In Docker this is the `worker_data` volume, resolved through `services/storage`.

## What's deliberately not in Phase 1

Research/fact-checking, competitor intelligence, opportunity scoring, topic discovery mode, Shorts/Reels repurposing, dedicated map/chart/timeline visual components, and analytics are later phases in `TODO.md` -- Phase 1 proves `Airtable -> n8n -> script (approved) -> scenes -> narration -> rendered video (approved) -> YouTube upload`.
