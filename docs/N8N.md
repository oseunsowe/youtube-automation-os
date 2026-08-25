# n8n Workflows

All seven workflows in `n8n/` call the same worker API (`services/server.ts`) over HTTP — see `docs/ARCHITECTURE.md` for why they're intentionally thin.

## Files

| File | Purpose |
|---|---|
| `00-master-orchestrator.json` | The real pipeline, as three independently-triggered branches off one schedule, plus an opt-in fourth topic-discovery pair (see below). **Import and activate this one.** |
| `06-script-writer.json` | Standalone: calls `/script/generate` alone with a sample title/category, for testing that one stage. |
| `07-scene-builder.json` | Standalone: calls `/scenes/build` then `/assets/attach` with a sample script. |
| `09-voice-generator.json` | Standalone: calls `/voice/generate` with sample scenes. |
| `10-renderer.json` | Standalone: calls `/render` with sample scenes. |
| `13-youtube-publisher.json` | Standalone: calls `/youtube/upload` with a sample file path. |
| `14-social-repurpose.json` | Standalone and **opt-in only** — calls `/repurpose/generate` (clip selection -> 9:16 crop -> optional Blotato post). Never runs automatically as part of the main pipeline; trigger it manually per `Published` video. See "Social repurposing" below. |

Run the standalone ones manually (the "Manual Test" trigger node) while developing/debugging a single stage, without waiting on the full orchestrator loop.

## The three orchestrator branches (two human-approval gates)

`00-master-orchestrator.json` doesn't run start-to-finish in one execution. It fans out from one Schedule Trigger into three independent branches, each with its own Airtable search/loop/error-handling, so a job can sit paused at an approval gate indefinitely without holding an n8n execution open:

- **B1 (`Status='Start'`, and `Retry Count < 3`)** — generates the script, writes it to the `Script`/`Script JSON` fields, sets `Status='Script Review'`. Stops. A human reads `Script` and checks `Script Approved`.
- **B2 (`Status='Script Review'` AND `Script Approved`)** — reads `Script JSON` back, builds scenes, attaches assets, generates narration, renders, sets `Status='Final Review'` with `Render URL/Path` filled in. Stops. A human watches the render and checks `Final Video Approved`.
- **B3 (`Status='Final Review'` AND `Final Video Approved`)** — uploads to YouTube, sets `Status='Published'`.

Each branch polls independently every minute, so a record just sits at `Script Review`/`Final Review` until its checkbox is checked -- nothing times out or needs to be re-triggered manually.

## Topic discovery: B0/B0b (opt-in, `TOPIC_MODE=discovery`)

A fourth pair of branches, added on top of B1/B2/B3, for the v1 opportunity engine (`services/discovery/`, see `docs/ARCHITECTURE.md`). Inert by default -- `/discovery/find` returns a 400 unless `TOPIC_MODE=discovery` is set, so leaving these branches active costs nothing while `TOPIC_MODE=manual`.

- **B0 (its own `Daily Discovery` schedule trigger, 06:00)** — calls `POST /discovery/find`. The worker itself scores candidates and writes `Status='Topic Review'` rows directly to the `Videos` table (same pattern as `/assets/attach` writing `Media Assets` rows) -- there's nothing for n8n to do on success, so the success output is left unconnected; the error output goes to `B0 Log Error`.
- **B0b (`Status='Topic Review'` AND `Topic Approved`, polls every minute alongside B1-B3)** — sets `Status='Start'` on approved rows, handing off directly into B1's own search on the next tick. No production logic is duplicated here.

## Setup after import

1. Create one Airtable credential (Personal Access Token) named **Airtable account** — used by every Airtable node in `00-master-orchestrator.json`.
2. In every Airtable node, replace the placeholder `REPLACE_WITH_YOUR_BASE_ID` with your real base ID (`airtable/fields.md` explains where to find it).
3. The HTTP Request nodes point at `http://worker:4000/...`, the worker container's name on the Docker Compose network — this resolves automatically in Codespaces/Docker Compose and needs no change.

## Error handling

Every HTTP Request node has `"onError": "continueErrorOutput"`, giving it two outputs: the normal one (success) and an error one. Within each branch, every error output converges on that branch's `Build Error Fields -> Set Status: Failed -> Log Error` (back into that branch's loop, so one failed job doesn't stop the batch). A failed row shows `Status = Failed`, `Failed Stage` (`script` / `production` / `publish`), and `Retry Count` incremented, plus a row in `Errors` with the message. Fix the cause and set `Status` back to `Start` to retry -- B1's search formula skips rows whose `Retry Count` has already reached 3, so a job doesn't retry forever unattended (Update 9's "maximum retry count").

If your n8n version doesn't expose the error output for a node (older n8n releases used a plain "Continue On Fail" checkbox instead), enable that checkbox on the node instead — the downstream wiring still works the same way.

## Social repurposing (opt-in)

`14-social-repurpose.json` is deliberately kept out of the main `Start -> Published` path (per the "keep social distribution out of Sprint 1" principle: the core documentary engine must keep working even with this disabled). To use it:

1. Open the workflow, edit the **Sample Input** node with a real `videoId`, `renderPath` (a `Published` video's `Render URL/Path`), and its `scenes` array (from that job's `scenes.json`).
2. Set `post: true` and add `BLOTATO_API_KEY` to `.env` to actually post; leave `post: false` to just render the cropped 9:16 clips locally without posting anywhere.
3. Run it manually. Clips and (if posted) their URLs land in the `Shorts` Airtable table.

## Node schema caveat

These files were hand-authored against n8n's current (2024+) node parameter shapes (`httpRequest` typeVersion 4.2, `airtable` typeVersion 2.1) without a running n8n instance to validate against. `npm run validate:n8n` checks structure (valid JSON, no dangling connections) but can't catch a node-parameter schema mismatch against your exact n8n version. If import shows a node as unrecognized/broken, delete and rebuild just that node in the n8n UI using the method/URL/JSON body shown in the file — no pipeline logic lives in n8n itself, so this is a quick fix, not a blocker.
