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

Statuses:

- Ready
- Researching
- Script Review
- Generating Assets
- Narrating
- Rendering
- QC Required
- Ready to Publish
- Scheduled
- Published
- Failed

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
