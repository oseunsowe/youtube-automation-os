/**
 * One-time setup script: creates the Airtable base (Videos, Media Assets,
 * Errors tables) from airtable/schema.json via Airtable's Meta API, instead
 * of clicking through ~40 fields by hand.
 *
 * Requires a Personal Access Token with scopes: data.records:read,
 * data.records:write, schema.bases:read, schema.bases:write, and access to
 * the target workspace (the base doesn't exist yet, so it can't be scoped
 * to a specific base -- grant it "all current and future bases" or select
 * the workspace explicitly when creating the token).
 *
 * Usage:
 *   AIRTABLE_API_KEY=... AIRTABLE_WORKSPACE_ID=wspXXXXXXXXXXXXXX npx tsx scripts/create-airtable-base.ts
 *
 * Prints the new base ID at the end -- put that in .env as AIRTABLE_BASE_ID.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../services/common/env.js"; // loads .env via dotenv/config as a side effect

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.AIRTABLE_API_KEY;
const WORKSPACE_ID = process.env.AIRTABLE_WORKSPACE_ID;
const BASE_NAME = process.env.AIRTABLE_BASE_NAME || "YouTube Automation OS";

if (!API_KEY) throw new Error("AIRTABLE_API_KEY is not set (check .env)");
if (!WORKSPACE_ID) {
  throw new Error(
    "AIRTABLE_WORKSPACE_ID is not set. Find it in the URL when you open a workspace at airtable.com (starts with 'wsp').",
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

async function airtableFetch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Airtable API error (${res.status}): ${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

async function main() {
  const videosTable = schema.tables.find((t) => t.name === "Videos")!;
  const errorsTable = schema.tables.find((t) => t.name === "Errors")!;
  const mediaAssetsTable = schema.tables.find((t) => t.name === "Media Assets")!;

  console.log(`Creating base "${BASE_NAME}" with Videos + Errors tables...`);
  const createBaseBody = {
    name: BASE_NAME,
    workspaceId: WORKSPACE_ID,
    tables: [
      { name: videosTable.name, fields: videosTable.fields.map((f) => mapField(f)) },
      { name: errorsTable.name, fields: errorsTable.fields.map((f) => mapField(f)) },
    ],
  };
  const baseResult = (await airtableFetch("https://api.airtable.com/v0/meta/bases", createBaseBody)) as {
    id: string;
    tables: { id: string; name: string }[];
  };

  const baseId = baseResult.id;
  const videosTableId = baseResult.tables.find((t) => t.name === "Videos")?.id;
  if (!videosTableId) throw new Error("Videos table id missing from create-base response");
  console.log(`Base created: ${baseId}`);

  console.log(`Creating Media Assets table (linked to Videos)...`);
  const mediaAssetsFields = mediaAssetsTable.fields.map((f) =>
    f.type === "multipleRecordLinks" ? mapField(f, videosTableId) : mapField(f),
  );
  await airtableFetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    name: mediaAssetsTable.name,
    fields: mediaAssetsFields,
  });

  console.log(`\nDone. Add this to .env:\nAIRTABLE_BASE_ID=${baseId}\n`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
