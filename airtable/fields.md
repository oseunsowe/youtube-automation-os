# Airtable Setup — Phase 1

Airtable's free plan doesn't support programmatic base creation, so create this manually. It takes about five minutes.

1. Go to [airtable.com](https://airtable.com) and create a new base named `YouTube Automation OS`.
2. Rename the default table to **Videos** and add the fields below (Airtable → `+` next to the field header → choose the matching field type).
3. Create a second table named **Errors** with its fields below.
4. Get your credentials for `.env`:
   - **API key**: create a personal access token at [airtable.com/create/tokens](https://airtable.com/create/tokens) with `data.records:read` and `data.records:write` scopes on this base → `AIRTABLE_API_KEY`.
   - **Base ID**: Help → API documentation (or the base URL, starts with `app...`) → `AIRTABLE_BASE_ID`.

See `schema.json` in this folder for the exact field list in machine-readable form.

## Videos table

| Field | Type | Notes |
|---|---|---|
| Title | Single line text | Primary field. This is what you type in to start a job. |
| Category | Single select | Options: `financial-crime`, `dark-business`, `mysteries`, `history`, `ai-tech` |
| Status | Single select | Options: `Start`, `Researching`, `Script Review`, `Generating Assets`, `Narrating`, `Rendering`, `QC Required`, `Ready to Publish`, `Scheduled`, `Published`, `Failed` |
| Scene Count | Number | Filled in automatically after scene building |
| Voice | Single line text | e.g. `en-US-AndrewNeural`; leave blank to use the default |
| Visual Style | Single line text | e.g. `documentary`; leave blank to use the default |
| Default Runtime | Number | Target runtime in minutes, e.g. `5` |
| Render URL/Path | Single line text | Filled in automatically after rendering |
| YouTube ID | Single line text | Filled in automatically after upload |
| Published At | Date | Filled in automatically after upload |

## Errors table

| Field | Type | Notes |
|---|---|---|
| Error ID | Autonumber | Primary field |
| Workflow | Single line text | Which n8n workflow failed |
| Stage | Single line text | Which step within the workflow |
| Video/Record | Single line text | The Videos record ID that failed |
| Message | Long text | Error message |
| Retry Count | Number | |
| Timestamp | Date (with time) | |
| Resolved | Checkbox | |

## Running a job

1. Add a row to Videos: type a `Title`, pick a `Category`, optionally set `Default Runtime`/`Voice`/`Visual Style`.
2. Set `Status` to `Start`.
3. The n8n orchestrator picks it up on its next poll and moves `Status` through each stage automatically.
4. If something fails, `Status` becomes `Failed` and a row appears in `Errors` — fix the cause and set `Status` back to `Start` to retry.
