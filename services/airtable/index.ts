import { AirtableClient } from "./client.js";
import type { Category, MediaAsset, ProductionConfig, SceneDensity, Short, TopicSuggestion, VideoJob } from "../common/types.js";
import { DEFAULT_VISUAL_PRIORITIES } from "../common/types.js";

export { AirtableClient } from "./client.js";
export type { AirtableRecord } from "./client.js";

// Keep in sync with config/defaults.json -- duplicated here rather than
// imported live to avoid a JSON-import-under-NodeNext dependency.
const DEFAULTS = {
  runtimeMinutes: 5,
  voiceProvider: "edge-tts",
  voice: "en-US-AndrewNeural",
  visualStyle: "documentary",
  sceneDensity: "medium" as SceneDensity,
  renderProvider: "remotion",
};

export interface VideoFields {
  Title: string;
  Channel?: string;
  Category: Category;
  Status: string;
  "Target Runtime"?: number;
  "Target Word Count"?: number;
  "Voice Provider"?: string;
  Voice?: string;
  "Narration Style"?: string;
  "Narration Speed"?: number;
  "Visual Style"?: string;
  "Scene Density"?: SceneDensity;
  "Average Scene Duration"?: number;
  "Stock Footage Priority"?: boolean;
  "Archive Priority"?: boolean;
  "Map Usage"?: boolean;
  "Document Usage"?: boolean;
  "Chart Usage"?: boolean;
  "Screenshot Usage"?: boolean;
  "AI Image Usage"?: boolean;
  "AI Video Usage"?: boolean;
  "Render Provider"?: string;
  Resolution?: string;
  "Aspect Ratio"?: string;
  "Background Music"?: boolean;
  "Caption Style"?: string;
  "Research Depth"?: "none" | "basic" | "deep";
  "Require Script Approval"?: boolean;
  "Require Final Approval"?: boolean;
  "Script Approved"?: boolean;
  "Final Video Approved"?: boolean;
  "Auto Publish"?: boolean;
  "Auto Repurpose"?: boolean;
  "Publish Date"?: string;
  Priority?: number;
  "Scene Count"?: number;
  "Render URL/Path"?: string;
  "YouTube ID"?: string;
  "Published At"?: string;
  "Retry Count"?: number;
  "Failed Stage"?: string;
  "Topic Approved"?: boolean;
  "Opportunity Score"?: number;
  "Opportunity Rationale"?: string;
  "Opportunity Sources"?: string;
}

export const VIDEO_STATUS = {
  TOPIC_REVIEW: "Topic Review",
  START: "Start",
  SCRIPT_REVIEW: "Script Review",
  GENERATING_ASSETS: "Generating Assets",
  NARRATING: "Narrating",
  RENDERING: "Rendering",
  FINAL_REVIEW: "Final Review",
  PUBLISHED: "Published",
  FAILED: "Failed",
} as const;

export function fieldsToProductionConfig(fields: VideoFields): ProductionConfig {
  return {
    channel: fields.Channel,
    targetWordCount: fields["Target Word Count"],
    voiceProvider: fields["Voice Provider"] ?? DEFAULTS.voiceProvider,
    narrationStyle: fields["Narration Style"],
    narrationSpeed: fields["Narration Speed"],
    visualStyle: fields["Visual Style"] ?? DEFAULTS.visualStyle,
    sceneDensity: fields["Scene Density"] ?? DEFAULTS.sceneDensity,
    averageSceneDurationSeconds: fields["Average Scene Duration"],
    visualPriorities: {
      stockFootage: fields["Stock Footage Priority"] ?? DEFAULT_VISUAL_PRIORITIES.stockFootage,
      archive: fields["Archive Priority"] ?? DEFAULT_VISUAL_PRIORITIES.archive,
      map: fields["Map Usage"] ?? DEFAULT_VISUAL_PRIORITIES.map,
      document: fields["Document Usage"] ?? DEFAULT_VISUAL_PRIORITIES.document,
      chart: fields["Chart Usage"] ?? DEFAULT_VISUAL_PRIORITIES.chart,
      screenshot: fields["Screenshot Usage"] ?? DEFAULT_VISUAL_PRIORITIES.screenshot,
      aiImage: fields["AI Image Usage"] ?? DEFAULT_VISUAL_PRIORITIES.aiImage,
      aiVideo: fields["AI Video Usage"] ?? DEFAULT_VISUAL_PRIORITIES.aiVideo,
    },
    renderProvider: fields["Render Provider"] ?? DEFAULTS.renderProvider,
    resolution: fields.Resolution,
    aspectRatio: fields["Aspect Ratio"],
    backgroundMusic: fields["Background Music"] ?? false,
    captionStyle: fields["Caption Style"],
    researchDepth: fields["Research Depth"] ?? "none",
    requireScriptApproval: fields["Require Script Approval"] ?? true,
    requireFinalApproval: fields["Require Final Approval"] ?? true,
    autoPublish: fields["Auto Publish"] ?? false,
    autoRepurpose: fields["Auto Repurpose"] ?? false,
    publishDate: fields["Publish Date"],
    priority: fields.Priority,
  };
}

export function fieldsToVideoJob(recordId: string, fields: VideoFields): VideoJob {
  return {
    videoId: recordId,
    title: fields.Title,
    category: fields.Category,
    runtimeMinutes: fields["Target Runtime"] ?? DEFAULTS.runtimeMinutes,
    voice: fields.Voice ?? DEFAULTS.voice,
    visualStyle: fields["Visual Style"] ?? DEFAULTS.visualStyle,
    production: fieldsToProductionConfig(fields),
  };
}

export async function findJobsByStatus(
  client: AirtableClient,
  table: string,
  formula: string,
): Promise<VideoJob[]> {
  const records = await client.listRecords<VideoFields>(table, formula);
  return records.map((r) => fieldsToVideoJob(r.id, r.fields));
}

export async function findJobsToStart(client: AirtableClient, table: string): Promise<VideoJob[]> {
  return findJobsByStatus(client, table, `{Status}='${VIDEO_STATUS.START}'`);
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

export interface MediaAssetFields {
  "Asset ID": string;
  Video: string[];
  "Scene ID": string;
  "Source Provider": string;
  "Source URL": string;
  Creator?: string;
  License: string;
  Attribution: string;
  "Download Date": string;
  "Local Path": string;
  "Usage Status": "approved" | "review_required";
}

/** Writes one Media Assets ledger row per asset (Update 7 -- source/copyright provenance). */
export async function recordMediaAsset(
  client: AirtableClient,
  table: string,
  videoRecordId: string,
  asset: MediaAsset,
): Promise<void> {
  await client.createRecord<MediaAssetFields>(table, {
    "Asset ID": asset.assetId,
    Video: [videoRecordId],
    "Scene ID": asset.sceneId,
    "Source Provider": asset.sourceProvider,
    "Source URL": asset.sourceUrl,
    Creator: asset.creator,
    License: asset.license,
    Attribution: asset.attribution,
    "Download Date": asset.downloadDate,
    "Local Path": asset.localPath,
    "Usage Status": asset.usageStatus,
  });
}

export interface ShortFields {
  "Short ID": string;
  "Parent Video": string[];
  Hook: string;
  Segment: string;
  Platform: string;
  Caption: string;
  "Render Path"?: string;
  Status: Short["status"];
  "Published URL"?: string;
}

/** Writes one Shorts row per repurposed clip (Update 12 -- independent/opt-in social repurposing). */
export async function recordShort(
  client: AirtableClient,
  table: string,
  videoRecordId: string,
  short: Short,
): Promise<void> {
  await client.createRecord<ShortFields>(table, {
    "Short ID": short.shortId,
    "Parent Video": [videoRecordId],
    Hook: short.hook,
    Segment: short.sceneRange,
    Platform: short.platform,
    Caption: short.caption,
    "Render Path": short.renderPath,
    Status: short.status,
    "Published URL": short.publishedUrl,
  });
}

/** Writes one Videos row per suggested topic (TOPIC_MODE=discovery, Sprint 4 opportunity engine), awaiting Topic Approved. */
export async function recordTopicSuggestion(
  client: AirtableClient,
  table: string,
  suggestion: TopicSuggestion,
): Promise<void> {
  await client.createRecord<VideoFields>(table, {
    Title: suggestion.title,
    Category: suggestion.category,
    Status: VIDEO_STATUS.TOPIC_REVIEW,
    "Opportunity Score": suggestion.opportunityScore,
    "Opportunity Rationale": suggestion.rationale,
    "Opportunity Sources": suggestion.sources.join("\n"),
  });
}
