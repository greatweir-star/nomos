"use strict";

const { randomUUID } = require("node:crypto");

const FLOW_CATEGORIES = new Set(["value", "enabling", "supporting"]);
const REVIEW_MODES = new Set(["carbon", "silicon", "hybrid"]);
const RACI_ROLES = new Set(["R", "A", "C", "I"]);
const GATE_STATUSES = new Set(["pending", "passed", "failed", "returned"]);
const GATE_ACTIONS = new Set(["pass", "fail", "rework"]);

function nowIso() {
  return new Date().toISOString();
}

function stringList(value, limit = 24) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item == null ? "" : item).trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeRoleBindings(value, validRoleIds = null) {
  if (!Array.isArray(value)) return [];
  return value
    .map((binding) => {
      const roleId = String(binding?.roleId || "").trim();
      if (!roleId) return null;
      if (validRoleIds && !validRoleIds.has(roleId)) return null;
      const raciRole = String(binding?.raciRole || "R").trim().toUpperCase();
      return { roleId, raciRole: RACI_ROLES.has(raciRole) ? raciRole : "R" };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeGate(raw) {
  const gate = raw && typeof raw === "object" ? raw : {};
  const reviewMode = String(gate.reviewMode || "carbon").trim();
  return {
    entryConditions: String(gate.entryConditions || "").trim().slice(0, 1000),
    exitCriteria: String(gate.exitCriteria || "").trim().slice(0, 1000),
    reviewMode: REVIEW_MODES.has(reviewMode) ? reviewMode : "carbon",
    requiredRoles: stringList(gate.requiredRoles),
  };
}

function normalizeStage(raw, index, validRoleIds = null) {
  const name = String(raw?.name || "").trim();
  if (!name) throw new Error(`第 ${index + 1} 个阶段名称不能为空`);
  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id : `stage-${randomUUID().slice(0, 8)}`,
    name: name.slice(0, 120),
    order: index,
    description: String(raw?.description || "").trim().slice(0, 1000),
    gate: normalizeGate(raw?.gate),
    inputMaterials: stringList(raw?.inputMaterials),
    expectedOutputs: stringList(raw?.expectedOutputs),
    roleBindings: normalizeRoleBindings(raw?.roleBindings, validRoleIds),
  };
}

function normalizeStages(rawStages, validRoleIds = null) {
  if (!Array.isArray(rawStages)) return [];
  return rawStages.map((stage, index) => normalizeStage(stage, index, validRoleIds));
}

// Build a flow template from API input. validRoleIds (optional Set) filters out
// roleBindings that point at roles which no longer exist.
function createFlowTemplate(body, { validRoleIds = null } = {}) {
  const name = String(body?.name || "").trim();
  if (!name) throw new Error("流程名称不能为空");
  const category = String(body?.category || "value").trim();
  if (!FLOW_CATEGORIES.has(category)) throw new Error("流程分类无效，必须是价值流/使能流/支撑流之一");
  const now = nowIso();
  return {
    id: randomUUID(),
    name: name.slice(0, 120),
    description: String(body?.description || "").trim().slice(0, 2000),
    category,
    tags: stringList(body?.tags),
    isPreset: false,
    presetKey: null,
    stages: normalizeStages(body?.stages, validRoleIds),
    createdAt: now,
    updatedAt: now,
  };
}

// Apply a PATCH body to an existing template in place.
function applyFlowTemplatePatch(template, body, { validRoleIds = null } = {}) {
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw new Error("流程名称不能为空");
    template.name = name.slice(0, 120);
  }
  if (body.description !== undefined) template.description = String(body.description).trim().slice(0, 2000);
  if (body.category !== undefined) {
    const category = String(body.category).trim();
    if (!FLOW_CATEGORIES.has(category)) throw new Error("流程分类无效，必须是价值流/使能流/支撑流之一");
    template.category = category;
  }
  if (body.tags !== undefined) template.tags = stringList(body.tags);
  if (body.stages !== undefined) template.stages = normalizeStages(body.stages, validRoleIds);
  template.updatedAt = nowIso();
  return template;
}

// Ensure a template loaded from disk has every expected field (migration helper).
function normalizeFlowTemplate(raw) {
  const template = raw && typeof raw === "object" ? raw : {};
  template.id = typeof template.id === "string" && template.id ? template.id : randomUUID();
  template.name = String(template.name || "未命名流程").trim();
  template.description = String(template.description || "").trim();
  template.category = FLOW_CATEGORIES.has(template.category) ? template.category : "value";
  template.tags = stringList(template.tags);
  template.isPreset = Boolean(template.isPreset);
  template.presetKey = typeof template.presetKey === "string" ? template.presetKey : null;
  template.stages = Array.isArray(template.stages)
    ? template.stages.map((stage, index) => ({
        id: typeof stage?.id === "string" && stage.id ? stage.id : `stage-${randomUUID().slice(0, 8)}`,
        name: String(stage?.name || `阶段 ${index + 1}`).trim(),
        order: index,
        description: String(stage?.description || "").trim(),
        gate: normalizeGate(stage?.gate),
        inputMaterials: stringList(stage?.inputMaterials),
        expectedOutputs: stringList(stage?.expectedOutputs),
        roleBindings: normalizeRoleBindings(stage?.roleBindings),
      }))
    : [];
  template.createdAt = template.createdAt || nowIso();
  template.updatedAt = template.updatedAt || template.createdAt;
  return template;
}

// Instantiate per-project flow stages from a template. Each project stage tracks
// its own gate state independently of the template.
function instantiateFlowStages(template) {
  return template.stages.map((stage) => ({
    id: `flowstage-${randomUUID().slice(0, 8)}`,
    stageTemplateId: stage.id,
    name: stage.name,
    order: stage.order,
    reviewMode: stage.gate.reviewMode,
    requiredRoles: [...stage.gate.requiredRoles],
    gateStatus: "pending",
    gateReview: null,
  }));
}

function ensureProjectFlowFields(project) {
  if (!Object.prototype.hasOwnProperty.call(project, "flowTemplateId")) project.flowTemplateId = null;
  if (!Array.isArray(project.flowStages)) project.flowStages = [];
  project.flowStages.forEach((stage, index) => {
    if (typeof stage.order !== "number") stage.order = index;
    if (!GATE_STATUSES.has(stage.gateStatus)) stage.gateStatus = "pending";
    if (stage.gateReview === undefined) stage.gateReview = null;
  });
  return project;
}

function bindProjectFlow(project, template) {
  ensureProjectFlowFields(project);
  project.flowTemplateId = template.id;
  project.flowStages = instantiateFlowStages(template);
  project.updatedAt = nowIso();
  return project;
}

function unbindProjectFlow(project) {
  ensureProjectFlowFields(project);
  project.flowTemplateId = null;
  project.flowStages = [];
  project.updatedAt = nowIso();
  return project;
}

// The first flow stage that has not yet passed; null when every gate passed.
function currentFlowStage(project) {
  ensureProjectFlowFields(project);
  return [...project.flowStages]
    .sort((a, b) => a.order - b.order)
    .find((stage) => stage.gateStatus !== "passed") || null;
}

// Gate review state machine.
//   pass   -> 当前阶段通过，进入下一阶段
//   fail   -> 不通过，停留在当前阶段（需重新提交评审）
//   rework -> 需返工，回退到指定阶段（targetStageId）
function reviewGate(project, { flowStageId, action, reviewer = "", reviewerType = "carbon", comment = "", targetStageId = null }) {
  ensureProjectFlowFields(project);
  if (!project.flowTemplateId || project.flowStages.length === 0) {
    throw new Error("项目未绑定流程模板，无法进行关口评审");
  }
  const normalizedAction = String(action || "").trim();
  if (!GATE_ACTIONS.has(normalizedAction)) throw new Error("评审动作无效，必须是 pass/fail/rework 之一");

  const stage = project.flowStages.find((item) => item.id === flowStageId);
  if (!stage) throw new Error("流程阶段不存在");

  const current = currentFlowStage(project);
  if (!current) throw new Error("流程已全部通过，无需再评审");
  if (current.id !== stage.id) throw new Error("只能评审当前流程阶段");

  const review = {
    reviewer: String(reviewer || "").trim().slice(0, 120),
    reviewerType: REVIEW_MODES.has(String(reviewerType)) ? String(reviewerType) : "carbon",
    action: normalizedAction,
    comment: String(comment || "").trim().slice(0, 2000),
    reviewedAt: nowIso(),
  };

  if (normalizedAction === "pass") {
    stage.gateStatus = "passed";
    stage.gateReview = review;
  } else if (normalizedAction === "fail") {
    stage.gateStatus = "failed";
    stage.gateReview = review;
  } else {
    // rework: 回退到指定阶段（默认回退到当前阶段）
    const target = targetStageId
      ? project.flowStages.find((item) => item.id === targetStageId)
      : stage;
    if (!target) throw new Error("返工目标阶段不存在");
    if (target.order > stage.order) throw new Error("只能返工到当前阶段或上游阶段");
    for (const item of project.flowStages) {
      if (item.order > target.order) {
        item.gateStatus = "pending";
        item.gateReview = null;
      }
    }
    target.gateStatus = "returned";
    target.gateReview = review;
  }

  project.updatedAt = nowIso();
  return {
    project,
    stage,
    review,
    currentFlowStageId: currentFlowStage(project)?.id || null,
    completed: currentFlowStage(project) === null,
  };
}

function flowProgress(project) {
  ensureProjectFlowFields(project);
  const total = project.flowStages.length;
  const passed = project.flowStages.filter((stage) => stage.gateStatus === "passed").length;
  return {
    flowTemplateId: project.flowTemplateId || null,
    total,
    passed,
    currentFlowStageId: currentFlowStage(project)?.id || null,
    completed: total > 0 && passed === total,
  };
}

// Three ready-to-use preset templates (LTC / IPD / ITR 轻量版).
function presetFlowTemplates() {
  const now = nowIso();
  const build = (presetKey, name, description, category, stages) => ({
    id: randomUUID(),
    name,
    description,
    category,
    tags: ["预设", "轻量版"],
    isPreset: true,
    presetKey,
    stages: stages.map((stage, index) => ({
      id: `stage-${randomUUID().slice(0, 8)}`,
      order: index,
      name: stage.name,
      description: stage.description,
      gate: normalizeGate(stage.gate),
      inputMaterials: stage.inputMaterials || [],
      expectedOutputs: stage.expectedOutputs || [],
      roleBindings: [],
    })),
    createdAt: now,
    updatedAt: now,
  });

  return [
    build("ltc-lite", "LTC 轻量版", "从线索到回款的销售价值流，适合中小企业销售线标准化。", "value", [
      {
        name: "管理线索",
        description: "收集、清洗和分级潜在客户线索。",
        gate: { entryConditions: "已有可触达的潜在客户名单", exitCriteria: "线索完成分级并指派跟进人", reviewMode: "carbon", requiredRoles: ["销售/客户经理"] },
        inputMaterials: ["客户名单", "市场活动反馈"],
        expectedOutputs: ["分级线索表"],
      },
      {
        name: "管理机会点",
        description: "评估商机价值与可行性，决定是否立项跟进。",
        gate: { entryConditions: "线索已分级且有明确需求", exitCriteria: "商机立项评审通过", reviewMode: "hybrid", requiredRoles: ["销售/客户经理", "CEO/总经理"] },
        inputMaterials: ["分级线索表", "客户需求记录"],
        expectedOutputs: ["商机立项报告"],
      },
      {
        name: "管理合同执行",
        description: "合同签订与交付过程跟踪。",
        gate: { entryConditions: "商机已立项且报价确认", exitCriteria: "合同审批通过并签署", reviewMode: "carbon", requiredRoles: ["财务/法务"] },
        inputMaterials: ["商机立项报告", "报价方案"],
        expectedOutputs: ["已签署合同", "交付计划"],
      },
      {
        name: "开票回款",
        description: "按合同节点开票并跟踪回款。",
        gate: { entryConditions: "交付里程碑达成", exitCriteria: "回款确认到账", reviewMode: "carbon", requiredRoles: ["财务/法务"] },
        inputMaterials: ["已签署合同", "交付验收单"],
        expectedOutputs: ["开票记录", "回款确认"],
      },
    ]),
    build("ipd-lite", "IPD 轻量版", "从概念到发布的产品开发价值流，适合产品研发线。", "value", [
      {
        name: "概念",
        description: "明确产品概念、目标用户和价值主张。",
        gate: { entryConditions: "有明确的市场或客户问题", exitCriteria: "概念评审通过", reviewMode: "carbon", requiredRoles: ["产品经理"] },
        inputMaterials: ["市场调研", "客户访谈"],
        expectedOutputs: ["产品概念文档"],
      },
      {
        name: "计划",
        description: "形成 PRD、版本计划与资源安排。",
        gate: { entryConditions: "概念已通过评审", exitCriteria: "PRD 与计划评审通过", reviewMode: "hybrid", requiredRoles: ["产品经理", "项目经理"] },
        inputMaterials: ["产品概念文档"],
        expectedOutputs: ["PRD", "版本计划"],
      },
      {
        name: "开发",
        description: "按 PRD 完成功能开发。",
        gate: { entryConditions: "PRD 已确认", exitCriteria: "开发完成并自测通过", reviewMode: "silicon", requiredRoles: ["研发工程师"] },
        inputMaterials: ["PRD", "技术方案"],
        expectedOutputs: ["可运行版本"],
      },
      {
        name: "验证",
        description: "测试、走查与问题回流。",
        gate: { entryConditions: "开发完成", exitCriteria: "测试通过、缺陷收敛", reviewMode: "hybrid", requiredRoles: ["项目经理"] },
        inputMaterials: ["可运行版本", "测试用例"],
        expectedOutputs: ["测试报告"],
      },
      {
        name: "发布",
        description: "生成预览、确认后正式发布。",
        gate: { entryConditions: "测试通过", exitCriteria: "发布验收通过", reviewMode: "carbon", requiredRoles: ["产品经理"] },
        inputMaterials: ["测试报告", "发布说明"],
        expectedOutputs: ["发布版本", "发布说明"],
      },
    ]),
    build("itr-lite", "ITR 轻量版", "从问题到解决的客户支撑流，适合售后与运维。", "supporting", [
      {
        name: "受理问题",
        description: "登记客户问题并初步分类。",
        gate: { entryConditions: "收到客户问题反馈", exitCriteria: "问题完成登记与分级", reviewMode: "silicon", requiredRoles: ["智能体管理员"] },
        inputMaterials: ["客户反馈"],
        expectedOutputs: ["问题工单"],
      },
      {
        name: "定位分析",
        description: "复现问题、定位根因。",
        gate: { entryConditions: "问题已登记", exitCriteria: "根因明确", reviewMode: "hybrid", requiredRoles: ["研发工程师"] },
        inputMaterials: ["问题工单", "运行日志"],
        expectedOutputs: ["根因分析"],
      },
      {
        name: "解决修复",
        description: "实施修复或提供解决方案。",
        gate: { entryConditions: "根因已确认", exitCriteria: "修复方案验证通过", reviewMode: "carbon", requiredRoles: ["研发工程师"] },
        inputMaterials: ["根因分析"],
        expectedOutputs: ["修复记录"],
      },
      {
        name: "回访闭环",
        description: "向客户确认解决效果并归档。",
        gate: { entryConditions: "修复已上线", exitCriteria: "客户确认问题解决", reviewMode: "carbon", requiredRoles: ["销售/客户经理"] },
        inputMaterials: ["修复记录"],
        expectedOutputs: ["闭环确认", "经验沉淀"],
      },
    ]),
  ];
}

module.exports = {
  FLOW_CATEGORIES,
  REVIEW_MODES,
  RACI_ROLES,
  GATE_STATUSES,
  GATE_ACTIONS,
  createFlowTemplate,
  applyFlowTemplatePatch,
  normalizeFlowTemplate,
  instantiateFlowStages,
  ensureProjectFlowFields,
  bindProjectFlow,
  unbindProjectFlow,
  currentFlowStage,
  reviewGate,
  flowProgress,
  presetFlowTemplates,
};
