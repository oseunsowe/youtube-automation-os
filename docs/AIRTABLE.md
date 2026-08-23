# Airtable — Control Panel

Airtable is the job queue and status dashboard: you create a row, set `Status = Start`, and watch it move through the pipeline.

For the exact fields, types, and step-by-step base creation instructions, see [`airtable/fields.md`](../airtable/fields.md) and the machine-readable [`airtable/schema.json`](../airtable/schema.json). A filled example row is in [`airtable/sample-data.csv`](../airtable/sample-data.csv).

Phase 1 uses two tables: **Videos** (the job queue) and **Errors** (failure log). Later phases add Channels, Content Ideas, Competitors, Research, Scripts, Scenes, Shorts, and Analytics tables (see `youtube-automation-os-TODO.md` §6) — not needed yet.
