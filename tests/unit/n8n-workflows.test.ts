import { describe, it, expect } from "vitest";
import { listWorkflowFiles, loadWorkflow, validateWorkflow } from "../../scripts/validate-n8n.js";
import path from "node:path";

describe("n8n workflow files", () => {
  const files = listWorkflowFiles();

  it("finds the expected Phase 1 workflow files", () => {
    const names = files.map((f) => path.basename(f)).sort();
    expect(names).toEqual(
      [
        "00-master-orchestrator.json",
        "06-script-writer.json",
        "07-scene-builder.json",
        "09-voice-generator.json",
        "10-renderer.json",
        "13-youtube-publisher.json",
        "14-social-repurpose.json",
      ].sort(),
    );
  });

  for (const file of files) {
    it(`${path.basename(file)} is structurally valid`, () => {
      const workflow = loadWorkflow(file);
      const errors = validateWorkflow(workflow);
      expect(errors).toEqual([]);
    });
  }
});
