/**
 * One-time migration: adds the topic-discovery fields (TOPIC_MODE=discovery,
 * services/discovery/) to an existing Videos table via Airtable's Meta API,
 * instead of clicking through the Airtable UI by hand. Idempotent -- safe to
 * re-run, skips anything that already exists.
 *
 * Requires the same Personal Access Token scopes as
 * scripts/create-airtable-base.ts: data.records:read, data.records:write,
 * schema.bases:read, schema.bases:write.
 *
 * Usage:
 *   npx tsx scripts/update-videos-schema.ts
 * (reads AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_VIDEOS_TABLE from .env)
 */
import "../services/common/env.js"; // loads .env via dotenv/config as a side effect

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const VIDEOS_TABLE_NAME = process.env.AIRTABLE_VIDEOS_TABLE || "Videos";

if (!API_KEY) throw new Error("AIRTABLE_API_KEY is not set (check .env)");
if (!BASE_ID) throw new Error("AIRTABLE_BASE_ID is not set (check .env)");

interface AirtableField {
  id: string;
  name: string;
  type: string;
  options?: { choices?: { id: string; name: string }[]; [key: string]: unknown };
}

async function airtableFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Airtable API error (${res.status}): ${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

async function main() {
  const { tables } = (await airtableFetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`)) as {
    tables: { id: string; name: string; fields: AirtableField[] }[];
  };
  const videosTable = tables.find((t) => t.name === VIDEOS_TABLE_NAME);
  if (!videosTable) throw new Error(`Table "${VIDEOS_TABLE_NAME}" not found in base ${BASE_ID}`);

  const statusField = videosTable.fields.find((f) => f.name === "Status");
  if (!statusField) throw new Error(`"Status" field not found on ${VIDEOS_TABLE_NAME}`);

  const existingChoices = statusField.options?.choices ?? [];
  if (existingChoices.some((c) => c.name === "Topic Review")) {
    console.log('Status already has "Topic Review", skipping.');
  } else {
    console.log(
      'NOTE: Airtable\'s Meta API rejects updating singleSelect choices for this field (a known API quirk) -- add "Topic Review" to Status manually in the UI (field header -> Edit field -> add option). Continuing with the 4 new fields below.',
    );
  }

  const newFields: Array<{ name: string; type: string; options?: unknown }> = [
    { name: "Topic Approved", type: "checkbox", options: { icon: "check", color: "greenBright" } },
    { name: "Opportunity Score", type: "number", options: { precision: 0 } },
    { name: "Opportunity Rationale", type: "multilineText" },
    { name: "Opportunity Sources", type: "multilineText" },
  ];

  for (const field of newFields) {
    if (videosTable.fields.some((f) => f.name === field.name)) {
      console.log(`Field "${field.name}" already exists, skipping.`);
      continue;
    }
    console.log(`Creating field "${field.name}"...`);
    await airtableFetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${videosTable.id}/fields`, {
      method: "POST",
      body: JSON.stringify(field),
    });
  }

  console.log(`\nDone -- "${VIDEOS_TABLE_NAME}" now has the topic-discovery fields.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
