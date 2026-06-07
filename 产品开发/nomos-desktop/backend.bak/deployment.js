"use strict";

const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash, randomUUID } = require("node:crypto");
const { ensureProjectWorkflow, submitStageReceipt } = require("./workflow");

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const SCRIPT_PATTERN = /^[a-zA-Z0-9:_-]{1,80}$/;

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePreviewUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(url.protocol) || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Preview URL must use localhost or 127.0.0.1.");
  }
  return url.toString();
}

function runNpmScript({ workspaceDir, script }) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return execFileSync(command, ["run", script], {
    cwd: workspaceDir,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

function publicPreview(preview) {
  const { tokenHash, ...safePreview } = preview;
  return safePreview;
}

class DeploymentManager {
  constructor({ store, executionManager, runScript = runNpmScript }) {
    this.store = store;
    this.executionManager = executionManager;
    this.runScript = runScript;
    this.previews = new Map();
  }

  preview({ projectId, workspaceDir, script = "build", previewUrl }) {
    const project = this.store.snapshot().projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found.");
    ensureProjectWorkflow(project);
    const stage = project.stages.find((item) => item.key === "deploy");
    if (!stage || stage.status !== "in_progress") throw new Error("Deploy stage is not active.");
    const normalizedWorkspace = path.resolve(String(workspaceDir || project.workspaceDir || "").trim());
    if (!normalizedWorkspace || !this.executionManager.isWorkspaceAllowed(normalizedWorkspace)) {
      throw new Error("Workspace is outside the allowed roots.");
    }
    const normalizedScript = String(script || "build").trim();
    if (!SCRIPT_PATTERN.test(normalizedScript)) throw new Error("npm script name is invalid.");
    const normalizedUrl = normalizePreviewUrl(previewUrl);
    const confirmationToken = randomUUID();
    const preview = {
      id: randomUUID(),
      projectId,
      stageKey: "deploy",
      workspaceDir: normalizedWorkspace,
      script: normalizedScript,
      previewUrl: normalizedUrl,
      commandPreview: `npm run ${normalizedScript}`,
      status: "pending_confirmation",
      tokenHash: hashToken(confirmationToken),
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
    };
    this.previews.set(preview.id, preview);
    return { deployment: publicPreview(preview), confirmationToken };
  }

  confirm({ deploymentId, confirmationToken, confirm }) {
    const preview = this.previews.get(deploymentId);
    if (!preview) throw new Error("Deployment preview not found or expired.");
    if (Date.now() > new Date(preview.expiresAt).getTime()) {
      this.previews.delete(deploymentId);
      throw new Error("Deployment preview expired.");
    }
    if (confirm !== true) throw new Error("Creating a local preview requires explicit confirmation.");
    if (hashToken(String(confirmationToken || "")) !== preview.tokenHash) {
      throw new Error("Deployment confirmation token is invalid.");
    }
    const output = String(this.runScript({ workspaceDir: preview.workspaceDir, script: preview.script }) || "").slice(0, 2000);
    const result = this.store.update((data) => {
      const project = data.projects.find((item) => item.id === preview.projectId);
      if (!project) throw new Error("Project not found.");
      const receiptResult = submitStageReceipt(project, {
        stageKey: "deploy",
        status: "completed",
        summary: `Local preview created: ${preview.previewUrl}`,
        rawSummary: output,
        source: "local-preview",
        agentId: "local-preview",
        agentName: "Local Preview",
        agentType: "local",
        deliverables: [{ type: "URL", name: "Local preview", url: preview.previewUrl }],
      });
      project.previewDeployment = {
        url: preview.previewUrl,
        script: preview.script,
        workspaceDir: preview.workspaceDir,
        createdAt: nowIso(),
      };
      this.store.audit("deployment.preview.create", "Create local preview deployment", {
        projectId: preview.projectId,
        previewUrl: preview.previewUrl,
        script: preview.script,
      });
      return { ...receiptResult, deployment: project.previewDeployment };
    });
    this.previews.delete(deploymentId);
    return result;
  }
}

module.exports = { DeploymentManager, normalizePreviewUrl };
