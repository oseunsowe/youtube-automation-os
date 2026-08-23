# n8n Workflows (Phase 1)

All six workflows in `n8n/` call the same worker API (`services/server.ts`) over HTTP — see `docs/ARCHITECTURE.md` for why they're intentionally thin.

## Files

| File | Purpose |
|---|---|
| `00-master-orchestrator.json` | The real pipeline: polls Airtable every minute for `Status = Start`, runs every stage in order, updates `Status` after each stage, and routes failures to a Failed status + Errors record. **Import and activate this one.** |
| `06-script-writer.json` | Standalone: calls `/script/generate` alone with a sample title/category, for testing that one stage. |
| `07-scene-builder.json` | Standalone: calls `/scenes/build` then `/assets/attach` with a sample script. |
| `09-voice-generator.json` | Standalone: calls `/voice/generate` with sample scenes. |
| `10-renderer.json` | Standalone: calls `/render` with sample scenes. |
| `13-youtube-publisher.json` | Standalone: calls `/youtube/upload` with a sample file path. |

Run the standalone ones manually (the "Manual Test" trigger node) while developing/debugging a single stage, without waiting on the full orchestrator loop.

## Setup after import

1. Create one Airtable credential (Personal Access Token) named **Airtable account** — used by every Airtable node in `00-master-orchestrator.json`.
2. In every Airtable node, replace the placeholder `REPLACE_WITH_YOUR_BASE_ID` with your real base ID (`airtable/fields.md` explains where to find it).
3. The HTTP Request nodes point at `http://worker:4000/...`, the worker container's name on the Docker Compose network — this resolves automatically in Codespaces/Docker Compose and needs no change.

## Error handling

Every HTTP Request node in `00-master-orchestrator.json` has `"onError": "continueErrorOutput"`, giving it two outputs: the normal one (success) and an error one. All five error outputs converge on `Build Error Fields -> Set Status: Failed -> Log Error Record -> ` (back into the loop, so one failed job doesn't stop the batch). This is what satisfies "errors are visible and retryable" — a failed row shows `Status = Failed` plus a row in `Errors` with the message; fix the cause and set `Status` back to `Start`.

If your n8n version doesn't expose the error output for a node (older n8n releases used a plain "Continue On Fail" checkbox instead), enable that checkbox on the node instead — the downstream wiring still works the same way.

## Node schema caveat

These files were hand-authored against n8n's current (2024+) node parameter shapes (`httpRequest` typeVersion 4.2, `airtable` typeVersion 2.1) without a running n8n instance to validate against. `npm run validate:n8n` checks structure (valid JSON, no dangling connections) but can't catch a node-parameter schema mismatch against your exact n8n version. If import shows a node as unrecognized/broken, delete and rebuild just that node in the n8n UI using the method/URL/JSON body shown in the file — no pipeline logic lives in n8n itself, so this is a quick fix, not a blocker.
