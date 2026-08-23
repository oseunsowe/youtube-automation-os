# Airtable — Control Panel

Airtable is the job queue, production-config panel, and approval dashboard: you create a row, set `Status = Start`, watch the script arrive and approve it, watch the render arrive and approve it, and it publishes to YouTube. It's the only interface the operator needs day to day -- Supabase (once introduced) stays a background data store for competitor datasets/analytics/caching, never something you open to run a job.

For the exact fields, types, and step-by-step base creation instructions, see [`airtable/fields.md`](../airtable/fields.md) and the machine-readable [`airtable/schema.json`](../airtable/schema.json). A filled example row is in [`airtable/sample-data.csv`](../airtable/sample-data.csv).

Three tables: **Videos** (the job queue, production config, and both approval checkboxes), **Media Assets** (source/copyright ledger, one row per downloaded stock asset), and **Errors** (failure log). Later phases add Channels, Content Ideas, Competitors, Research, Scripts, Scenes, Shorts, and Analytics tables (see `TODO.md` §6) — not needed yet.
