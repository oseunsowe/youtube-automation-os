import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { Scene } from "../common/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remotionProjectDir = path.resolve(__dirname, "../../renderer/remotion");

export function buildRemotionRenderArgs(propsFilePath: string, outPath: string): string[] {
  return [
    "remotion",
    "render",
    "src/index.ts",
    "Documentary",
    outPath,
    `--props=${propsFilePath}`,
  ];
}

function runRemotion(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", args, { cwd: remotionProjectDir });
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`remotion render exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

/** Renders the composition via the Remotion project (requires Chromium — Codespace/Docker only). */
export async function renderWithRemotion(
  scenes: Scene[],
  workDir: string,
  outPath: string,
): Promise<string> {
  // Absolute paths only: the remotion CLI is spawned with cwd=remotionProjectDir,
  // so a relative workDir/outPath here would resolve against that directory
  // instead of the caller's -- writing props/output to the wrong place.
  const absoluteWorkDir = path.resolve(workDir);
  const absoluteOutPath = path.resolve(outPath);

  const propsFilePath = path.join(absoluteWorkDir, "remotion-props.json");
  await writeFile(propsFilePath, JSON.stringify({ scenes }, null, 2));
  await runRemotion(buildRemotionRenderArgs(propsFilePath, absoluteOutPath));
  return absoluteOutPath;
}
