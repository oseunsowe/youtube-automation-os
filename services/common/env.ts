import "dotenv/config";

function str(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === "true";
}

export const env = {
  airtable: {
    apiKey: str("AIRTABLE_API_KEY"),
    baseId: str("AIRTABLE_BASE_ID"),
    videosTable: str("AIRTABLE_VIDEOS_TABLE", "Videos"),
    mediaAssetsTable: str("AIRTABLE_MEDIA_ASSETS_TABLE", "Media Assets"),
    errorsTable: str("AIRTABLE_ERRORS_TABLE", "Errors"),
  },
  llm: {
    provider: str("LLM_PROVIDER", "mock"),
    geminiApiKey: str("GEMINI_API_KEY"),
    openaiApiKey: str("OPENAI_API_KEY"),
    anthropicApiKey: str("ANTHROPIC_API_KEY"),
    ollamaBaseUrl: str("OLLAMA_BASE_URL", "http://localhost:11434"),
  },
  tts: {
    provider: str("TTS_PROVIDER", "edge-tts"),
  },
  assets: {
    pexelsApiKey: str("PEXELS_API_KEY"),
    pixabayApiKey: str("PIXABAY_API_KEY"),
  },
  youtube: {
    clientId: str("YOUTUBE_CLIENT_ID"),
    clientSecret: str("YOUTUBE_CLIENT_SECRET"),
    refreshToken: str("YOUTUBE_REFRESH_TOKEN"),
  },
  render: {
    provider: str("RENDER_PROVIDER", "remotion"),
    json2videoApiKey: str("JSON2VIDEO_API_KEY"),
  },
  storage: {
    provider: str("STORAGE_PROVIDER", "local"),
  },
  topic: {
    mode: str("TOPIC_MODE", "manual"),
  },
  worker: {
    port: Number(str("WORKER_PORT", "4000")),
    dataDir: str("DATA_DIR", "./data"),
  },
  costControls: {
    freeMode: bool("FREE_MODE", true),
    premiumMode: bool("PREMIUM_MODE", false),
  },
};
