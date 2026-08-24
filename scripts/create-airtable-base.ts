/**
 * One-time setup script: creates the Videos, Media Assets, and Errors
 * tables from airtable/schema.json via Airtable's Meta API, instead of
 * clicking through ~40 fields by hand.
 *
 * Requires a Personal Access Token with scopes: data.records:read,
 * data.records:write, schema.bases:read, schema.bases:write.
 *
 * Two modes:
 *  - AIRTABLE_BASE_ID set: adds the three tables to that existing base.
 *  - AIRTABLE_BASE_ID unset + AIRTABLE_WORKSPACE_ID set: creates a brand
 *    new base (name from AIRTABLE_BASE_NAME) in that workspace, then adds
 *    Media Assets as a second call once the new Videos table's id is known.
 *
 * Usage:
 *   npx tsx scripts/create-airtable-base.ts
 * (reads AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_WORKSPACE_ID from .env)
 *
 * Prints the base ID at the end -- put that in .env as AIRTABLE_BASE_ID.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../services/common/env.js"; // loads .env via dotenv/config as a side effect

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.AIRTABLE_API_KEY;
const EXISTING_BASE_ID = process.env.AIRTABLE_BASE_ID || undefined;
const WORKSPACE_ID = process.env.AIRTABLE_WORKSPACE_ID;
const BASE_NAME = process.env.AIRTABLE_BASE_NAME || "YouTube Automation OS";

if (!API_KEY) throw new Error("AIRTABLE_API_KEY is not set (check .env)");
if (!EXISTING_BASE_ID && !WORKSPACE_ID) {
  throw new Error(
    "Set either AIRTABLE_BASE_ID (to add tables to an existing base) or AIRTABLE_WORKSPACE_ID (to create a new base).",
  );
}

interface SchemaField {
  name: string;
  type: string;
  options?: string[];
  precision?: number;
  linkedTable?: string;
  [key: string]: unknown;
}

interface SchemaTable {
  name: string;
  primaryField: string;
  fields: SchemaField[];
}

const schema = JSON.parse(
  readFileSync(path.resolve(__dirname, "../airtable/schema.json"), "utf-8"),
) as { tables: SchemaTable[] };

function mapField(field: SchemaField, linkedTableId?: string): Record<string, unknown> {
  switch (field.type) {
    case "singleLineText":
    case "multilineText":
    case "url":
    case "autoNumber":
      return { name: field.name, type: field.type };
    case "number":
      return { name: field.name, type: "number", options: { precision: field.precision ?? 0 } };
    case "checkbox":
      return { name: field.name, type: "checkbox", options: { icon: "check", color: "greenBright" } };
    case "singleSelect":
      return {
        name: field.name,
        type: "singleSelect",
        options: { choices: (field.options ?? []).map((name) => ({ name })) },
      };
    case "dateTime":
      return {
        name: field.name,
        type: "dateTime",
        options: {
          timeZone: "utc",
          dateFormat: { name: "iso" },
          timeFormat: { name: "24hour" },
        },
      };
    case "multipleRecordLinks":
      if (!linkedTableId) throw new Error(`Missing linkedTableId for field "${field.name}"`);
      return { name: field.name, type: "multipleRecordLinks", options: { linkedTableId } };
    default:
      throw new Error(`Unmapped Airtable field type: ${field.type}`);
  }
}

async function airtableFetch(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Airtable API error (${res.status}): ${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

async function getExistingTables(baseId: string): Promise<Map<string, string>> {
  const result = (await airtableFetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`)) as {
    tables: { id: string; name: string }[];
  };
  return new Map(result.tables.map((t) => [t.name, t.id]));
}

async function createTable(
  baseId: string,
  table: SchemaTable,
  existing: Map<string, string>,
  linkedTableId?: string,
): Promise<string> {
  const existingId = existing.get(table.name);
  if (existingId) {
    console.log(`Table "${table.name}" already exists, skipping.`);
    return existingId;
  }
  const fields = table.fields.map((f) =>
    f.type === "multipleRecordLinks" ? mapField(f, linkedTableId) : mapField(f),
  );
  console.log(`Creating table "${table.name}"...`);
  const result = (await airtableFetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    name: table.name,
    fields,
  })) as { id: string; name: string };
  return result.id;
}

async function main() {
  const videosTable = schema.tables.find((t) => t.name === "Videos")!;
  const errorsTable = schema.tables.find((t) => t.name === "Errors")!;
  const mediaAssetsTable = schema.tables.find((t) => t.name === "Media Assets")!;
  const shortsTable = schema.tables.find((t) => t.name === "Shorts")!;

  let baseId: string;

  if (EXISTING_BASE_ID) {
    baseId = EXISTING_BASE_ID;
    console.log(`Adding tables to existing base ${baseId}...`);
  } else {
    console.log(`Creating base "${BASE_NAME}"...`);
    const baseResult = (await airtableFetch("https://api.airtable.com/v0/meta/bases", {
      name: BASE_NAME,
      workspaceId: WORKSPACE_ID,
      tables: [{ name: videosTable.name, fields: videosTable.fields.map((f) => mapField(f)) }],
    })) as { id: string };
    baseId = baseResult.id;
    console.log(`Base created: ${baseId}`);
  }

  const existing = await getExistingTables(baseId);
  const videosTableId = await createTable(baseId, videosTable, existing);
  await createTable(baseId, errorsTable, existing);
  await createTable(baseId, mediaAssetsTable, existing, videosTableId);
  await createTable(baseId, shortsTable, existing, videosTableId);

  console.log(`\nDone. Add this to .env:\nAIRTABLE_BASE_ID=${baseId}\n`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
