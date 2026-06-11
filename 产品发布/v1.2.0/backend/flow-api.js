"use strict";

const { randomUUID } = require("node:crypto");

function nowIso() {
  return new Date().toISOString();
}

// ─── Flow Template ──────────────────────────────────────────────

function findFlowTemplate(data, id) {
  return data.flowTemplates.find((t) => t.id === id);
}

function findFlowInstance(data, id) {
  return data.flowInstances.find((i) => i.id === id);
}

function flowInstancesUsingTemplate(data, templateId) {
  return data.flowInstances
    .filter((i) => i.templateId === templateId)
    .map((i) => ({ id: i.id, projectId: i.projectId, status: i.status }));
}

function validateStageList(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return "流程模板至少包含 1 个阶段";
  }
  for (const stage of stages) {
    if (!String(stage.name || "").trim()) return "阶段名称不能为空";
  }
  const orders = stages.map((s) => Number(s.order || 0));
  const sorted = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return `阶段顺序应为 1 到 ${stages.length} 的连续整数`;
  }
  return null;
}

function normalizeGate(gate) {
  const g = gate && typeof gate === "object" ? gate : {};
  return {
    enabled: Boolean(g.enabled),
    entryConditions: Array.isArray(g.entryConditions) ? g.entryConditions.filter((c) => typeof c === "string") : [],
    exitCriteria: Array.isArray(g.exitCriteria) ? g.exitCriteria.filter((c) => typeof c === "string") : [],
  };
}

function normalizeStage(stage) {
  return {
    id: stage.id || randomUUID(),
    name: String(stage.name || "").trim(),
    order: Math.max(1, Number(stage.order) || 1),
    description: String(stage.description || "").trim(),
    gate: normalizeGate(stage.gate),
    roleResponsibilities: Array.isArray(stage.roleResponsibilities)
      ? stage.roleResponsibilities
          .filter((r) => typeof r.roleId === "string")
          .map((r) => ({ roleId: r.roleId, raciRole: ["R", "A", "C", "I"].includes(r.raciRole) ? r.raciRole : "R" }))
      : [],
    inputs: Array.isArray(stage.inputs) ? stage.inputs.filter((s) => typeof s === "string") : [],
    outputs: Array.isArray(stage.outputs) ? stage.outputs.filter((s) => typeof s === "string") : [],
  };
}

function createFlowTemplate(data, body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("流程模板名称不能为空");
  if (data.flowTemplates.some((t) => t.name === name)) throw new Error("同名流程模板已存在");

  const stages = Array.isArray(body.stages) ? body.stages.map(normalizeStage) : [];
  const error = validateStageList(stages);
  if (error) throw new Error(error);

  const template = {
    id: randomUUID(),
    name,
    category: ["value_stream", "enabling_stream", "supporting_stream"].includes(body.category) ? body.category : "value_stream",
    description: String(body.description || "").trim(),
    isDefault: false,
    stages,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.flowTemplates.push(template);
  return template;
}

function updateFlowTemplate(data, id, body) {
  const template = findFlowTemplate(data, id);
  if (!template) return null;

  if (body.name !== undefined) {
    const newName = String(body.name).trim();
    if (newName && newName !== template.name) {
      if (data.flowTemplates.some((t) => t.id !== id && t.name === newName)) {
        throw new Error("同名流程模板已存在");
      }
      template.name = newName;
    }
  }
  if (body.category !== undefined) {
    if (["value_stream", "enabling_stream", "supporting_stream"].includes(body.category)) {
      template.category = body.category;
    }
  }
  if (body.description !== undefined) template.description = String(body.description).trim();
  if (body.stages !== undefined) {
    const stages = Array.isArray(body.stages) ? body.stages.map(normalizeStage) : [];
    const error = validateStageList(stages);
    if (error) throw new Error(error);
    template.stages = stages;
  }
  template.updatedAt = nowIso();
  return template;
}

function deleteFlowTemplate(data, id) {
  const template = findFlowTemplate(data, id);
  if (!template) return null;
  const usages = flowInstancesUsingTemplate(data, id);
  if (usages.length > 0) return { _error: "流程模板已被项目使用", _usages: usages };
  const index = data.flowTemplates.findIndex((t) => t.id === id);
  if (index !== -1) data.flowTemplates.splice(index, 1);
  return { deleted: true };
}

function cloneFlowTemplate(data, id) {
  const template = findFlowTemplate(data, id);
  if (!template) return null;
  const cloned = {
    id: randomUUID(),
    name: `${template.name} 副本`,
    category: template.category,
    description: template.description,
    isDefault: false,
    stages: template.stages.map((s) => ({
      ...s,
      id: randomUUID(),
    })),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.flowTemplates.push(cloned);
  return cloned;
}

// ─── Flow Instance ──────────────────────────────────────────────

function createInstanceStage(templateStage) {
  return {
    id: randomUUID(),
    templateStageId: templateStage.id,
    name: templateStage.name,
    order: templateStage.order,
    description: templateStage.description,
    status: "pending",
    roleResponsibilities: JSON.parse(JSON.stringify(templateStage.roleResponsibilities)),
    inputs: [...templateStage.inputs],
    outputs: [...templateStage.outputs],
    gate: {
      enabled: templateStage.gate.enabled,
      entryConditions: [...templateStage.gate.entryConditions],
      exitCriteria: [...templateStage.gate.exitCriteria],
      review: {
        status: "pending",
        reviewer: null,
        comment: null,
        reviewedAt: null,
      },
    },
    startedAt: null,
    completedAt: null,
    blockedReason: "",
    attempt: 1,
  };
}

function createFlowInstance(data, projectId, templateId) {
  const template = findFlowTemplate(data, templateId);
  if (!template) throw new Error("流程模板不存在");
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("项目不存在");

  const stages = template.stages.map(createInstanceStage);
  if (stages.length > 0) {
    stages[0].status = "in_progress";
    stages[0].startedAt = nowIso();
  }

  const instance = {
    id: randomUUID(),
    projectId,
    templateId,
    templateName: template.name,
    status: "running",
    currentStageId: stages.length > 0 ? stages[0].id : null,
    stages,
    startedAt: nowIso(),
    completedAt: null,
    updatedAt: nowIso(),
  };
  data.flowInstances.push(instance);
  project.flowInstanceId = instance.id;
  return instance;
}

function getCurrentStage(instance) {
  return instance.stages.find((s) => s.id === instance.currentStageId);
}

function advanceFlowInstance(data, instanceId) {
  const instance = findFlowInstance(data, instanceId);
  if (!instance) return null;
  if (!["running", "paused"].includes(instance.status)) {
    throw new Error(`流程实例状态为 ${instance.status}，不可推进`);
  }

  const current = getCurrentStage(instance);
  if (!current) throw new Error("当前阶段不存在");
  if (current.status !== "review_pending") throw new Error("当前阶段尚未完成或未通过关口评审");

  // Mark current stage done
  current.status = "done";
  current.completedAt = nowIso();
  current.gate.review.status = "approved";

  // Find next stage
  const next = instance.stages.find((s) => s.order === current.order + 1);
  if (next) {
    next.status = "in_progress";
    next.startedAt = nowIso();
    instance.currentStageId = next.id;
    instance.status = "running";
  } else {
    instance.currentStageId = null;
    instance.status = "completed";
    instance.completedAt = nowIso();
  }
  instance.updatedAt = nowIso();
  return instance;
}

function reviewGate(data, instanceId, { action, comment, reviewer = "local-user" }) {
  const instance = findFlowInstance(data, instanceId);
  if (!instance) return null;
  const current = getCurrentStage(instance);
  if (!current) throw new Error("当前阶段不存在");
  if (current.status !== "review_pending") throw new Error("当前阶段不在评审状态");
  if (!["approve", "reject"].includes(action)) throw new Error("评审操作只能是 approve 或 reject");

  current.gate.review = {
    status: action === "approve" ? "approved" : "rejected",
    reviewer,
    comment: String(comment || "").trim() || null,
    reviewedAt: nowIso(),
  };

  if (action === "approve") {
    // Gate approved, mark stage ready to advance
    current.status = "review_pending"; // stays review_pending until advance API called
  } else {
    current.status = "blocked";
    current.blockedReason = String(comment || "").trim() || "关口评审未通过";
  }
  instance.updatedAt = nowIso();
  return instance;
}

function returnStage(data, instanceId, { reason }) {
  const instance = findFlowInstance(data, instanceId);
  if (!instance) return null;
  const current = getCurrentStage(instance);
  if (!current) throw new Error("当前阶段不存在");
  if (!["review_pending", "blocked", "done"].includes(current.status)) {
    throw new Error("当前阶段不可退回");
  }
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) throw new Error("请填写退回原因");

  current.status = "in_progress";
  current.blockedReason = normalizedReason;
  current.attempt += 1;
  current.completedAt = null;
  current.gate.review = {
    status: "pending",
    reviewer: null,
    comment: null,
    reviewedAt: null,
  };
  instance.updatedAt = nowIso();
  return instance;
}

function submitStageReceiptToFlow(data, { instanceId, stageId, status, summary, progress }) {
  const instance = findFlowInstance(data, instanceId);
  if (!instance) throw new Error("流程实例不存在");
  const stage = instance.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error("阶段不存在");
  if (stage.status !== "in_progress") throw new Error("当前阶段不在执行中");

  const normalizedStatus = String(status || "").trim();
  if (normalizedStatus === "progress") {
    stage.status = "in_progress";
  } else if (normalizedStatus === "completed") {
    if (stage.gate.enabled) {
      stage.status = "review_pending";
    } else {
      stage.status = "done";
      stage.completedAt = nowIso();
      // Auto-advance if no gate
      const next = instance.stages.find((s) => s.order === stage.order + 1);
      if (next) {
        next.status = "in_progress";
        next.startedAt = nowIso();
        instance.currentStageId = next.id;
      } else {
        instance.currentStageId = null;
        instance.status = "completed";
        instance.completedAt = nowIso();
      }
    }
  } else if (normalizedStatus === "failed") {
    stage.status = "blocked";
    stage.blockedReason = String(summary || "").trim() || "阶段执行失败";
  }
  instance.updatedAt = nowIso();
  return { instance, stage };
}

function updateFlowInstanceStage(data, instanceId, stageId, body) {
  const instance = findFlowInstance(data, instanceId);
  if (!instance) return null;
  const stage = instance.stages.find((s) => s.id === stageId);
  if (!stage) return null;

  if (body.status !== undefined) {
    const validStatuses = ["pending", "in_progress", "review_pending", "done", "blocked"];
    if (validStatuses.includes(body.status)) stage.status = body.status;
  }
  if (body.blockedReason !== undefined) stage.blockedReason = String(body.blockedReason || "").trim();
  instance.updatedAt = nowIso();
  return { instance, stage };
}

function updateFlowInstance(data, id, body) {
  const instance = findFlowInstance(data, id);
  if (!instance) return null;
  if (body.status !== undefined) {
    const validStatuses = ["pending", "running", "completed", "failed", "paused"];
    if (validStatuses.includes(body.status)) instance.status = body.status;
  }
  instance.updatedAt = nowIso();
  return instance;
}

function deleteFlowInstance(data, id) {
  const instance = findFlowInstance(data, id);
  if (!instance) return null;
  const project = data.projects.find((p) => p.id === instance.projectId);
  if (project) project.flowInstanceId = null;
  const index = data.flowInstances.findIndex((i) => i.id === id);
  if (index !== -1) data.flowInstances.splice(index, 1);
  return { deleted: true };
}

module.exports = {
  findFlowTemplate,
  findFlowInstance,
  createFlowTemplate,
  updateFlowTemplate,
  deleteFlowTemplate,
  cloneFlowTemplate,
  createFlowInstance,
  advanceFlowInstance,
  reviewGate,
  returnStage,
  submitStageReceiptToFlow,
  updateFlowInstanceStage,
  updateFlowInstance,
  deleteFlowInstance,
  flowInstancesUsingTemplate,
};
