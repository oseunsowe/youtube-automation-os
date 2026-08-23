# TODO.md PATCH — Updates After Reviewing Reference Automation

Apply the following changes to the existing TODO.md. Do not rebuild completed work unless the existing implementation conflicts with these requirements.

---

## UPDATE 1 — Airtable Is the Primary Operator Interface

### Replace any architecture that presents Supabase as part of the normal user workflow.

The operator should normally interact with:

```text
Airtable
   ↓
n8n
   ↓
Production System
```

Supabase should operate in the background only when needed:

```text
                 ┌──── Supabase
                 │
Airtable → n8n ──┼──── Agents
                 │
                 └──── Storage / Analytics
```

### Add

- [ ] Keep Airtable as the main production dashboard.
- [ ] Do not require the operator to open Supabase to create videos.
- [ ] Use Supabase for structured backend data, large datasets, analytics, caching, or scaling.
- [ ] Airtable remains the source of human-facing status and approvals.
- [ ] n8n synchronizes Airtable and Supabase where required.

---

# UPDATE 2 — Expand Airtable Production Configuration

The reference system allows the operator to control scene count, voice, style, image model, and scene duration directly from Airtable.

Our system should keep this simplicity but expose more documentary-specific controls.

## Add these fields to the Videos / Production table:

### Basic

- [ ] Video Title / Idea
- [ ] Channel
- [ ] Category
- [ ] Status
- [ ] Target Runtime
- [ ] Target Word Count

### Narration

- [ ] Voice Provider
- [ ] Voice
- [ ] Narration Style
- [ ] Narration Speed

### Visual Production

- [ ] Visual Style
- [ ] Scene Density
- [ ] Average Scene Duration
- [ ] Stock Footage Priority
- [ ] Archive Priority
- [ ] Map Usage
- [ ] Document Usage
- [ ] Chart Usage
- [ ] Screenshot Usage
- [ ] AI Image Usage
- [ ] AI Video Usage

### Rendering

- [ ] Render Provider
- [ ] Resolution
- [ ] Aspect Ratio
- [ ] Background Music
- [ ] Caption Style

### Automation

- [ ] Research Depth
- [ ] Require Script Approval
- [ ] Require Final Approval
- [ ] Auto Publish
- [ ] Auto Repurpose
- [ ] Publish Date
- [ ] Priority

---

# UPDATE 3 — Add Render Provider Abstraction

Do not hard-code the workflow to JSON2Video, Remotion, or any single rendering provider.

Create a renderer abstraction.

```text
Scene JSON
    ↓
Render Router
    ├── Remotion + FFmpeg
    └── JSON2Video
```

### Add

- [ ] Create `RENDER_PROVIDER`.
- [ ] Support `remotion`.
- [ ] Support `json2video` as optional provider.
- [ ] Keep Remotion + FFmpeg as preferred free/self-hosted renderer.
- [ ] Keep JSON2Video compatibility for faster deployment/testing.
- [ ] Use the same Scene JSON schema regardless of renderer.
- [ ] Renderer selection must be configurable without rebuilding workflows.

Example:

```env
RENDER_PROVIDER=remotion
```

or:

```env
RENDER_PROVIDER=json2video
```

---

# UPDATE 4 — Formalize Structured JSON Between Every AI Agent

The reference automation makes good use of structured outputs.

Our workflows must never depend on loosely formatted AI responses.

Each major agent must return validated JSON.

## Research Agent

```json
{
  "topic": "",
  "thesis": "",
  "timeline": [],
  "people": [],
  "organizations": [],
  "claims": [],
  "financial_figures": [],
  "sources": [],
  "visual_opportunities": []
}
```

## Story Architect

```json
{
  "central_question": "",
  "hook": "",
  "acts": [],
  "open_loops": [],
  "reveal": "",
  "ending": ""
}
```

## Script Writer

```json
{
  "title": "",
  "hook": "",
  "chapters": [],
  "script": "",
  "word_count": 0,
  "estimated_runtime": 0
}
```

## Scene Director

```json
{
  "scenes": [
    {
      "scene_number": 1,
      "narration": "",
      "duration": 0,
      "visual_type": "",
      "search_query": "",
      "asset_source": "",
      "motion": "",
      "overlay": "",
      "transition": "",
      "citation": ""
    }
  ]
}
```

### Add

- [ ] Add JSON schema validation.
- [ ] Retry malformed outputs.
- [ ] Reject missing required fields.
- [ ] Log invalid AI responses.
- [ ] Do not allow one agent to pass raw prose directly into another agent.

---

# UPDATE 5 — Replace Fixed Scene Counts With Documentary Scene Density

The reference system commonly uses a small fixed number of AI-generated scenes.

Do not use that model for long-form documentaries.

### Add

- [ ] Scene count should be calculated dynamically from runtime.
- [ ] Allow different scene densities by category.
- [ ] Do not assume every scene is one generated video.
- [ ] A narrative section can contain multiple visual events.
- [ ] Prefer visual changes every few seconds where appropriate.

Example starting targets:

```text
5-minute video:
25–50 visual changes

10-minute video:
45–90 visual changes

15-minute video:
70–130 visual changes

20-minute video:
90–170 visual changes
```

These are production targets, not hard limits.

The Scene Director should decide based on pacing and narration.

---

# UPDATE 6 — Add a Documentary Visual Router

Replace:

```text
Script
↓
Generate AI images
↓
Video
```

with:

```text
Scene Director
      ↓
Visual Router
      │
      ├── Stock Video
      ├── Archive Video
      ├── Historical Photo
      ├── Company Photo
      ├── Screenshot
      ├── Document
      ├── Court Filing
      ├── Map
      ├── Chart
      ├── Timeline
      ├── Headline
      ├── Motion Graphic
      ├── AI Image
      └── AI Video
```

### Add

- [ ] Build visual-type routing.
- [ ] Search real footage before generating synthetic media where appropriate.
- [ ] Use AI-generated media as supporting material rather than the default.
- [ ] Add fallback rules when the preferred asset type is unavailable.
- [ ] Prevent excessive reuse of identical assets.
- [ ] Match visuals directly to narration.

---

# UPDATE 7 — Add Source and Copyright Ledger

The reference workflow is focused on generation. Our documentary system needs explicit source provenance.

## Every media asset should store:

```text
asset_id
scene_id
source_provider
source_url
creator
license
attribution
download_date
local_path
usage_status
```

### Add

- [ ] Create Media Assets table.
- [ ] Record the original source URL.
- [ ] Record license information.
- [ ] Record required attribution.
- [ ] Track which scene used each asset.
- [ ] Flag assets that require human license review.
- [ ] Prevent unknown-license assets from automatic publishing.

---

# UPDATE 8 — Split Large n8n Workflow Into Subworkflows

Do not build one massive linear workflow.

The architecture should become:

```text
00 Master Orchestrator
│
├── 01 Topic Intelligence
├── 02 Research
├── 03 Fact Check
├── 04 Story Architect
├── 05 Script Writer
├── 06 Scene Director
├── 07 Asset Manager
├── 08 Voice
├── 09 Renderer
├── 10 QC
├── 11 Publisher
├── 12 Repurposer
└── 13 Analytics
```

### Add

- [ ] Each major stage becomes independently testable.
- [ ] Each subworkflow accepts structured input.
- [ ] Each subworkflow returns structured output.
- [ ] Failed stages can be rerun independently.
- [ ] Do not restart an entire documentary because one stage failed.

---

# UPDATE 9 — Add Resume / Retry Logic

The reference system demonstrates automation, but ours needs production reliability.

### Add

- [ ] Store current production stage.
- [ ] Store last successful stage.
- [ ] Retry recoverable API failures.
- [ ] Set maximum retry count.
- [ ] Retry individual scenes rather than full videos.
- [ ] Retry individual voice sections.
- [ ] Retry failed asset searches.
- [ ] Resume rendering from failed stage where technically possible.
- [ ] Send failed jobs to an Airtable `Failed Jobs` view.
- [ ] Add manual `Retry` action.

Example:

```text
FAILED:
Scene 47 — archive asset download

Retry:
Scene 47 only
```

---

# UPDATE 10 — Add Provider Abstraction Beyond Rendering

Do not lock the project to specific vendors.

## LLM

```text
LLM_PROVIDER=
gemini
openai
anthropic
ollama
```

## Voice

```text
VOICE_PROVIDER=
edge
kokoro
piper
elevenlabs
```

## Storage

```text
STORAGE_PROVIDER=
local
google_drive
r2
s3
```

## Rendering

```text
RENDER_PROVIDER=
remotion
json2video
```

## Stock

```text
STOCK_PROVIDERS=
pexels
pixabay
wikimedia
archives
```

### Add

- [ ] Provider interfaces.
- [ ] Free-first defaults.
- [ ] Premium providers optional.
- [ ] Provider switching must not require workflow redesign.

---

# UPDATE 11 — Add Two Human Approval Gates

The current system should not publish sensitive documentary material completely unattended.

Required flow:

```text
Research
↓
Story
↓
Script
↓
HUMAN SCRIPT APPROVAL
↓
Production
↓
Render
↓
Automated QC
↓
HUMAN FINAL APPROVAL
↓
Publish
```

### Add

- [ ] `Script Approved` checkbox/status.
- [ ] n8n pauses until approval.
- [ ] `Final Video Approved` checkbox/status.
- [ ] publishing cannot run without approval during MVP.
- [ ] allow optional automatic approval later for low-risk channels.

---

# UPDATE 12 — Keep Social Distribution Out of Sprint 1

The reference workflow has a large social-promotion section.

We will support it, but not before the core documentary engine works.

### Build order:

```text
FIRST
Airtable
→ Research
→ Script
→ Scenes
→ Assets
→ Voice
→ Render

SECOND
QC
→ YouTube

THIRD
Shorts
→ Reels
→ TikTok
→ Facebook

FOURTH
Analytics
→ Learning Loop
```

### Add

- [ ] Do not block MVP on social APIs.
- [ ] Build social publishing as independent subworkflow.
- [ ] Main documentary production must work even when social integrations are disabled.

---

# UPDATE 13 — Add Storage Abstraction

The reference workflow visibly uses cloud storage during production.

Our system should support storage without forcing Google Drive.

### Initial default

```text
STORAGE_PROVIDER=local
```

### Later

```text
google_drive
r2
s3
```

### Add

- [ ] Local storage support first.
- [ ] Google Drive adapter.
- [ ] R2/S3-compatible adapter later.
- [ ] Store asset locations in the project record.
- [ ] Do not embed fixed Google Drive paths in workflows.

---

# UPDATE 14 — Improve Status State Machine

Use Airtable statuses consistently.

```text
IDEA
↓
SCORING
↓
AWAITING TOPIC APPROVAL
↓
RESEARCHING
↓
FACT CHECKING
↓
STORY BUILDING
↓
SCRIPTING
↓
SCRIPT REVIEW
↓
SCENE PLANNING
↓
ASSET COLLECTION
↓
NARRATION
↓
RENDERING
↓
AUTOMATED QC
↓
FINAL REVIEW
↓
READY TO PUBLISH
↓
SCHEDULED
↓
PUBLISHED
↓
REPURPOSING
↓
COMPLETE
```

Failure state:

```text
FAILED
```

with:

```text
failed_stage
error_message
retry_count
```

---

# UPDATE 15 — Separate Topic Modes

The reference workflow begins with a manually entered title.

Our system must support both modes.

## Manual Mode

```text
User enters title/topic
↓
Start
```

## Intelligence Mode

```text
YouTube
+ Google Trends
+ Reddit
+ Competitors
↓
Opportunity Engine
↓
Suggested Topics
↓
Human Approval
↓
Production
```

### Add

```text
TOPIC_MODE=manual
```

or:

```text
TOPIC_MODE=discovery
```

This allows us to reproduce the simplicity of the reference workflow while retaining our advanced research engine.

---

# UPDATE 16 — Clarify Supabase's Role

Supabase is no longer part of the visible workflow.

Use it for:

- competitor datasets
- analytics history
- cached research
- source records
- large scene datasets
- asset metadata
- embeddings/vector search if introduced
- learning-loop data

Airtable remains responsible for:

- operator controls
- status
- approvals
- content queue
- basic production information

---

# UPDATE 17 — Revised MVP Acceptance Criteria

Replace the previous MVP test with:

The MVP is successful when:

- [ ] Operator opens Airtable.
- [ ] Operator enters a title.
- [ ] Operator selects a category.
- [ ] Operator selects voice/style or accepts defaults.
- [ ] Operator sets Status = `Start`.
- [ ] n8n receives the job.
- [ ] Research packet is generated.
- [ ] Script is generated.
- [ ] Script waits for approval.
- [ ] Scene JSON is generated.
- [ ] Assets are retrieved.
- [ ] Voiceover is created.
- [ ] Remotion/FFmpeg renders the video.
- [ ] Airtable shows render progress.
- [ ] Automated QC runs.
- [ ] Final video waits for approval.
- [ ] Approved video is ready for YouTube upload.
- [ ] Failed stages can be retried without restarting the entire project.

The MVP does NOT require:

- automatic trend discovery
- TikTok publishing
- Instagram publishing
- Facebook publishing
- full analytics learning
- multiple channels

Those are Phase 2+.

---

# UPDATE 18 — New Core Design Principle

Add this near the beginning of TODO.md:

> The system should have the simplicity of the reference automation but the production depth of a documentary studio.

Operator experience:

```text
Choose topic
Choose category
Click Start
Review script
Review video
Publish
```

Backend complexity:

```text
Research
Fact checking
Story architecture
Scene direction
Asset sourcing
Narration
Rendering
QC
Publishing
Analytics
```

The operator should never need to understand all backend nodes just to produce a video.

---

# DO NOT CHANGE THESE EXISTING DECISIONS

Keep:

- n8n as orchestration engine
- Airtable
- Supabase availability
- FFmpeg
- Remotion
- local/free TTS first
- free stock/archive sources
- five category profiles
- competitor intelligence
- topic opportunity scoring
- research agent
- fact checker
- analytics learning loop
- human QC
- free-first cost strategy

The changes above refine the implementation rather than replacing the current architecture.