"use strict";

const { randomUUID } = require("node:crypto");
const { receiptFromExecution } = require("./agent-receipt");

const REVIEW_STAGE_KEYS = new Set(["design", "deploy"]);
const ACTIVE_STAGE_STATUSES = new Set(["in_progress", "review_pending", "blocked"]);
const RECEIPT_STATUSES = new Set(["progress", "completed", "failed", "cancelled"]);

function nowIso() {
  return new Date().toISOString();
}

function clampProgress(value, fallback = 0) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return fallback;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function appendMessage(project, { authorId, authorName, authorType, text }) {
  const message = {
    id: randomUUID(),
    authorId,
    authorName,
    authorType,
    text,
    createdAt: nowIso(),
  };
  project.messages.push(message);
  project.updatedAt = message.createdAt;
  return message;
}

function stageByKey(project, stageKey) {
  return project.stages.find((stage) => stage.key === stageKey);
}

function ensureProjectWorkflow(project) {
  project.assets = Array.isArray(project.assets) ? project.assets : [];
  project.messages = Array.isArray(project.messages) ? project.messages : [];
  project.checkpoints = Array.isArray(project.checkpoints) ? project.checkpoints : [];
  project.handoffs = Array.isArray(project.handoffs) ? project.handoffs : [];
  project.taskReceipts = Array.isArray(project.taskReceipts) ? project.taskReceipts : [];
  project.workflowTasks = Array.isArray(project.workflowTasks) ? project.workflowTasks : [];
  project.stages = Array.isArray(project.stages) ? project.stages : [];

  for (const stage of project.stages) {
    stage.deliverableIds = (Array.isArray(stage.deliverableIds) ? stage.deliverableIds : []).filter((assetId) =>
      project.assets.some((asset) => asset.id === assetId),
    );
    stage.attempt = Math.max(1, Number(stage.attempt || 1));
    for (const asset of project.assets.filter((item) => item.stageKey === stage.key)) {
      if (!stage.deliverableIds.includes(asset.id)) stage.deliverableIds.push(asset.id);
    }
  }
  for (const checkpoint of project.checkpoints) {
    const stage = stageByKey(project, checkpoint.stageKey);
    if (checkpoint.status === "pending" && stage?.status !== "review_pending" && !checkpoint.activatedAt) {
      checkpoint.status = "waiting";
    }
  }

  const activeStage = project.stages.find((stage) => ACTIVE_STAGE_STATUSES.has(stage.status));
  const workflowStatus = activeStage?.status === "blocked"
    ? "blocked"
    : activeStage?.status === "review_pending"
      ? "review_pending"
      : activeStage
        ? "active"
        : project.stages.length > 0 && project.stages.every((stage) => stage.status === "done")
          ? "completed"
          : "idle";
  project.workflow = {
    status: workflowStatus,
    currentStageKey: activeStage?.key || null,
    updatedAt: project.workflow?.updatedAt || project.updatedAt || nowIso(),
  };
  if (activeStage) ensureStageTask(project, activeStage);
  return project;
}

function inputAssetIdsForStage(project, stage) {
  const stageIndex = project.stages.findIndex((item) => item.key === stage.key);
  return project.stages
    .slice(0, Math.max(0, stageIndex))
    .flatMap((item) => item.deliverableIds || [])
    .filter((assetId, index, values) => values.indexOf(assetId) === index);
}

function ensureStageTask(project, stage, { reason = "" } = {}) {
  const existing = project.workflowTasks.find(
    (task) => task.stageKey === stage.key && task.attempt === stage.attempt && !["completed", "superseded"].includes(task.status),
  );
  if (existing) {
    stage.activeTaskId = existing.id;
    return existing;
  }
  const task = {
    id: randomUUID(),
    stageKey: stage.key,
    stageId: stage.id,
    attempt: stage.attempt,
    ownerId: stage.ownerId,
    ownerName: stage.ownerName,
    ownerType: stage.ownerType,
    status: "queued",
    instructions: stage.description,
    inputAssetIds: inputAssetIdsForStage(project, stage),
    reason: String(reason || "").trim(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  project.workflowTasks.unshift(task);
  project.workflowTasks = project.workflowTasks.slice(0, 200);
  stage.activeTaskId = task.id;
  return task;
}

function buildAgentTaskEnvelope(project, stageKey, note = "") {
  ensureProjectWorkflow(project);
  const stage = stageByKey(project, stageKey);
  if (!stage) throw new Error("交付阶段不存在");
  if (!ACTIVE_STAGE_STATUSES.has(stage.status)) throw new Error("当前阶段还不能派发任务");
  const task = ensureStageTask(project, stage);
  const inputAssets = (task.inputAssetIds || [])
    .map((assetId) => project.assets.find((asset) => asset.id === assetId)?.name)
    .filter(Boolean);
  return {
    projectId: project.id,
    projectTitle: project.title,
    projectGoal: project.goal,
    stageKey: stage.key,
    stageTitle: stage.title,
    attempt: stage.attempt,
    taskId: task.id,
    ownerId: stage.ownerId,
    ownerName: stage.ownerName,
    instructions: task.instructions,
    inputAssetIds: task.inputAssetIds,
    inputAssets,
    note: String(note || "").trim(),
  };
}

function markTaskDispatched(project, { taskId, agentId, agentName, adapterType, externalRef = null, idempotencyKey = null }) {
  ensureProjectWorkflow(project);
  const task = project.workflowTasks.find((item) => item.id === taskId);
  if (!task) throw new Error("任务信封不存在");
  if (idempotencyKey && task.dispatchIdempotencyKey === idempotencyKey) return task;
  if (task.dispatchedTo) throw new Error(`当前任务已经派发给 ${task.dispatchedAgentName || task.dispatchedTo}`);
  const dispatchedAt = nowIso();
  task.status = "dispatched";
  task.dispatchedTo = agentId;
  task.dispatchedAgentName = agentName || agentId;
  task.dispatchAdapterType = adapterType || "unknown";
  task.externalRef = externalRef;
  task.dispatchIdempotencyKey = idempotencyKey;
  task.dispatchedAt = dispatchedAt;
  task.updatedAt = dispatchedAt;
  return task;
}

function ensurePendingCheckpoint(project, stage) {
  const existing = project.checkpoints.find(
    (checkpoint) => checkpoint.stageKey === stage.key && checkpoint.status === "pending",
  );
  if (existing) return existing;
  const waiting = project.checkpoints.find(
    (checkpoint) => checkpoint.stageKey === stage.key && checkpoint.status === "waiting",
  );
  if (waiting) {
    waiting.status = "pending";
    waiting.createdAt = waiting.createdAt || nowIso();
    waiting.activatedAt = nowIso();
    return waiting;
  }
  const checkpoint = {
    id: `checkpoint-${randomUUID().slice(0, 8)}`,
    stageKey: stage.key,
    title: stage.key === "deploy" ? "预览发布完成后，需要你做最终确认。" : `${stage.title}完成后，需要你做一次确认。`,
    description:
      stage.key === "deploy"
        ? "请检查预览地址和发布说明。批准后项目完成；如有问题，可以退回继续调整。"
        : "你可以直接批准，也可以补充修改意见，再让责任 Agent 继续调整。",
    status: "pending",
    createdAt: nowIso(),
    activatedAt: nowIso(),
  };
  project.checkpoints.push(checkpoint);
  return checkpoint;
}

function recordHandoff(project, { fromStageKey = null, toStageKey = null, taskId = null, type = "handoff", reason = "" }) {
  const handoff = {
    id: randomUUID(),
    fromStageKey,
    toStageKey,
    taskId,
    type,
    reason: String(reason || "").trim(),
    createdAt: nowIso(),
  };
  project.handoffs.unshift(handoff);
  project.handoffs = project.handoffs.slice(0, 100);
  return handoff;
}

function activateStage(project, stage, { fromStageKey = null, reason = "", type = "handoff" } = {}) {
  if (!stage) {
    project.workflow = { status: "completed", currentStageKey: null, updatedAt: nowIso() };
    appendMessage(project, {
      authorId: "project-steward",
      authorName: "项目总管",
      authorType: "cloud",
      text: "全部交付阶段已经完成，项目等待你的最终确认。",
    });
    return null;
  }

  stage.status = "in_progress";
  stage.progress = Math.max(12, clampProgress(stage.progress));
  stage.startedAt = stage.startedAt || nowIso();
  stage.blockedReason = "";
  project.workflow = { status: "active", currentStageKey: stage.key, updatedAt: nowIso() };
  const task = ensureStageTask(project, stage, { reason });
  recordHandoff(project, { fromStageKey, toStageKey: stage.key, taskId: task.id, type, reason });
  appendMessage(project, {
    authorId: "project-steward",
    authorName: "项目总管",
    authorType: "cloud",
    text: `${fromStageKey ? "上一阶段已验收，" : ""}正在把任务派发给${stage.ownerName}：${stage.title}。`,
  });
  return stage;
}

function moveToNextStage(project, stage, reason = "") {
  const index = project.stages.findIndex((item) => item.key === stage.key);
  return activateStage(project, project.stages[index + 1], {
    fromStageKey: stage.key,
    reason,
  });
}

function markStageDone(project, stage, summary = "") {
  stage.status = "done";
  stage.progress = 100;
  stage.completedAt = nowIso();
  stage.blockedReason = "";
  const task = project.workflowTasks.find((item) => item.id === stage.activeTaskId);
  if (task) {
    task.status = "completed";
    task.completedAt = nowIso();
    task.updatedAt = task.completedAt;
  }
  if (summary) stage.summary = String(summary).trim();
}

function addStageDeliverable(project, { stageKey, type = "FILE", name, url = "", summary = "" }) {
  ensureProjectWorkflow(project);
  const stage = stageByKey(project, stageKey);
  if (!stage) throw new Error("交付阶段不存在");
  const normalizedName = String(name || "").trim();
  if (!normalizedName) throw new Error("交付物名称不能为空");
  const asset = {
    id: randomUUID(),
    stageKey,
    type: String(type || "FILE").trim().slice(0, 12).toUpperCase() || "FILE",
    name: normalizedName.slice(0, 160),
    url: String(url || "").trim().slice(0, 1000),
    summary: String(summary || "").trim().slice(0, 1000),
    source: "workflow",
    createdAt: nowIso(),
  };
  project.assets.push(asset);
  if (!stage.deliverableIds.includes(asset.id)) stage.deliverableIds.push(asset.id);
  project.updatedAt = asset.createdAt;
  return asset;
}

function createReceipt(project, { stage, status, summary, progress, agentId, agentName, agentType, executionId, source, rawSummary, workspaceChanges, testReport }) {
  const task = ensureStageTask(project, stage);
  const receipt = {
    id: randomUUID(),
    stageKey: stage.key,
    status,
    summary: String(summary || "").trim().slice(0, 2000),
    progress: clampProgress(progress, stage.progress),
    agentId: String(agentId || stage.ownerId),
    agentName: String(agentName || stage.ownerName),
    agentType: String(agentType || stage.ownerType),
    executionId: executionId || null,
    source: String(source || "manual"),
    rawSummary: String(rawSummary || "").trim().slice(0, 2000),
    workspaceChanges: Array.isArray(workspaceChanges) ? workspaceChanges.slice(0, 100) : [],
    testReport: testReport && typeof testReport === "object" ? testReport : null,
    taskId: task.id,
    createdAt: nowIso(),
  };
  project.taskReceipts.unshift(receipt);
  project.taskReceipts = project.taskReceipts.slice(0, 200);
  stage.lastReceiptId = receipt.id;
  task.lastReceiptId = receipt.id;
  task.updatedAt = receipt.createdAt;
  return receipt;
}

function submitStageReceipt(project, body) {
  ensureProjectWorkflow(project);
  const stage = stageByKey(project, body.stageKey);
  if (!stage) throw new Error("交付阶段不存在");
  const status = String(body.status || "").trim();
  if (!RECEIPT_STATUSES.has(status)) throw new Error("任务回执状态无效");
  if (!["in_progress", "review_pending", "blocked"].includes(stage.status)) {
    throw new Error("当前阶段无法接收任务回执");
  }

  const deliverables = Array.isArray(body.deliverables) ? body.deliverables : [];
  const createdDeliverables = deliverables.map((deliverable) =>
    addStageDeliverable(project, { ...deliverable, stageKey: stage.key }),
  );
  const receipt = createReceipt(project, { ...body, stage });
  const task = project.workflowTasks.find((item) => item.id === receipt.taskId);

  if (status === "progress") {
    stage.status = "in_progress";
    stage.progress = Math.min(99, Math.max(1, receipt.progress));
    task.status = "running";
    project.workflow = { status: "active", currentStageKey: stage.key, updatedAt: nowIso() };
  }

  if (status === "completed") {
    stage.progress = 100;
    if (REVIEW_STAGE_KEYS.has(stage.key)) {
      stage.status = "review_pending";
      stage.summary = receipt.summary;
      task.status = "review_pending";
      project.workflow = { status: "review_pending", currentStageKey: stage.key, updatedAt: nowIso() };
      ensurePendingCheckpoint(project, stage);
    } else {
      markStageDone(project, stage, receipt.summary);
      moveToNextStage(project, stage, receipt.summary);
    }
  }

  if (status === "failed") {
    stage.status = "blocked";
    task.status = "blocked";
    stage.blockedReason = receipt.summary || "任务执行失败，请检查回执。";
    const index = project.stages.findIndex((item) => item.key === stage.key);
    stage.suggestedReturnStageKey = project.stages[Math.max(0, index - 1)]?.key || stage.key;
    project.workflow = { status: "blocked", currentStageKey: stage.key, updatedAt: nowIso() };
    recordHandoff(project, {
      fromStageKey: stage.key,
      toStageKey: stage.suggestedReturnStageKey,
      taskId: task.id,
      type: "failure",
      reason: stage.blockedReason,
    });
  }

  if (status === "cancelled") {
    stage.status = "blocked";
    task.status = "blocked";
    stage.blockedReason = receipt.summary || "任务已取消，等待重新派发。";
    project.workflow = { status: "blocked", currentStageKey: stage.key, updatedAt: nowIso() };
  }

  appendMessage(project, {
    authorId: receipt.agentId,
    authorName: receipt.agentName,
    authorType: receipt.agentType,
    text:
      status === "completed"
        ? `${stage.title}已提交成果：${receipt.summary || "等待进入下一步。"}`
        : status === "failed"
          ? `${stage.title}执行失败：${receipt.summary || "请查看任务回执。"}`
          : status === "cancelled"
            ? `${stage.title}已取消：${receipt.summary || "等待重新派发。"}`
            : `${stage.title}进度更新至 ${stage.progress}%：${receipt.summary || "任务正在进行。"}`
  });
  project.updatedAt = nowIso();
  return { project, stage, receipt, deliverables: createdDeliverables };
}

function returnStageForRevision(project, { fromStageKey, targetStageKey, reason }) {
  ensureProjectWorkflow(project);
  const source = stageByKey(project, fromStageKey || project.workflow.currentStageKey);
  const target = stageByKey(project, targetStageKey);
  if (!source || !target) throw new Error("返工阶段不存在");
  const sourceIndex = project.stages.findIndex((stage) => stage.key === source.key);
  const targetIndex = project.stages.findIndex((stage) => stage.key === target.key);
  if (targetIndex > sourceIndex) throw new Error("只能退回当前阶段或上游阶段");
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) throw new Error("请填写返工原因");

  for (let index = targetIndex; index < project.stages.length; index += 1) {
    const stage = project.stages[index];
    stage.status = index === targetIndex ? "in_progress" : "waiting";
    stage.progress = index === targetIndex ? 12 : 0;
    stage.blockedReason = "";
    stage.suggestedReturnStageKey = null;
    if (index === targetIndex) {
      stage.attempt = Math.max(1, Number(stage.attempt || 1)) + 1;
      stage.startedAt = nowIso();
      stage.completedAt = null;
    }
  }
  const sourceTask = project.workflowTasks.find((task) => task.id === source.activeTaskId);
  if (sourceTask) {
    sourceTask.status = "superseded";
    sourceTask.updatedAt = nowIso();
  }
  for (const checkpoint of project.checkpoints) {
    if (checkpoint.status !== "pending") continue;
    const checkpointIndex = project.stages.findIndex((stage) => stage.key === checkpoint.stageKey);
    if (checkpointIndex >= targetIndex) checkpoint.status = "superseded";
  }
  project.workflow = { status: "active", currentStageKey: target.key, updatedAt: nowIso() };
  const task = ensureStageTask(project, target, { reason: normalizedReason });
  recordHandoff(project, {
    fromStageKey: source.key,
    toStageKey: target.key,
    taskId: task.id,
    type: "revision",
    reason: normalizedReason,
  });
  appendMessage(project, {
    authorId: "project-steward",
    authorName: "项目总管",
    authorType: "cloud",
    text: `${source.title}需要返工，已退回${target.ownerName}处理：${normalizedReason}`,
  });
  return { project, fromStage: source, targetStage: target };
}

function resolveCheckpoint(project, { checkpointId, action, note = "" }) {
  ensureProjectWorkflow(project);
  const checkpoint = project.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) return { missingCheckpoint: true };
  if (checkpoint.status !== "pending") throw new Error("验收点已经处理");
  const stage = stageByKey(project, checkpoint.stageKey);
  if (!stage) throw new Error("验收阶段不存在");
  const normalizedNote = String(note || "").trim();

  checkpoint.status = action === "reject" ? "revision_requested" : "approved";
  checkpoint.note = normalizedNote;
  checkpoint.resolvedAt = nowIso();
  appendMessage(project, {
    authorId: "local-user",
    authorName: "你",
    authorType: "user",
    text: checkpoint.status === "approved"
      ? `已批准人工验收点：${checkpoint.title}`
      : `已要求修改：${normalizedNote || checkpoint.title}`,
  });
  if (checkpoint.status === "approved") {
    markStageDone(project, stage, stage.summary);
    moveToNextStage(project, stage, normalizedNote);
  } else {
    returnStageForRevision(project, {
      fromStageKey: stage.key,
      targetStageKey: stage.key,
      reason: normalizedNote || "人工验收未通过，请继续调整。",
    });
  }
  return { project, checkpoint };
}

function manuallyAdvanceActiveStage(project) {
  ensureProjectWorkflow(project);
  const stage = project.stages.find((item) => ACTIVE_STAGE_STATUSES.has(item.status));
  if (!stage) return { project, completed: project.workflow.status === "completed" };
  for (const checkpoint of project.checkpoints) {
    if (checkpoint.stageKey === stage.key && checkpoint.status === "pending") {
      checkpoint.status = "approved";
      checkpoint.resolvedAt = nowIso();
      checkpoint.note = "通过手动推进完成验收";
    }
  }
  markStageDone(project, stage, stage.summary);
  const next = moveToNextStage(project, stage, "手动推进");
  return { project, completed: !next };
}

function recordExecutionReceipt(project, execution) {
  ensureProjectWorkflow(project);
  const stage = project.stages.find((item) => item.key === (execution.stageKey || "develop"));
  if (!stage || !["in_progress", "blocked"].includes(stage.status)) return null;
  const receipt = receiptFromExecution(execution);
  return submitStageReceipt(project, {
    stageKey: stage.key,
    ...receipt,
    agentId: execution.agentId,
    agentName: execution.agentName,
    agentType: "local",
    executionId: execution.id,
    source: execution.agentId,
  });
}

function workflowPayload(project) {
  ensureProjectWorkflow(project);
  return {
    workflow: project.workflow,
    stages: project.stages,
    checkpoints: project.checkpoints,
    handoffs: project.handoffs,
    taskReceipts: project.taskReceipts,
    tasks: project.workflowTasks,
    deliverables: project.assets.filter((asset) => asset.stageKey),
  };
}

module.exports = {
  addStageDeliverable,
  buildAgentTaskEnvelope,
  ensureProjectWorkflow,
  markTaskDispatched,
  manuallyAdvanceActiveStage,
  recordExecutionReceipt,
  resolveCheckpoint,
  returnStageForRevision,
  submitStageReceipt,
  workflowPayload,
};
