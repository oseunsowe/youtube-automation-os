# n8n Workflows

All six workflows in `n8n/` call the same worker API (`services/server.ts`) over HTTP — see `docs/ARCHITECTURE.md` for why they're intentionally thin.

## Files

| File | Purpose |
|---|---|
| `00-master-orchestrator.json` | The real pipeline, as three independently-triggered branches off one schedule (see below). **Import and activate this one.** |
| `06-script-writer.json` | Standalone: calls `/script/generate` alone with a sample title/category, for testing that one stage. |
| `07-scene-builder.json` | Standalone: calls `/scenes/build` then `/assets/attach` with a sample script. |
| `09-voice-generator.json` | Standalone: calls `/voice/generate` with sample scenes. |
| `10-renderer.json` | Standalone: calls `/render` with sample scenes. |
| `13-youtube-publisher.json` | Standalone: calls `/youtube/upload` with a sample file path. |

Run the standalone ones manually (the "Manual Test" trigger node) while developing/debugging a single stage, without waiting on the full orchestrator loop.

## The three orchestrator branches (two human-approval gates)

`00-master-orchestrator.json` doesn't run start-to-finish in one execution. It fans out from one Schedule Trigger into three independent branches, each with its own Airtable search/loop/error-handling, so a job can sit paused at an approval gate indefinitely without holding an n8n execution open:

- **B1 (`Status='Start'`, and `Retry Count < 3`)** — generates the script, writes it to the `Script`/`Script JSON` fields, sets `Status='Script Review'`. Stops. A human reads `Script` and checks `Script Approved`.
- **B2 (`Status='Script Review'` AND `Script Approved`)** — reads `Script JSON` back, builds scenes, attaches assets, generates narration, renders, sets `Status='Final Review'` with `Render URL/Path` filled in. Stops. A human watches the render and checks `Final Video Approved`.
- **B3 (`Status='Final Review'` AND `Final Video Approved`)** — uploads to YouTube, sets `Status='Published'`.

Each branch polls independently every minute, so a record just sits at `Script Review`/`Final Review` until its checkbox is checked -- nothing times out or needs to be re-triggered manually.

## Setup after import

1. Create one Airtable credential (Personal Access Token) named **Airtable account** — used by every Airtable node in `00-master-orchestrator.json`.
2. In every Airtable node, replace the placeholder `REPLACE_WITH_YOUR_BASE_ID` with your real base ID (`airtable/fields.md` explains where to find it).
3. The HTTP Request nodes point at `http://worker:4000/...`, the worker container's name on the Docker Compose network — this resolves automatically in Codespaces/Docker Compose and needs no change.

## Error handling

Every HTTP Request node has `"onError": "continueErrorOutput"`, giving it two outputs: the normal one (success) and an error one. Within each branch, every error output converges on that branch's `Build Error Fields -> Set Status: Failed -> Log Error` (back into that branch's loop, so one failed job doesn't stop the batch). A failed row shows `Status = Failed`, `Failed Stage` (`script` / `production` / `publish`), and `Retry Count` incremented, plus a row in `Errors` with the message. Fix the cause and set `Status` back to `Start` to retry -- B1's search formula skips rows whose `Retry Count` has already reached 3, so a job doesn't retry forever unattended (Update 9's "maximum retry count").

If your n8n version doesn't expose the error output for a node (older n8n releases used a plain "Continue On Fail" checkbox instead), enable that checkbox on the node instead — the downstream wiring still works the same way.

## Node schema caveat

These files were hand-authored against n8n's current (2024+) node parameter shapes (`httpRequest` typeVersion 4.2, `airtable` typeVersion 2.1) without a running n8n instance to validate against. `npm run validate:n8n` checks structure (valid JSON, no dangling connections) but can't catch a node-parameter schema mismatch against your exact n8n version. If import shows a node as unrecognized/broken, delete and rebuild just that node in the n8n UI using the method/URL/JSON body shown in the file — no pipeline logic lives in n8n itself, so this is a quick fix, not a blocker.
