# Airtable Setup

Airtable's free plan doesn't support programmatic base creation, so create this manually. It takes about ten minutes -- most of the Videos fields below are optional production-config toggles you can add later; only the required ones (marked below) block getting a job running.

1. Go to [airtable.com](https://airtable.com) and create a new base named `YouTube Automation OS`.
2. Rename the default table to **Videos** and add the fields below (Airtable → `+` next to the field header → choose the matching field type).
3. Create a **Media Assets** table and a **Errors** table with their fields below. For Media Assets' `Video` field, link it to the Videos table (Airtable's "Link to another record" field type).
4. Get your credentials for `.env`:
   - **API key**: create a personal access token at [airtable.com/create/tokens](https://airtable.com/create/tokens) with `data.records:read` and `data.records:write` scopes on this base → `AIRTABLE_API_KEY`.
   - **Base ID**: Help → API documentation (or the base URL, starts with `app...`) → `AIRTABLE_BASE_ID`.

See `schema.json` in this folder for the exact field list in machine-readable form, including which fields are stored-but-not-yet-used (marked "Phase 2+" or "Phase 3").

## Videos table

**Required to run a job:**

| Field | Type | Notes |
|---|---|---|
| Title | Single line text | Primary field. This is what you type in to start a job. |
| Category | Single select | Options: `financial-crime`, `dark-business`, `mysteries`, `history`, `ai-tech` |
| Status | Single select | Options: `Start`, `Script Review`, `Generating Assets`, `Narrating`, `Rendering`, `Final Review`, `Published`, `Failed`. Default `Start`. |
| Target Runtime | Number | Target runtime in minutes, e.g. `5` |
| Script | Long text | Human-readable narration, filled in automatically when `Status` becomes `Script Review` -- read this before approving |
| Script JSON | Long text | Machine-readable script object; filled in automatically, read back by the orchestrator once approved. Don't edit. |
| Script Approved | Checkbox | The orchestrator pauses at `Script Review` until this is checked |
| Final Video Approved | Checkbox | The orchestrator pauses at `Final Review` (post-render) until this is checked, then uploads to YouTube |

**Optional production config** (sensible defaults apply if left blank -- see `config/defaults.json`):

| Field | Type | Notes |
|---|---|---|
| Channel | Single line text | Phase 2+ |
| Target Word Count | Number | Derived from Target Runtime if blank |
| Voice Provider | Single select | `edge-tts` / `piper` / `kokoro` / `elevenlabs`. `edge-tts` (free) is the default; `elevenlabs` (paid) is implemented but only used for a job that explicitly sets this field to it -- requires `ELEVENLABS_API_KEY` in `.env`. |
| Voice | Single line text | e.g. `en-US-AndrewNeural` |
| Narration Style | Single line text | Phase 2+ |
| Narration Speed | Number | Phase 2+ |
| Visual Style | Single line text | e.g. `documentary` |
| Scene Density | Single select | `low` / `medium` / `high` -- controls how many visual changes per minute |
| Average Scene Duration | Number | Seconds; overrides Scene Density's default if set |
| Stock Footage Priority | Checkbox | Default on |
| Archive Priority | Checkbox | Default on |
| Map Usage | Checkbox | Routes to the image fallback -- no dedicated map component yet |
| Document Usage | Checkbox | |
| Chart Usage | Checkbox | Routes to the image fallback -- no dedicated chart component yet |
| Screenshot Usage | Checkbox | |
| AI Image Usage | Checkbox | Off by default. When on, an AI-generated image (via Higgsfield, paid, requires `HIGGSFIELD_API_KEY`) is used **only** as a fallback for a scene where Pexels/Pixabay search comes up empty -- never the default source. |
| AI Video Usage | Checkbox | Same as above, for video scenes. |
| Render Provider | Single select | `remotion` / `json2video` |
| Resolution | Single line text | Default `1920x1080` |
| Aspect Ratio | Single line text | Default `16:9` |
| Background Music | Checkbox | Phase 2+ |
| Caption Style | Single line text | Phase 2+ (captions not rendered yet) |
| Research Depth | Single select | `none` / `basic` / `deep` -- Phase 3, research agent not built yet |
| Require Script Approval | Checkbox | Default on |
| Require Final Approval | Checkbox | Default on |
| Auto Publish | Checkbox | Phase 2+ |
| Auto Repurpose | Checkbox | Phase 2+ |
| Publish Date | Date (with time) | Phase 2+ (upload happens immediately today) |
| Priority | Number | Phase 2+ |

**Filled in automatically by the pipeline:**

| Field | Type | Notes |
|---|---|---|
| Scene Count | Number | |
| Render URL/Path | Single line text | |
| YouTube ID | Single line text | |
| Published At | Date (with time) | |
| Retry Count | Number | |
| Failed Stage | Single line text | |

## Media Assets table

Source/copyright ledger -- one row per downloaded stock/archival asset.

| Field | Type | Notes |
|---|---|---|
| Asset ID | Autonumber | Primary field |
| Video | Link to another record (Videos) | |
| Scene ID | Single line text | |
| Source Provider | Single line text | e.g. `pexels`, `pixabay` |
| Source URL | URL | |
| Creator | Single line text | |
| License | Single line text | |
| Attribution | Single line text | |
| Download Date | Date (with time) | |
| Local Path | Single line text | |
| Usage Status | Single select | `approved` / `review_required` |

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

1. Add a row to Videos: type a `Title`, pick a `Category`, set `Target Runtime`. Leave everything else blank to use defaults.
2. Set `Status` to `Start`.
3. The orchestrator generates a script and sets `Status` to `Script Review` -- open the record, read the script (once it's exposed for review -- see `docs/N8N.md`), and check `Script Approved`.
4. It then builds scenes/assets/narration/render and sets `Status` to `Final Review` -- check `Final Video Approved` once you've reviewed the rendered video at `Render URL/Path`.
5. It uploads to YouTube and sets `Status` to `Published`.
6. If something fails at any stage, `Status` becomes `Failed`, `Failed Stage` records where, and a row appears in `Errors` -- fix the cause and set `Status` back to `Start` to retry.
