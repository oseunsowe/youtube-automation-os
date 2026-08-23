import { AirtableClient } from "./client.js";
import type { Category, VideoJob } from "../common/types.js";

export { AirtableClient } from "./client.js";
export type { AirtableRecord } from "./client.js";

export interface VideoFields {
  Title: string;
  Category: Category;
  Status: string;
  "Scene Count"?: number;
  Voice?: string;
  "Visual Style"?: string;
  "Default Runtime"?: number;
  "Render URL/Path"?: string;
  "YouTube ID"?: string;
}

export const VIDEO_STATUS = {
  START: "Start",
  RESEARCHING: "Researching",
  SCRIPT_REVIEW: "Script Review",
  GENERATING_ASSETS: "Generating Assets",
  NARRATING: "Narrating",
  RENDERING: "Rendering",
  QC_REQUIRED: "QC Required",
  READY_TO_PUBLISH: "Ready to Publish",
  PUBLISHED: "Published",
  FAILED: "Failed",
} as const;

export function fieldsToVideoJob(recordId: string, fields: VideoFields): VideoJob {
  return {
    videoId: recordId,
    title: fields.Title,
    category: fields.Category,
    runtimeMinutes: fields["Default Runtime"] ?? 5,
    voice: fields.Voice ?? "en-US-AndrewNeural",
    visualStyle: fields["Visual Style"] ?? "documentary",
  };
}

export async function findJobsToStart(client: AirtableClient, table: string): Promise<VideoJob[]> {
  const records = await client.listRecords<VideoFields>(table, `{Status}='${VIDEO_STATUS.START}'`);
  return records.map((r) => fieldsToVideoJob(r.id, r.fields));
}

export async function setStatus(
  client: AirtableClient,
  table: string,
  recordId: string,
  status: string,
  extraFields: Partial<VideoFields> = {},
): Promise<void> {
  await client.updateRecord<VideoFields>(table, recordId, { Status: status, ...extraFields });
}

export async function logError(
  client: AirtableClient,
  errorsTable: string,
  fields: { Workflow: string; Stage: string; "Video/Record"?: string; Message: string },
): Promise<void> {
  await client.createRecord(errorsTable, { ...fields, Timestamp: new Date().toISOString(), Resolved: false });
}
