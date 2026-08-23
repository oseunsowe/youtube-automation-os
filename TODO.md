# YouTube Automation OS — Build & Improvement Plan

## Reference System Reviewed

Reference video: **How I Built a YouTube Automation That Creates Viral Long-Form Videos with AI**

The demonstrated system uses the following core architecture:

- **Airtable** as the control panel / job queue
- **n8n** as the automation orchestrator
- **OpenAI** for script and content generation
- **JSON2Video** for video creation/rendering
- **YouTube** for publishing
- **Blotato** for cross-platform social promotion

The reference workflow is useful as a starting pattern, but this project will improve it substantially for documentary-style, faceless YouTube channels.

---

# 1. Project Objective

Build an importable, configurable, production-ready automation package that can:

1. Discover or accept a topic.
2. Research demand and competitors.
3. Score whether the topic is worth producing.
4. Build a source-backed research dossier.
5. Fact-check important claims.
6. Create a retention-focused long-form script.
7. Convert the script into a structured scene plan.
8. Find legal/usable visuals.
9. Generate narration.
10. Render a long-form documentary.
11. Generate title and thumbnail candidates.
12. Run automated QC.
13. Pause for human approval.
14. Upload/schedule on YouTube.
15. Repurpose into Shorts/Reels/TikToks.
16. Collect analytics.
17. Feed performance data back into future topic selection.

The system must support these presets:

- Financial Crime & Scams
- Dark Business Documentaries
- Unsolved Mysteries / Strange Events
- History Documentaries
- AI / Technology Documentaries

Architecture principle:

> One production engine, five category profiles.

Core design principle (added after reviewing a second reference automation, see §27):

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

# 2. What We Will Keep From the Reference System

## Keep

- Airtable-style visual control center
- n8n orchestration
- one-click / status-triggered production
- configurable visual styles
- configurable voices
- automatic video rendering
- YouTube upload workflow
- cross-platform repurposing
- modular workflow layout

## Improve

The reference system appears optimized mainly around:
`title → AI script → generated scenes → video → upload`

Our improved system will instead use:

`topic intelligence → research → fact check → story architecture → script → scene director → asset sourcing → voice → rendering → QC → publishing → analytics`

This matters because documentary content needs stronger factual reliability, better visual variety, better retention structure, and more original production.

---

# 3. High-Level Architecture

```text
                       ┌──────────────────────┐
                       │      AIRTABLE        │
                       │   Control Center     │
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │        n8n           │
                       │ Master Orchestrator  │
                       └──────────┬───────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          ▼                       ▼                        ▼
  Topic Intelligence        Research Engine          Config Engine
          │                       │                        │
          ▼                       ▼                        ▼
 Opportunity Score         Fact Verification       Category Profile
          └───────────────────────┼────────────────────────┘
                                  ▼
                           Story Architect
                                  │
                                  ▼
                            Script Writer
                                  │
                         HUMAN APPROVAL #1
                                  │
                                  ▼
                           Scene Director
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
              Assets          Voiceover       Graphics
                  │               │               │
                  └───────────────┼───────────────┘
                                  ▼
                             Renderer
                                  │
                                  ▼
                               QC
                                  │
                         HUMAN APPROVAL #2
                                  │
                                  ▼
                              YouTube
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                  ▼
             Shorts             Reels              TikTok
                                  │
                                  ▼
                              Analytics
                                  │
                                  ▼
                            Learning Loop
```

## Airtable is the primary operator interface

The operator normally interacts with only this:

```text
Airtable
   ↓
n8n
   ↓
Production System
```

Supabase (once introduced) operates in the background only, when actually needed:

```text
                 ┌──── Supabase
                 │
Airtable → n8n ──┼──── Agents
                 │
                 └──── Storage / Analytics
```

- Airtable stays the main production dashboard, source of human-facing status/approvals, and the content queue.
- The operator is never required to open Supabase to create or approve a video.
- Supabase, when it's added (not implemented yet), is for structured backend data: competitor datasets, analytics history, cached research, source records, large scene datasets, asset metadata, embeddings/vector search if introduced, learning-loop data.
- n8n synchronizes Airtable and Supabase where required, rather than the operator doing so manually.

---

# 4. Recommended Free-First Stack

## Orchestration

- n8n Community Edition
- Docker

## Control Panel

Primary:
- Airtable Free

Possible future replacement:
- NocoDB
- Baserow
- Supabase custom dashboard

## Database

Initial:
- Airtable

Backend / scaling:
- Supabase PostgreSQL

## AI / LLM

Provider interface must be modular.

Initial options:
- Gemini API free/low-cost allowance
- Ollama/local models
- OpenAI as optional paid provider
- Anthropic as optional provider

Do not hard-code the system to one LLM.

## Voice

Free-first:
- edge-tts
- Kokoro
- Piper

Premium optional:
- ElevenLabs

## Assets

Free:
- Pexels
- Pixabay
- Wikimedia Commons
- Library of Congress
- U.S. National Archives
- NASA
- other verified public-domain archives

Premium optional:
- Storyblocks
- Envato
- Artgrid

## Rendering

Preferred:
- Remotion
- FFmpeg

Optional fallback:
- JSON2Video

Reason:
Local rendering reduces recurring SaaS cost and gives us complete control over documentary visual structure.

## Publishing

- YouTube Data API

## Cross-platform

Initial:
- native/API posting where practical
- manual approval queue

Optional:
- Blotato
- Buffer
- Metricool

---

# 5. Final Repository Structure

```text
youtube-automation-os/
│
├── README.md
├── TODO.md
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── QUICKSTART.md
│   ├── INSTALL.md
│   ├── AIRTABLE.md
│   ├── N8N.md
│   ├── API_KEYS.md
│   ├── RENDERER.md
│   ├── DEPLOYMENT.md
│   ├── TROUBLESHOOTING.md
│   ├── COSTS.md
│   └── SECURITY.md
│
├── airtable/
│   ├── schema.json
│   ├── sample-data.csv
│   ├── fields.md
│   └── formulas.md
│
├── config/
│   ├── providers.json
│   ├── categories.json
│   ├── scoring.json
│   ├── visual-styles.json
│   └── defaults.json
│
├── n8n/
│   ├── 00-master-orchestrator.json
│   ├── 01-topic-intelligence.json
│   ├── 02-competitor-research.json
│   ├── 03-topic-research.json
│   ├── 04-fact-check.json
│   ├── 05-story-architect.json
│   ├── 06-script-writer.json
│   ├── 07-scene-builder.json
│   ├── 08-asset-finder.json
│   ├── 09-voice-generator.json
│   ├── 10-renderer.json
│   ├── 11-thumbnail-metadata.json
│   ├── 12-qc.json
│   ├── 13-youtube-publisher.json
│   ├── 14-social-repurpose.json
│   └── 15-analytics-learning.json
│
├── prompts/
│   ├── shared/
│   └── categories/
│       ├── financial-crime.md
│       ├── dark-business.md
│       ├── mysteries.md
│       ├── history.md
│       └── ai-tech.md
│
├── services/
│   ├── youtube/
│   ├── research/
│   ├── assets/
│   ├── voice/
│   ├── analytics/
│   └── storage/
│
├── renderer/
│   ├── remotion/
│   ├── ffmpeg/
│   ├── components/
│   └── templates/
│
├── database/
│   ├── schema.sql
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── examples/
    ├── sample-project.json
    ├── sample-research.json
    ├── sample-script.json
    └── sample-scenes.json
```

---

# 6. Airtable Control Center

## Table 1 — Channels

Fields:

- Channel ID
- Channel Name
- YouTube Channel ID
- Primary Category
- Active
- Default Runtime
- Default Voice
- Default Visual Style
- Upload Frequency
- CTA
- Status

---

## Table 2 — Content Ideas

Fields:

- Idea ID
- Proposed Title
- Topic
- Category
- Source
- Search Demand
- Trend Score
- Competition Score
- Breakout Evidence
- Advertiser Score
- Visual Availability
- Evergreen Score
- Opportunity Score
- Approved
- Status

Statuses:

- Idea
- Scoring
- Awaiting Approval
- Approved
- Rejected
- Production Started

---

## Table 3 — Competitors

Fields:

- Channel
- Channel URL
- Channel ID
- Subscribers
- Median Views
- Average Views
- Category
- Upload Frequency
- Last Scan
- Active

---

## Table 4 — Competitor Videos

Fields:

- Video ID
- Competitor
- Title
- Published Date
- Views
- Views Per Day
- Duration
- Likes
- Comments
- Breakout Ratio
- Topic Cluster
- Hook Pattern
- Title Pattern
- Thumbnail Pattern

---

## Table 5 — Research

Fields:

- Research ID
- Idea
- Thesis
- Timeline
- People
- Organizations
- Major Claims
- Financial Figures
- Sources
- Unverified Claims
- Fact Check Status
- Research Status

---

## Table 6 — Scripts

Fields:

- Script ID
- Idea
- Version
- Hook
- Script
- Word Count
- Estimated Runtime
- Chapters
- CTA
- Approval
- Revision Notes

---

## Table 7 — Scenes

Fields:

- Scene ID
- Script
- Scene Number
- Narration
- Duration
- Visual Type
- Search Query
- Asset Provider
- Asset URL
- Asset License
- Asset Credit
- Motion
- Overlay
- Transition
- Status

---

## Table 8 — Videos

> This is the full, north-star schema across every phase. What's actually built and wired up in Phase 1 is a subset — see `airtable/schema.json` and `airtable/fields.md` for the exact implemented fields (they also include a `Media Assets` table, Table 12 below, and the two approval checkboxes).

Fields:

- Video ID
- Channel
- Script
- Status
- Scene Count
- Voice
- Visual Style
- Render Progress
- Render URL/Path
- Thumbnail
- Final Title
- Description
- Chapters
- YouTube ID
- Schedule Time
- Published At
- QC Status

Expanded production-config fields (added after reviewing a second reference automation — Update 2, §27; implemented in Phase 1 as flat Airtable columns, see `airtable/fields.md`):

- **Basic**: Target Runtime, Target Word Count
- **Narration**: Voice Provider, Narration Style, Narration Speed
- **Visual Production**: Scene Density, Average Scene Duration, Stock Footage Priority, Archive Priority, Map Usage, Document Usage, Chart Usage, Screenshot Usage, AI Image Usage, AI Video Usage
- **Rendering**: Render Provider, Resolution, Aspect Ratio, Background Music, Caption Style
- **Automation**: Research Depth, Require Script Approval, Require Final Approval, Script Approved, Final Video Approved, Auto Publish, Auto Repurpose, Publish Date, Priority
- **Failure tracking**: Retry Count, Failed Stage

Full status state machine (Update 14; Phase 1 implements the subset in bold — see `airtable/schema.json`):

- IDEA
- SCORING
- AWAITING TOPIC APPROVAL
- RESEARCHING
- FACT CHECKING
- STORY BUILDING
- SCRIPTING (**Start**)
- **SCRIPT REVIEW**
- SCENE PLANNING (**Generating Assets**)
- ASSET COLLECTION
- **NARRATING**
- **RENDERING**
- AUTOMATED QC
- FINAL REVIEW (**Final Review**)
- READY TO PUBLISH
- SCHEDULED
- **PUBLISHED**
- REPURPOSING
- COMPLETE

Failure state: **FAILED**, with `failed_stage`, `error_message` (stored as the `Errors` table's `Message`), `retry_count`.

---

## Table 9 — Shorts

Fields:

- Short ID
- Parent Video
- Hook
- Segment
- Platform
- Caption
- Render
- Status
- Published URL

---

## Table 10 — Analytics

Fields:

- Video
- Date
- Impressions
- CTR
- Views
- Views/Day
- Watch Time
- Avg View Duration
- Avg Percentage Viewed
- Subscribers Gained
- Returning Viewers
- RPM
- Revenue

---

## Table 11 — Errors

Fields:

- Error ID
- Workflow
- Stage
- Video/Record
- Message
- Retry Count
- Timestamp
- Resolved

---

## Table 12 — Media Assets

Source/copyright ledger (Update 7, §27) — one row per downloaded stock/archival asset, implemented in Phase 1.

Fields:

- Asset ID
- Video (link to Videos)
- Scene ID
- Source Provider
- Source URL
- Creator
- License
- Attribution
- Download Date
- Local Path
- Usage Status (`approved` / `review_required`)

---

# 7. Phase 1 — Build the Minimum Working Clone

Goal:

Recreate the useful behavior demonstrated in the reference video before adding intelligence.

## TODO

- [ ] Create GitHub repository
- [ ] Create Docker-based n8n setup
- [ ] Create Airtable base
- [ ] Create Videos table
- [ ] Create category field
- [ ] Create title/idea field
- [ ] Create status field
- [ ] Create scene count field
- [ ] Create style field
- [ ] Create voice field
- [ ] Create runtime field
- [ ] Create n8n Airtable trigger
- [ ] Trigger workflow when Status = `Start`
- [ ] Generate simple outline
- [ ] Generate long-form script
- [ ] Split script into scenes
- [ ] Generate scene metadata
- [ ] Generate free TTS narration
- [ ] Pull stock/public visuals
- [ ] Build scenes in renderer
- [ ] Combine scenes
- [ ] Save final MP4
- [ ] Update Airtable Status = `Done`
- [ ] Add YouTube upload node
- [ ] Test end-to-end on a 60-second test video

### Phase 1 Acceptance Criteria

Typing a title into Airtable and setting `Status = Start` produces a playable video file without manually editing the workflow.

---

# 8. Phase 2 — Replace Basic AI Video Generation With Documentary Production

The reference workflow appears to use short generated scenes. For our niches, this is not enough.

## Scene Types Required

- stock video
- archival video
- historical photograph
- company photograph
- document
- court filing
- screenshot
- map
- chart
- timeline
- headline
- quote card
- motion typography
- optional AI-generated image
- optional AI-generated video

## TODO

- [ ] Build scene-type router
- [ ] Build asset search service
- [ ] Build map scene component
- [ ] Build timeline component
- [ ] Build document zoom/highlight component
- [ ] Build headline montage component
- [ ] Build chart component
- [ ] Build animated number component
- [ ] Build photo pan/zoom component
- [ ] Build stock-video component
- [ ] Build source-credit support
- [ ] Prevent excessive reuse of one visual
- [ ] Add fallback visual logic

---

# 9. Phase 3 — Research & Fact Checking

This is a major upgrade over the reference system.

## TODO

- [ ] Create Research Agent
- [ ] Build structured research JSON schema
- [ ] Require source URLs
- [ ] Create source ranking rules
- [ ] Create Fact Check Agent
- [ ] Verify names
- [ ] Verify dates
- [ ] Verify financial figures
- [ ] Verify legal status
- [ ] Distinguish allegations from convictions/findings
- [ ] Reject unsupported claims
- [ ] Flag conflicting sources
- [ ] Block script generation on unresolved critical claims
- [ ] Store all research in Airtable/database

---

# 10. Phase 4 — Topic Intelligence

The system should not depend on the operator already knowing what title to type.

## TODO

- [ ] Add YouTube competitor scanning
- [ ] Pull recent competitor videos
- [ ] Calculate channel median views
- [ ] Calculate views/day
- [ ] Calculate breakout ratio
- [ ] Detect 3x, 5x and 10x breakout videos
- [ ] Cluster breakout topics
- [ ] Extract recurring title structures
- [ ] Add Google Trends comparison
- [ ] Add YouTube autocomplete research
- [ ] Add Reddit/community signals
- [ ] Calculate Opportunity Score
- [ ] Push highest-scoring ideas into Airtable

Formula:

```text
Breakout Ratio = Video Views / Channel Median Views
```

Suggested score:

```text
20% Breakout Evidence
15% Curiosity / Click Potential
15% Demand / Trend
10% Advertiser Value
10% Visual Availability
10% Evergreen Potential
10% Competition Inverse
5% Timeliness
5% Production Difficulty Inverse
```

---

# 11. Phase 5 — Story & Retention Engine

## TODO

- [ ] Generate 3 story angles
- [ ] Score each angle
- [ ] Select strongest angle
- [ ] Build central question
- [ ] Build cold open
- [ ] Build setup
- [ ] Build escalating revelations
- [ ] Create open loops
- [ ] Add pattern interrupts
- [ ] Build climax/reveal
- [ ] Build aftermath
- [ ] Create ending
- [ ] Generate chapter timings
- [ ] Generate natural CTA
- [ ] Prevent repetitive template language

---

# 12. Phase 6 — Five Category Profiles

## Financial Crime & Scams

Research priority:

1. SEC
2. DOJ
3. FTC
4. FBI
5. EDGAR
6. court records
7. official filings
8. reputable reporting

Visual priority:

- filings
- court documents
- company footage
- financial charts
- transaction diagrams
- maps
- executive photos
- timelines

---

## Dark Business

Research priority:

- annual reports
- earnings
- SEC filings
- bankruptcy filings
- lawsuits
- archived websites
- reputable business journalism

Visual priority:

- products
- offices
- CEOs
- charts
- documents
- historical sites
- headlines

---

## Unsolved Mysteries

Research priority:

- official investigations
- government reports
- historical archives
- reputable reporting
- verified eyewitness records

Visual priority:

- locations
- maps
- archive photos
- investigation documents
- timelines
- atmospheric stock

---

## History

Research priority:

- Library of Congress
- National Archives
- museums
- universities
- primary historical sources
- Wikimedia Commons

Visual priority:

- archival photographs
- maps
- paintings
- film
- documents
- timelines

---

## AI / Technology

Research priority:

- official company information
- technical documentation
- research papers
- filings
- patents
- conference materials
- reputable tech journalism

Visual priority:

- products
- interfaces
- diagrams
- chips
- data centers
- charts
- company footage

---

# 13. Phase 7 — Voice Engine

## TODO

- [ ] Implement Edge TTS provider
- [ ] Implement Kokoro provider
- [ ] Implement provider abstraction
- [ ] Add premium ElevenLabs adapter later
- [ ] Add voice profiles
- [ ] Add pronunciation dictionary
- [ ] Add paragraph pacing
- [ ] Add natural pauses
- [ ] Normalize audio loudness
- [ ] Generate timestamps
- [ ] Retry failed sections only
- [ ] Cache completed narration

---

# 14. Phase 8 — Renderer

Preferred stack:

- Remotion
- FFmpeg

## TODO

- [ ] Initialize Remotion app
- [ ] Create 16:9 1080p composition
- [ ] Build scene parser
- [ ] Build reusable documentary components
- [ ] Add subtitle rendering
- [ ] Add background audio
- [ ] Add ducking under narration
- [ ] Add transitions
- [ ] Add animated overlays
- [ ] Add channel logo
- [ ] Add intro/outro
- [ ] Add credits/source section
- [ ] Build FFmpeg final encode
- [ ] Test 1-minute render
- [ ] Test 5-minute render
- [ ] Test 15-minute render
- [ ] Track render progress
- [ ] Resume after failed scene

---

# 15. Phase 9 — Thumbnail & Packaging

## TODO

- [ ] Create title generator
- [ ] Generate 10 title candidates
- [ ] Score titles
- [ ] Create 5 thumbnail concepts
- [ ] Generate/assemble thumbnail candidates
- [ ] Store candidates in Airtable
- [ ] Require human thumbnail approval
- [ ] Generate description
- [ ] Generate chapters
- [ ] Generate pinned comment
- [ ] Generate source/credits section

---

# 16. Phase 10 — Automated QC

## QC Gates

### Research QC

- claim support
- source quality
- name/date/number verification

### Script QC

- originality
- factual support
- narrative clarity
- pacing
- repetition
- unsupported accusations

### Visual QC

- missing asset
- duplicate asset
- incorrect visual
- bad aspect ratio
- broken file

### Audio QC

- missing narration
- clipping
- silence
- inconsistent loudness

### Render QC

- duration
- black frames
- missing captions
- missing scenes
- audio/video sync

## TODO

- [ ] Implement automated QC report
- [ ] Store QC score
- [ ] Block publishing when QC fails
- [ ] Add Airtable `QC Required` view
- [ ] Add human final-approval toggle

---

# 17. Phase 11 — Publishing

## TODO

- [ ] Configure Google Cloud project
- [ ] Enable YouTube Data API
- [ ] Configure OAuth
- [ ] Add YouTube uploader
- [ ] Add thumbnail uploader
- [ ] Add title
- [ ] Add description
- [ ] Add category
- [ ] Add privacy status
- [ ] Add schedule time
- [ ] Add playlist
- [ ] Save YouTube ID
- [ ] Update Airtable

---

# 18. Phase 12 — Repurposing

One documentary should create:

- 4–8 YouTube Shorts
- 4–8 TikTok clips
- 4–8 Instagram Reels
- Facebook Reels where desired

## TODO

- [ ] Identify strongest moments
- [ ] Score clip hooks
- [ ] Produce 9:16 crop
- [ ] Add captions
- [ ] Rewrite first-line hook per platform
- [ ] Generate caption
- [ ] Generate hashtags only when useful
- [ ] Add scheduling queue
- [ ] Save published URLs
- [ ] Link each clip to parent video

---

# 19. Phase 13 — Analytics & Learning Loop

## TODO

- [ ] Pull YouTube video metrics
- [ ] Store daily snapshots
- [ ] Calculate CTR
- [ ] Calculate view velocity
- [ ] Calculate retention
- [ ] Calculate subscriber conversion
- [ ] Record RPM/revenue when available
- [ ] Compare category performance
- [ ] Compare hook styles
- [ ] Compare video lengths
- [ ] Compare title patterns
- [ ] Compare thumbnail concepts
- [ ] Detect winners
- [ ] Feed insights into Opportunity Score
- [ ] Generate weekly strategy report

---

# 20. Cost Controls

## TODO

- [ ] Create per-video cost ledger
- [ ] Log every paid API request
- [ ] Create monthly budget ceiling
- [ ] Create per-video budget ceiling
- [ ] Prefer cached outputs
- [ ] Retry only failed sections
- [ ] Avoid regenerating approved assets
- [ ] Add provider fallback
- [ ] Add `FREE_MODE=true`
- [ ] Add `PREMIUM_MODE=false`

Target MVP:

```text
$0–$30/month excluding electricity/hardware
```

Use paid providers only where they clearly improve retention or production reliability.

---

# 21. Safety / Copyright / Monetization Requirements

## TODO

- [ ] Keep source provenance for every media asset
- [ ] Store license information
- [ ] Avoid copying competitor scripts
- [ ] Avoid copying competitor thumbnails
- [ ] Use competitor data for patterns, not reproduction
- [ ] Add original narration
- [ ] Add meaningful editing/transformation
- [ ] Avoid repetitive mass-produced structure
- [ ] Add AI disclosure check where appropriate
- [ ] Flag legally sensitive claims
- [ ] Require human review before publishing sensitive documentaries

---

# 22. Development With Codex / Claude Code

Give the coding agent this repository and work milestone-by-milestone.

## Milestone 1 Prompt

```text
Read README.md and TODO.md completely.

Build only Phase 1.

Do not implement later phases yet.

Requirements:
- Dockerized self-hosted n8n
- Airtable-triggered workflow
- configurable LLM provider
- free TTS provider
- simple asset retrieval
- local FFmpeg/Remotion rendering
- Airtable status updates
- sample 60-second end-to-end test

Never hard-code API keys.
Put all secrets in environment variables.
Write setup documentation.
Add tests for every utility.
Do not mark a TODO complete until it has been tested.
```

## Milestone 2 Prompt

```text
Read the repository and TODO.md.

Implement Phase 2: documentary scene system.

Add support for:
stock video
archival images
documents
maps
charts
timelines
headlines
motion text

Create reusable Remotion components.

Preserve the existing Phase 1 workflow.

Test with one 3-minute documentary.
Document all changes.
```

Continue milestone-by-milestone rather than giving the coding agent the entire project in one instruction.

---

# 23. Recommended Build Order

Do not attempt full automation on day one.

Build in this order:

## Sprint 1

- Airtable
- n8n
- script
- scenes
- voice
- renderer

## Sprint 2

- documentary visuals
- source tracking
- QC

## Sprint 3

- research
- fact checking
- category presets

## Sprint 4

- competitor intelligence
- breakout detection
- opportunity scoring

## Sprint 5

- publishing
- repurposing

## Sprint 6

- analytics
- learning loop

---

# 24. MVP Definition

The MVP is complete when:

1. A title can be entered into Airtable.
2. Category can be selected.
3. Status can be changed to `Start`.
4. n8n automatically processes the job.
5. A script is produced.
6. A script approval step works.
7. Scenes are produced.
8. Assets are sourced.
9. Voiceover is generated.
10. A 1080p video is rendered.
11. QC runs.
12. Final approval is required.
13. The video can be uploaded to YouTube.
14. Airtable reflects every stage.
15. Errors are visible and retryable.

Revised/confirmed after reviewing a second reference automation (Update 17, §27) — the MVP does **not** require: automatic trend discovery, TikTok/Instagram/Facebook publishing, full analytics learning, multiple channels. Those are Phase 2+.

Phase 1 implementation status against this list (see `TODO.md` §27 for the full patch and triage): items 1-9, 13-15 are built and locally verified (unit tests + a real `npm run dry-run`, including real edge-tts audio). Item 6 (script approval) and 12 (final approval) are built as the two n8n orchestrator gates (§27, Update 11) but not yet run against a live n8n instance. Item 10 (render) works via ffmpeg/Remotion, also not yet verified live. Item 11 (QC) and the "research packet is generated" criterion from Update 17 are **not implemented** — QC and the research agent remain Sprint 2/3 work per §23.

---

# 25. Version 2 Definition

Version 2 is complete when the system additionally:

- discovers its own topics
- tracks competitors
- identifies breakout videos
- performs structured research
- fact-checks claims
- supports all five niches
- repurposes videos
- collects analytics
- improves topic recommendations based on actual channel results

---

# 26. First Action

Start with these files:

1. `docker-compose.yml`
2. `.env.example`
3. `config/providers.json`
4. `config/categories.json`
5. `airtable/schema.json`
6. `n8n/00-master-orchestrator.json`
7. `n8n/06-script-writer.json`
8. `n8n/07-scene-builder.json`
9. `n8n/09-voice-generator.json`
10. `n8n/10-renderer.json`
11. `renderer/remotion/`
12. `docs/QUICKSTART.md`

Do not start with competitor intelligence.

First prove:

> Airtable → n8n → script → scenes → narration → rendered video

Once that path works reliably, add intelligence upstream and publishing/analytics downstream.

---

# 27. Reference Automation Review — Applied Updates

After Phase 1 (§7-§26) was built and locally verified, a second automation reference was reviewed. Its patch is reproduced in full below for traceability, followed by what was actually implemented vs. deferred in this pass.

## Triage: Implemented vs Deferred (this pass)

**Implemented:**
- **Update 2** — Videos table expanded with the full production-config field set (§6 Table 8, `airtable/schema.json`, `services/common/types.ts#ProductionConfig`).
- **Update 3** — `RENDER_PROVIDER` (`remotion` / `ffmpeg` / `json2video`); JSON2Video adapter in `services/render/json2video.ts` (unverified against a real account — see `docs/QUICKSTART.md`).
- **Update 4** — Structured JSON was already true at every worker HTTP boundary (zod). Added: Gemini retries once on an empty/malformed response (`services/llm/gemini.ts`); Research/Story-Architect JSON *schemas* for later phases (`services/common/agentSchemas.ts`) — no agent built behind them yet.
- **Update 5** — `services/scenes/splitter.ts` now targets a runtime-derived scene count (Scene Density: low/medium/high, ~12s/8s/5s average) via sentence-level regrouping, instead of one scene per script paragraph.
- **Update 6 (partial)** — Visual router added `document`/`screenshot`/`headline` types and routes scenes through the Videos record's priority toggles. Map/chart route to the plain image renderer — no dedicated components yet (still Phase 2, §8).
- **Update 7** — Full source/copyright ledger: `Media Assets` table (§6 Table 12), `services/assets/index.ts#scenesToMediaAssets`, `services/airtable/index.ts#recordMediaAsset`, written automatically after `/assets/attach`.
- **Update 9 (partial)** — `Retry Count` + `Failed Stage` fields; B1's Airtable search formula skips records whose `Retry Count` has already reached 3. Full per-scene resumable retry is deferred (needs a resumable render pipeline).
- **Update 10 / 13** — Voice provider abstraction (`services/voice/provider.ts`, `edge-tts` implemented, `piper`/`kokoro`/`elevenlabs` registered-not-implemented); storage abstraction (`services/storage/`, `local` implemented, `google_drive`/`r2`/`s3` registered-not-implemented); `wikimedia`/`archives` registered as planned stock providers.
- **Update 11** — Two human approval gates, implemented as three independently-polling n8n orchestrator branches (`n8n/00-master-orchestrator.json`, `docs/N8N.md`).
- **Update 14 (subset)** — `Script Review`/`Final Review` states added to the working status enum (§6 Table 8 shows the full 19-state chain with the implemented subset in bold).
- **Update 15** — `TOPIC_MODE=manual|discovery` config flag; `discovery` registered-not-implemented.
- **Update 18** — Core design principle added near the top of this document (§1).
- **Updates 1, 12, 16** — Documentation-only; reflected in §3's "Airtable is the primary operator interface" note and `docs/ARCHITECTURE.md`/`docs/AIRTABLE.md`. No Supabase code exists yet — nothing to change.
- **Update 17** — MVP criteria cross-checked against the current build; see the note under §24.

**Explicitly deferred** (still Sprint 2/3+ per §23, unchanged by this patch): full Update 6 visual components (map/chart/timeline/document-zoom), Update 8's 13-subworkflow split (the existing worker-API-centric thin-n8n design already gives independently-testable stages with structured input/output — see `docs/ARCHITECTURE.md` — a literal file-per-stage split would mean empty shells for research/fact-check/story-architect/QC/repurposer/analytics, which don't have logic behind them yet), full Update 9 per-scene resumable retry, Update 15's discovery-mode Opportunity Engine, Update 17's "research packet is generated" MVP item (research agent itself is still Sprint 3).

None of this has been run against a live n8n/Docker instance yet — see `docs/QUICKSTART.md`'s "Known gaps to verify" section.

## Full patch as reviewed

> Reproduced verbatim from `TODO.md — Required Updates After Reference Video Review.md` for traceability. Do not re-apply — see the triage above for what's already done.

### UPDATE 1 — Airtable Is the Primary Operator Interface

Applied — see §3 "Airtable is the primary operator interface."

### UPDATE 2 — Expand Airtable Production Configuration

Applied — see §6 Table 8.

### UPDATE 3 — Add Render Provider Abstraction

Applied — see `config/providers.json` and `services/render/`.

### UPDATE 4 — Formalize Structured JSON Between Every AI Agent

Applied where an agent exists; schemas reserved for Research/Story Architect. Agent JSON contracts:

```json
// Research Agent
{
  "topic": "", "thesis": "", "timeline": [], "people": [], "organizations": [],
  "claims": [], "financial_figures": [], "sources": [], "visual_opportunities": []
}
// Story Architect
{
  "central_question": "", "hook": "", "acts": [], "open_loops": [], "reveal": "", "ending": ""
}
// Script Writer
{
  "title": "", "hook": "", "chapters": [], "script": "", "word_count": 0, "estimated_runtime": 0
}
// Scene Director
{
  "scenes": [{ "scene_number": 1, "narration": "", "duration": 0, "visual_type": "", "search_query": "",
    "asset_source": "", "motion": "", "overlay": "", "transition": "", "citation": "" }]
}
```

Add: JSON schema validation, retry malformed outputs, reject missing required fields, log invalid AI responses, never pass raw prose directly between agents.

### UPDATE 5 — Replace Fixed Scene Counts With Documentary Scene Density

Applied — see `services/scenes/splitter.ts`. Production targets used: 5min → 25-50 visual changes, 10min → 45-90, 15min → 70-130, 20min → 90-170 (targets, not hard limits).

### UPDATE 6 — Add a Documentary Visual Router

Partially applied. Full router: Stock Video, Archive Video, Historical Photo, Company Photo, Screenshot, Document, Court Filing, Map, Chart, Timeline, Headline, Motion Graphic, AI Image, AI Video. Search real footage before generating synthetic media; use AI-generated media as supporting material, not the default; add fallback rules; prevent excessive reuse of identical assets; match visuals directly to narration.

### UPDATE 7 — Add Source and Copyright Ledger

Applied — see §6 Table 12 and `services/assets/`.

### UPDATE 8 — Split Large n8n Workflow Into Subworkflows

Deferred — see triage above for why.

```text
00 Master Orchestrator
├── 01 Topic Intelligence   ├── 02 Research         ├── 03 Fact Check
├── 04 Story Architect      ├── 05 Script Writer     ├── 06 Scene Director
├── 07 Asset Manager        ├── 08 Voice             ├── 09 Renderer
├── 10 QC                   ├── 11 Publisher         ├── 12 Repurposer
└── 13 Analytics
```

### UPDATE 9 — Add Resume / Retry Logic

Partially applied — see triage above.

### UPDATE 10 — Add Provider Abstraction Beyond Rendering

Applied — LLM/Voice/Storage/Render/Stock provider registries, see `config/providers.json`.

### UPDATE 11 — Add Two Human Approval Gates

Applied — see `n8n/00-master-orchestrator.json`, `docs/N8N.md`.

### UPDATE 12 — Keep Social Distribution Out of Sprint 1

Already true — no social integration exists yet. Build order unchanged, see §23.

### UPDATE 13 — Add Storage Abstraction

Applied — see `services/storage/`.

### UPDATE 14 — Improve Status State Machine

Applied (subset) — see §6 Table 8.

### UPDATE 15 — Separate Topic Modes

Applied (manual only; discovery registered-not-implemented) — see `config/providers.json`, `.env.example`.

### UPDATE 16 — Clarify Supabase's Role

Applied — see §3.

### UPDATE 17 — Revised MVP Acceptance Criteria

Applied — see the note under §24.

### UPDATE 18 — New Core Design Principle

Applied — see §1.

### DO NOT CHANGE THESE EXISTING DECISIONS

Kept: n8n as orchestration engine, Airtable, Supabase availability, FFmpeg, Remotion, local/free TTS first, free stock/archive sources, five category profiles, competitor intelligence, topic opportunity scoring, research agent, fact checker, analytics learning loop, human QC, free-first cost strategy. The changes above refine the implementation rather than replacing the current architecture.
