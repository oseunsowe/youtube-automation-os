import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const n8nDir = path.resolve(__dirname, "../n8n");

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  [key: string]: unknown;
}

export function validateWorkflow(workflow: N8nWorkflow): string[] {
  const errors: string[] = [];

  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    errors.push("workflow has no nodes");
    return errors;
  }

  const names = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node.id) errors.push(`node missing id: ${JSON.stringify(node.name)}`);
    if (!node.name) errors.push(`node missing name (id=${node.id})`);
    if (!node.type) errors.push(`node "${node.name}" missing type`);
    if (names.has(node.name)) errors.push(`duplicate node name "${node.name}"`);
    names.add(node.name);
  }

  if (typeof workflow.connections !== "object" || workflow.connections === null) {
    errors.push("workflow missing connections object");
    return errors;
  }

  for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
    if (!names.has(sourceName)) {
      errors.push(`connections reference unknown source node "${sourceName}"`);
      continue;
    }
    const mainOutputs = (outputs as { main?: unknown[][] }).main ?? [];
    for (const branch of mainOutputs) {
      for (const target of branch ?? []) {
        const targetName = (target as { node?: string }).node;
        if (targetName && !names.has(targetName)) {
          errors.push(`connection from "${sourceName}" references unknown target node "${targetName}"`);
        }
      }
    }
  }

  return errors;
}

export function listWorkflowFiles(): string[] {
  return readdirSync(n8nDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(n8nDir, f));
}

export function loadWorkflow(filePath: string): N8nWorkflow {
  return JSON.parse(readFileSync(filePath, "utf-8")) as N8nWorkflow;
}

function main() {
  const files = listWorkflowFiles();
  let hasErrors = false;

  for (const file of files) {
    const workflow = loadWorkflow(file);
    const errors = validateWorkflow(workflow);
    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n${path.basename(file)}:`);
      for (const err of errors) console.error(`  - ${err}`);
    } else {
      console.log(`OK  ${path.basename(file)}`);
    }
  }

  if (hasErrors) {
    console.error("\nn8n workflow validation failed.");
    process.exit(1);
  }
  console.log("\nAll n8n workflow files are structurally valid.");
}

const isMainModule =
  process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main();
}
