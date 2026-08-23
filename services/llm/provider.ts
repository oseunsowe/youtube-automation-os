import type { Category, Script } from "../common/types.js";

export interface ScriptRequest {
  title: string;
  category: Category;
  runtimeMinutes: number;
}

export interface LLMProvider {
  readonly name: string;
  generateScript(request: ScriptRequest): Promise<Script>;
}
