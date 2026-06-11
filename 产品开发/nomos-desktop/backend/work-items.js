"use strict";

const { randomUUID } = require("node:crypto");

const SOURCE_TYPES = new Set(["flow_stage", "legacy_workflow_task", "manual"]);
const WORK_ITEM_STATUSES = new Set([
  "todo",
  "ready",
  "in_progress",
  "waiting_dependency",
  "review_pending",
  "blocked",
  "done",
  "cancelled",
]);
const ASSIGNEE_TYPES = new Set(["employee", "agent", "role", "unassigned"]);
const FINISHED_STATUSES = new Set(["done", "cancelled"]);
const BLOCKING_STATUSES = new Set(["blocked", "waiting_dependency"]);
const LEGACY_STAGE_LABELS = {
  goal: "提出目标",
  design: "总管拆解",
  prd: "PRD",
  develop: "本地开发",
  test: "测试",
  deploy: "预览发布",
  acceptance: "人工验收",
};
const LEGACY_STATUS_MAP = {
  queued: "todo",
  dispatched: "in_progress",
  running: "in_progress",
  review_pending: "review_pending",
  blocked: "blocked",
  completed: "done",
  superseded: "cancelled",
  cancelled: "cancelled",
};

class WorkItemError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "WorkItemError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function trimString(value, max = 2000) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function uniqueStrings(value, limit = 200) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => trimString(item, 200)).filter(Boolean))].slice(0, limit);
}

function clampProgress(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeStatus(value, fallback = "todo") {
  const status = trimString(value, 40);
  if (WORK_ITEM_STATUSES.has(status)) return status;
  return fallback;
}

function normalizeActor(actor = {}) {
  const type = ["user", "employee", "agent", "system"].includes(actor.type) ? actor.type : "user";
  return {
    type,
    id: actor.id ? trimString(actor.id, 120) : null,
    name: trimString(actor.name || (type === "system" ? "Nomos System" : "Local User"), 120),
  };
}

function normalizeAssignee(raw = {}) {
  const type = ASSIGNEE_TYPES.has(raw.type) ? raw.type : "unassigned";
  if (type === "unassigned") return { type: "unassigned", id: null, name: null };
  const id = trimString(raw.id, 120) || null;
  const name = trimString(raw.name, 120) || null;
  return { type, id, name };
}

function assigneesEqual(left, right) {
  return (
    (left?.type || "unassigned") === (right?.type || "unassigned") &&
    (left?.id || null) === (right?.id || null) &&
    (left?.name || null) === (right?.name || null)
  );
}

function parseChecklist(text) {
  const content = String(text || "");
  const matches = [...content.matchAll(/^\s*[-*]\s+\[( |x|X)\]\s+/gm)];
  if (matches.length === 0) return { total: 0, completed: 0, source: null };
  return {
    total: matches.length,
    completed: matches.filter((match) => match[1].toLowerCase() === "x").length,
    source: "markdown",
  };
}

function normalizeChecklist(raw, description = "") {
  if (raw && typeof raw === "object" && Number(raw.total) > 0) {
    const total = Math.max(0, Math.round(Number(raw.total) || 0));
    return {
      total,
      completed: Math.max(0, Math.min(total, Math.round(Number(raw.completed) || 0))),
      source: raw.source === "manual" || raw.source === "markdown" ? raw.source : "manual",
    };
  }
  return parseChecklist(description);
}

function normalizeStoredWorkItem(raw = {}) {
  const description = trimString(raw.description, 5000);
  const status = normalizeStatus(raw.status);
  const createdAt = raw.createdAt || nowIso();
  return {
    id: trimString(raw.id, 120) || randomUUID(),
    projectId: trimString(raw.projectId, 120),
    sourceType: SOURCE_TYPES.has(raw.sourceType) ? raw.sourceType : "manual",
    flowTemplateId: raw.flowTemplateId ? trimString(raw.flowTemplateId, 120) : null,
    flowInstanceId: raw.flowInstanceId ? trimString(raw.flowInstanceId, 120) : null,
    flowStageId: raw.flowStageId ? trimString(raw.flowStageId, 120) : null,
    templateStageId: raw.templateStageId ? trimString(raw.templateStageId, 120) : null,
    legacyWorkflowTaskId: raw.legacyWorkflowTaskId ? trimString(raw.legacyWorkflowTaskId, 120) : null,
    legacyStageKey: raw.legacyStageKey ? trimString(raw.legacyStageKey, 80) : null,
    parentId: raw.parentId ? trimString(raw.parentId, 120) : null,
    title: trimString(raw.title || "未命名工作项", 200),
    description,
    status,
    progress: status === "done" ? 100 : clampProgress(raw.progress, 0),
    dependsOn: uniqueStrings(raw.dependsOn),
    assignee: normalizeAssignee(raw.assignee),
    roleId: raw.roleId ? trimString(raw.roleId, 120) : null,
    priority: trimString(raw.priority || "normal", 40),
    estimateHours: raw.estimateHours == null || raw.estimateHours === "" ? null : Math.max(0, Number(raw.estimateHours) || 0),
    dueAt: raw.dueAt ? trimString(raw.dueAt, 80) : null,
    startedAt: raw.startedAt ? trimString(raw.startedAt, 80) : null,
    completedAt: raw.completedAt ? trimString(raw.completedAt, 80) : null,
    blockedReason: trimString(raw.blockedReason, 1000),
    acceptanceCriteria: trimString(raw.acceptanceCriteria, 2000),
    checklist: normalizeChecklist(raw.checklist, description),
    deliverableIds: uniqueStrings(raw.deliverableIds),
    receiptIds: uniqueStrings(raw.receiptIds),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

function normalizeStoredEvent(raw = {}) {
  const createdAt = raw.createdAt || nowIso();
  return {
    id: trimString(raw.id, 120) || randomUUID(),
    workItemId: trimString(raw.workItemId, 120),
    projectId: trimString(raw.projectId, 120),
    type: trimString(raw.type, 80) || "item.updated",
    actor: normalizeActor(raw.actor || { type: "system" }),
    before: raw.before && typeof raw.before === "object" ? raw.before : null,
    after: raw.after && typeof raw.after === "object" ? raw.after : null,
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt,
  };
}

function ensureWorkItemCollections(data) {
  data.workItems = Array.isArray(data.workItems) ? data.workItems.map(normalizeStoredWorkItem) : [];
  data.workItemEvents = Array.isArray(data.workItemEvents) ? data.workItemEvents.map(normalizeStoredEvent) : [];
  return data;
}

function findProject(data, projectId) {
  return (data.projects || []).find((project) => project.id === projectId);
}

function findWorkItem(data, workItemId) {
  return (data.workItems || []).find((item) => item.id === workItemId);
}

function appendWorkItemEvent(data, { item, type, actor, before = null, after = null, metadata = {} }) {
  ensureWorkItemCollections(data);
  const event = {
    id: randomUUID(),
    workItemId: item.id,
    projectId: item.projectId,
    type,
    actor: normalizeActor(actor),
    before: before ? clone(before) : null,
    after: after ? clone(after) : null,
    metadata,
    createdAt: nowIso(),
  };
  data.workItemEvents.unshift(event);
  data.workItemEvents = data.workItemEvents.slice(0, 2000);
  return event;
}

function validateProject(data, projectId) {
  const project = findProject(data, projectId);
  if (!project) throw new WorkItemError(400, "工作项必须归属一个存在的项目");
  return project;
}

function flowStageContext(project, body) {
  if (!project.flowTemplateId || !Array.isArray(project.flowStages) || project.flowStages.length === 0) {
    throw new WorkItemError(400, "项目未绑定流程模板，不能创建流程阶段工作项");
  }
  const flowStageId = trimString(body.flowStageId || body.stageId, 120);
  if (!flowStageId) throw new WorkItemError(400, "流程阶段工作项必须提供 flowStageId");
  const stage = project.flowStages.find((item) => item.id === flowStageId);
  if (!stage) throw new WorkItemError(400, "流程阶段不存在或不属于该项目");
  const flowInstanceId = trimString(body.flowInstanceId || project.id, 120);
  if (flowInstanceId !== project.id) {
    throw new WorkItemError(400, "当前版本的流程实例内嵌在项目中，flowInstanceId 必须等于 projectId");
  }
  return {
    flowTemplateId: project.flowTemplateId,
    flowInstanceId: project.id,
    flowStageId: stage.id,
    templateStageId: stage.stageTemplateId || null,
    stage,
  };
}

function legacyTaskContext(project, body) {
  const legacyWorkflowTaskId = trimString(body.legacyWorkflowTaskId, 120);
  if (!legacyWorkflowTaskId) throw new WorkItemError(400, "旧任务镜像工作项必须提供 legacyWorkflowTaskId");
  const task = (project.workflowTasks || []).find((item) => item.id === legacyWorkflowTaskId);
  if (!task) throw new WorkItemError(400, "旧任务不存在或不属于该项目");
  return {
    legacyWorkflowTaskId: task.id,
    legacyStageKey: task.stageKey || null,
    task,
  };
}

function validateParent(data, item) {
  if (!item.parentId) return;
  const parent = findWorkItem(data, item.parentId);
  if (!parent || parent.projectId !== item.projectId) {
    throw new WorkItemError(400, "父工作项不存在或不属于同一项目");
  }
  if (parent.id === item.id) throw new WorkItemError(409, "工作项不能把自己设为父级");
}

function proposedDependsOn(data, itemId, nextDependsOn) {
  const map = new Map((data.workItems || []).map((item) => [item.id, [...(item.dependsOn || [])]]));
  map.set(itemId, [...nextDependsOn]);
  return map;
}

function pathExists(map, fromId, targetId, seen = new Set()) {
  if (fromId === targetId) return true;
  if (seen.has(fromId)) return false;
  seen.add(fromId);
  for (const next of map.get(fromId) || []) {
    if (pathExists(map, next, targetId, seen)) return true;
  }
  return false;
}

function validateDependencies(data, item, dependsOn) {
  const ids = uniqueStrings(dependsOn);
  for (const dependencyId of ids) {
    if (dependencyId === item.id) throw new WorkItemError(409, "工作项不能依赖自己", { dependencyId });
    const dependency = findWorkItem(data, dependencyId);
    if (!dependency) throw new WorkItemError(409, "依赖工作项不存在", { dependencyId });
    if (dependency.projectId !== item.projectId) {
      throw new WorkItemError(409, "不能创建跨项目工作项依赖", { dependencyId, projectId: dependency.projectId });
    }
  }
  const map = proposedDependsOn(data, item.id, ids);
  for (const dependencyId of ids) {
    if (pathExists(map, dependencyId, item.id)) {
      throw new WorkItemError(409, "工作项依赖不能形成循环", { dependencyId });
    }
  }
  return ids;
}

function unmetDependencies(data, item) {
  return (item.dependsOn || [])
    .map((id) => findWorkItem(data, id))
    .filter((dependency) => dependency && !FINISHED_STATUSES.has(dependency.status))
    .map((dependency) => ({
      id: dependency.id,
      title: dependency.title,
      status: dependency.status,
      projectId: dependency.projectId,
    }));
}

function applyDependencyReadiness(data, item, statusWasExplicit = false) {
  const unmet = unmetDependencies(data, item);
  if (["ready", "in_progress"].includes(item.status) && unmet.length > 0) {
    throw new WorkItemError(409, "前置依赖未完成，工作项不能进入就绪或进行中", { unmetDependencies: unmet });
  }
  if (!statusWasExplicit && unmet.length > 0 && ["todo", "ready", "in_progress"].includes(item.status)) {
    item.status = "waiting_dependency";
  }
  if (!statusWasExplicit && unmet.length === 0 && item.status === "waiting_dependency") {
    item.status = "ready";
  }
  return unmet;
}

function applyStatusFields(item, previousStatus = null) {
  const timestamp = nowIso();
  if (item.status === "done") {
    item.progress = 100;
    item.completedAt = item.completedAt || timestamp;
  } else if (previousStatus === "done" && item.status !== "done") {
    item.completedAt = null;
  }
  if (item.status === "in_progress") item.startedAt = item.startedAt || timestamp;
}

function legacyStatus(task) {
  return LEGACY_STATUS_MAP[task?.status] || "todo";
}

function legacyProgress(task) {
  const status = legacyStatus(task);
  if (status === "done") return 100;
  if (status === "in_progress") return clampProgress(task.progress, 50);
  if (status === "review_pending") return clampProgress(task.progress, 90);
  return clampProgress(task.progress, 0);
}

function stageLabel(project, stageKey) {
  const stage = (project.stages || []).find((item) => item.key === stageKey);
  return stage?.title || LEGACY_STAGE_LABELS[stageKey] || "未分类阶段";
}

function assigneeFromLegacyTask(task) {
  if (!task?.ownerId) return { type: "unassigned", id: null, name: null };
  return {
    type: "agent",
    id: task.ownerId,
    name: task.ownerName || task.ownerId,
  };
}

function receiptIdsForLegacyTask(project, taskId) {
  return uniqueStrings((project.taskReceipts || []).filter((receipt) => receipt.taskId === taskId).map((receipt) => receipt.id));
}

function createLegacyMirrorItem(project, task) {
  const description = trimString([task.instructions, task.reason].filter(Boolean).join("\n\n"), 5000);
  const status = legacyStatus(task);
  const item = normalizeStoredWorkItem({
    id: `legacy-${task.id}`,
    projectId: project.id,
    sourceType: "legacy_workflow_task",
    legacyWorkflowTaskId: task.id,
    legacyStageKey: task.stageKey || null,
    title: `${stageLabel(project, task.stageKey)}：${task.dispatchedAgentName || task.ownerName || "待处理任务"}`,
    description,
    status,
    progress: legacyProgress(task),
    assignee: assigneeFromLegacyTask(task),
    receiptIds: receiptIdsForLegacyTask(project, task.id),
    dueAt: task.dueAt || null,
    estimateHours: task.estimateHours ?? null,
    createdAt: task.createdAt || nowIso(),
    updatedAt: task.updatedAt || task.createdAt || nowIso(),
  });
  applyStatusFields(item);
  return item;
}

function syncLegacyWorkItems(data, { projectId = null, actor = { type: "system", name: "Nomos System" } } = {}) {
  ensureWorkItemCollections(data);
  const projects = (data.projects || []).filter((project) => !projectId || project.id === projectId);
  const result = { created: 0, updated: 0, totalMirrored: 0 };
  for (const project of projects) {
    for (const task of project.workflowTasks || []) {
      const existing = data.workItems.find(
        (item) => item.projectId === project.id && item.sourceType === "legacy_workflow_task" && item.legacyWorkflowTaskId === task.id,
      );
      const next = createLegacyMirrorItem(project, task);
      result.totalMirrored += 1;
      if (!existing) {
        data.workItems.unshift(next);
        appendWorkItemEvent(data, { item: next, type: "item.created", actor, after: next, metadata: { sourceType: next.sourceType } });
        appendWorkItemEvent(data, { item: next, type: "legacy_task.linked", actor, after: next, metadata: { legacyWorkflowTaskId: task.id } });
        result.created += 1;
        continue;
      }
      const before = clone(existing);
      let changed = false;
      for (const key of ["title", "description", "status", "progress", "legacyStageKey", "dueAt", "estimateHours"]) {
        if (existing[key] !== next[key]) {
          existing[key] = next[key];
          changed = true;
        }
      }
      if (!assigneesEqual(existing.assignee, next.assignee)) {
        existing.assignee = next.assignee;
        changed = true;
      }
      const nextReceipts = JSON.stringify(next.receiptIds);
      if (JSON.stringify(existing.receiptIds || []) !== nextReceipts) {
        existing.receiptIds = next.receiptIds;
        changed = true;
      }
      if (changed) {
        existing.updatedAt = nowIso();
        applyStatusFields(existing, before.status);
        appendWorkItemEvent(data, { item: existing, type: "legacy_task.linked", actor, before, after: existing, metadata: { legacyWorkflowTaskId: task.id } });
        if (before.status !== existing.status) {
          appendWorkItemEvent(data, { item: existing, type: "status.changed", actor, before, after: existing, metadata: { from: before.status, to: existing.status } });
        }
        result.updated += 1;
      }
    }
  }
  return result;
}

function needsLegacySync(data, projectId = null) {
  ensureWorkItemCollections(data);
  const projects = (data.projects || []).filter((project) => !projectId || project.id === projectId);
  return projects.some((project) =>
    (project.workflowTasks || []).some((task) => {
      const existing = data.workItems.find(
        (item) => item.projectId === project.id && item.sourceType === "legacy_workflow_task" && item.legacyWorkflowTaskId === task.id,
      );
      return !existing || existing.status !== legacyStatus(task);
    }),
  );
}

function createWorkItem(data, body, { actor = { type: "user", name: "Local User" } } = {}) {
  ensureWorkItemCollections(data);
  const project = validateProject(data, trimString(body.projectId, 120));
  if (body.sourceType !== undefined && !SOURCE_TYPES.has(body.sourceType)) {
    throw new WorkItemError(400, "工作项来源类型无效");
  }
  if (body.status !== undefined && !WORK_ITEM_STATUSES.has(body.status)) {
    throw new WorkItemError(400, "工作项状态无效");
  }
  const sourceType = SOURCE_TYPES.has(body.sourceType) ? body.sourceType : "manual";
  const id = randomUUID();
  const description = trimString(body.description, 5000);
  const item = normalizeStoredWorkItem({
    id,
    projectId: project.id,
    sourceType,
    parentId: body.parentId || null,
    title: body.title,
    description,
    status: body.status || "todo",
    progress: body.progress,
    dependsOn: body.dependsOn,
    assignee: body.assignee,
    roleId: body.roleId,
    priority: body.priority,
    estimateHours: body.estimateHours,
    dueAt: body.dueAt,
    blockedReason: body.blockedReason,
    acceptanceCriteria: body.acceptanceCriteria,
    deliverableIds: body.deliverableIds,
    receiptIds: body.receiptIds,
    order: body.order,
    checklist: body.checklist,
  });

  if (!item.title) throw new WorkItemError(400, "工作项标题不能为空");

  if (sourceType === "flow_stage") {
    const context = flowStageContext(project, body);
    item.flowTemplateId = context.flowTemplateId;
    item.flowInstanceId = context.flowInstanceId;
    item.flowStageId = context.flowStageId;
    item.templateStageId = context.templateStageId;
    if (!item.roleId && context.stage.requiredRoles?.[0]) item.roleId = context.stage.requiredRoles[0];
  } else if (sourceType === "legacy_workflow_task") {
    const context = legacyTaskContext(project, body);
    item.legacyWorkflowTaskId = context.legacyWorkflowTaskId;
    item.legacyStageKey = context.legacyStageKey;
    item.status = legacyStatus(context.task);
    item.progress = legacyProgress(context.task);
    item.assignee = assigneeFromLegacyTask(context.task);
    item.receiptIds = receiptIdsForLegacyTask(project, context.task.id);
  }

  validateParent(data, item);
  item.dependsOn = validateDependencies(data, item, item.dependsOn);
  const statusWasExplicit = body.status !== undefined;
  applyDependencyReadiness(data, item, statusWasExplicit);
  applyStatusFields(item);

  data.workItems.unshift(item);
  appendWorkItemEvent(data, { item, type: "item.created", actor, after: item, metadata: { sourceType } });
  if (sourceType === "flow_stage") {
    appendWorkItemEvent(data, { item, type: "flow_stage.linked", actor, after: item, metadata: { flowStageId: item.flowStageId } });
  }
  if (sourceType === "legacy_workflow_task") {
    appendWorkItemEvent(data, { item, type: "legacy_task.linked", actor, after: item, metadata: { legacyWorkflowTaskId: item.legacyWorkflowTaskId } });
  }
  for (const dependencyId of item.dependsOn) {
    appendWorkItemEvent(data, { item, type: "dependency.added", actor, after: item, metadata: { dependencyId } });
  }
  return item;
}

function updateWorkItem(data, workItemId, body, { actor = { type: "user", name: "Local User" } } = {}) {
  ensureWorkItemCollections(data);
  const item = findWorkItem(data, workItemId);
  if (!item) throw new WorkItemError(404, "工作项不存在");
  validateProject(data, item.projectId);
  const before = clone(item);
  const next = clone(item);
  const explicitStatus = body.status !== undefined;
  const previousStatus = before.status;
  const previousAssignee = clone(before.assignee);
  const previousProgress = before.progress;
  const previousDependsOn = [...(before.dependsOn || [])];

  if (body.status !== undefined && !WORK_ITEM_STATUSES.has(body.status)) {
    throw new WorkItemError(400, "工作项状态无效");
  }
  if (body.title !== undefined) next.title = trimString(body.title, 200);
  if (!next.title) throw new WorkItemError(400, "工作项标题不能为空");
  if (body.description !== undefined) {
    next.description = trimString(body.description, 5000);
    next.checklist = normalizeChecklist(body.checklist, next.description);
  }
  if (body.checklist !== undefined) next.checklist = normalizeChecklist(body.checklist, next.description);
  if (body.assignee !== undefined) next.assignee = normalizeAssignee(body.assignee);
  if (body.roleId !== undefined) next.roleId = body.roleId ? trimString(body.roleId, 120) : null;
  if (body.priority !== undefined) next.priority = trimString(body.priority || "normal", 40);
  if (body.estimateHours !== undefined) next.estimateHours = body.estimateHours == null || body.estimateHours === "" ? null : Math.max(0, Number(body.estimateHours) || 0);
  if (body.dueAt !== undefined) next.dueAt = body.dueAt ? trimString(body.dueAt, 80) : null;
  if (body.blockedReason !== undefined) next.blockedReason = trimString(body.blockedReason, 1000);
  if (body.acceptanceCriteria !== undefined) next.acceptanceCriteria = trimString(body.acceptanceCriteria, 2000);
  if (body.deliverableIds !== undefined) next.deliverableIds = uniqueStrings(body.deliverableIds);
  if (body.receiptIds !== undefined) next.receiptIds = uniqueStrings(body.receiptIds);
  if (body.parentId !== undefined) next.parentId = body.parentId ? trimString(body.parentId, 120) : null;
  if (body.order !== undefined) next.order = Number.isFinite(Number(body.order)) ? Number(body.order) : next.order;
  if (body.progress !== undefined) next.progress = clampProgress(body.progress, next.progress);
  if (explicitStatus) next.status = normalizeStatus(body.status, next.status);
  if (body.dependsOn !== undefined) next.dependsOn = validateDependencies(data, next, body.dependsOn);
  validateParent(data, next);
  applyDependencyReadiness(data, next, explicitStatus);
  applyStatusFields(next, previousStatus);
  next.updatedAt = nowIso();

  const after = clone(next);
  if (JSON.stringify(before) === JSON.stringify(after)) return item;
  Object.assign(item, next);

  if (previousStatus !== item.status) {
    appendWorkItemEvent(data, { item, type: "status.changed", actor, before, after, metadata: { from: previousStatus, to: item.status } });
    if (item.status === "blocked") appendWorkItemEvent(data, { item, type: "blocked", actor, before, after, metadata: { reason: item.blockedReason } });
    if (previousStatus === "blocked" && item.status !== "blocked") appendWorkItemEvent(data, { item, type: "unblocked", actor, before, after });
  }
  if (!assigneesEqual(previousAssignee, item.assignee)) {
    appendWorkItemEvent(data, { item, type: "assignee.changed", actor, before, after, metadata: { from: previousAssignee, to: item.assignee } });
  }
  if (previousProgress !== item.progress) {
    appendWorkItemEvent(data, { item, type: "progress.updated", actor, before, after, metadata: { from: previousProgress, to: item.progress } });
  }
  for (const dependencyId of item.dependsOn.filter((id) => !previousDependsOn.includes(id))) {
    appendWorkItemEvent(data, { item, type: "dependency.added", actor, before, after, metadata: { dependencyId } });
  }
  for (const dependencyId of previousDependsOn.filter((id) => !item.dependsOn.includes(id))) {
    appendWorkItemEvent(data, { item, type: "dependency.removed", actor, before, after, metadata: { dependencyId } });
  }
  appendWorkItemEvent(data, { item, type: "item.updated", actor, before, after });
  return item;
}

function cancelWorkItem(data, workItemId, { actor = { type: "user", name: "Local User" } } = {}) {
  return updateWorkItem(data, workItemId, { status: "cancelled" }, { actor });
}

function addDependency(data, workItemId, dependencyId, { actor = { type: "user", name: "Local User" } } = {}) {
  const item = findWorkItem(data, workItemId);
  if (!item) throw new WorkItemError(404, "工作项不存在");
  if (!trimString(dependencyId, 120)) throw new WorkItemError(400, "依赖工作项 ID 不能为空");
  if ((item.dependsOn || []).includes(dependencyId)) return item;
  return updateWorkItem(data, workItemId, { dependsOn: [...(item.dependsOn || []), dependencyId] }, { actor });
}

function removeDependency(data, workItemId, dependencyId, { actor = { type: "user", name: "Local User" } } = {}) {
  const item = findWorkItem(data, workItemId);
  if (!item) throw new WorkItemError(404, "工作项不存在");
  return updateWorkItem(data, workItemId, { dependsOn: (item.dependsOn || []).filter((id) => id !== dependencyId) }, { actor });
}

function addComment(data, workItemId, comment, { actor = { type: "user", name: "Local User" } } = {}) {
  ensureWorkItemCollections(data);
  const item = findWorkItem(data, workItemId);
  if (!item) throw new WorkItemError(404, "工作项不存在");
  const text = trimString(comment, 2000);
  if (!text) throw new WorkItemError(400, "备注不能为空");
  item.updatedAt = nowIso();
  appendWorkItemEvent(data, { item, type: "comment.added", actor, after: item, metadata: { comment: text } });
  return item;
}

function valueFromFilters(filters, key) {
  if (!filters) return "";
  if (typeof filters.get === "function") return filters.get(key) || "";
  return filters[key] || "";
}

function splitFilter(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isOverdue(item, at = new Date()) {
  if (!item.dueAt || FINISHED_STATUSES.has(item.status)) return false;
  const due = new Date(item.dueAt);
  return Number.isFinite(due.getTime()) && due.getTime() < at.getTime();
}

function dueThisWeek(item, at = new Date()) {
  if (!item.dueAt || FINISHED_STATUSES.has(item.status)) return false;
  const due = new Date(item.dueAt);
  if (!Number.isFinite(due.getTime())) return false;
  const end = new Date(at);
  end.setDate(end.getDate() + 7);
  return due.getTime() >= at.getTime() && due.getTime() <= end.getTime();
}

function decorateWorkItem(data, item) {
  const project = findProject(data, item.projectId);
  const flowStage = project?.flowStages?.find((stage) => stage.id === item.flowStageId);
  const dependencies = (item.dependsOn || []).map((id) => findWorkItem(data, id)).filter(Boolean);
  const unmet = unmetDependencies(data, item);
  return {
    ...item,
    projectTitle: project?.title || "未知项目",
    flowStageName: flowStage?.name || null,
    dependencySummary: dependencies.map((dependency) => ({ id: dependency.id, title: dependency.title, status: dependency.status })),
    unmetDependencies: unmet,
    isOverdue: isOverdue(item),
    dueThisWeek: dueThisWeek(item),
  };
}

function filterWorkItems(data, filters = {}) {
  ensureWorkItemCollections(data);
  let result = [...data.workItems];
  const projectId = valueFromFilters(filters, "projectId");
  const statusValues = splitFilter(valueFromFilters(filters, "status"));
  const assigneeType = valueFromFilters(filters, "assigneeType");
  const assigneeId = valueFromFilters(filters, "assigneeId");
  const sourceType = valueFromFilters(filters, "sourceType");
  const flowInstanceId = valueFromFilters(filters, "flowInstanceId");
  const flowStageId = valueFromFilters(filters, "flowStageId");
  const legacyStageKey = valueFromFilters(filters, "legacyStageKey");
  const dueBefore = valueFromFilters(filters, "dueBefore");
  const blocked = valueFromFilters(filters, "blocked");
  const search = valueFromFilters(filters, "search").toLowerCase();

  if (projectId) result = result.filter((item) => item.projectId === projectId);
  if (statusValues.length > 0) result = result.filter((item) => statusValues.includes(item.status));
  if (assigneeType) result = result.filter((item) => item.assignee?.type === assigneeType);
  if (assigneeId) result = result.filter((item) => item.assignee?.id === assigneeId);
  if (sourceType) result = result.filter((item) => item.sourceType === sourceType);
  if (flowInstanceId) result = result.filter((item) => item.flowInstanceId === flowInstanceId);
  if (flowStageId) result = result.filter((item) => item.flowStageId === flowStageId);
  if (legacyStageKey) result = result.filter((item) => item.legacyStageKey === legacyStageKey);
  if (dueBefore) {
    const cutoff = new Date(dueBefore);
    if (Number.isFinite(cutoff.getTime())) {
      result = result.filter((item) => item.dueAt && new Date(item.dueAt).getTime() <= cutoff.getTime());
    }
  }
  if (blocked === "true") result = result.filter((item) => BLOCKING_STATUSES.has(item.status) || unmetDependencies(data, item).length > 0);
  if (search) {
    result = result.filter((item) =>
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      (item.projectId || "").toLowerCase().includes(search)
    );
  }
  return result.sort((left, right) => {
    if (left.projectId !== right.projectId) return left.projectId.localeCompare(right.projectId);
    return (left.order || 0) - (right.order || 0) || right.updatedAt.localeCompare(left.updatedAt);
  });
}

function effectiveProgress(items, item, seen = new Set()) {
  if (seen.has(item.id)) return item.progress || 0;
  seen.add(item.id);
  const children = items.filter((child) => child.parentId === item.id && child.status !== "cancelled");
  if (children.length === 0) return item.progress || 0;
  const totalWeight = children.reduce((sum, child) => sum + (Number(child.estimateHours) || 1), 0);
  const done = children.reduce((sum, child) => sum + effectiveProgress(items, child, seen) * (Number(child.estimateHours) || 1), 0);
  return totalWeight > 0 ? Math.round(done / totalWeight) : 0;
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function summarizeGroup(items) {
  const active = items.filter((item) => item.status !== "cancelled");
  const done = active.filter((item) => item.status === "done").length;
  return {
    total: items.length,
    activeTotal: active.length,
    done,
    blocked: active.filter((item) => BLOCKING_STATUSES.has(item.status)).length,
    overdue: active.filter((item) => isOverdue(item)).length,
    completionRate: active.length ? done / active.length : 0,
  };
}

function buildProgressDashboard(data, filters = {}) {
  const items = filterWorkItems(data, filters);
  const active = items.filter((item) => item.status !== "cancelled");
  const done = active.filter((item) => item.status === "done");
  const activeEstimateHours = active.reduce((sum, item) => sum + (Number(item.estimateHours) || 0), 0);
  const doneEstimateHours = done.reduce((sum, item) => sum + (Number(item.estimateHours) || 0), 0);
  const statusCounts = {};
  for (const status of WORK_ITEM_STATUSES) statusCounts[status] = items.filter((item) => item.status === status).length;

  const eventsWorkItemIds = new Set(items.map((item) => item.id));
  const recentEvents = (data.workItemEvents || [])
    .filter((event) => eventsWorkItemIds.has(event.workItemId))
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20)
    .map((event) => ({
      ...event,
      workItemTitle: findWorkItem(data, event.workItemId)?.title || "未知工作项",
    }));

  const stageGroups = [...groupBy(items, (item) => item.flowStageId || item.legacyStageKey || "manual").entries()].map(([key, group]) => ({
    key,
    label: decorateWorkItem(data, group[0]).flowStageName || LEGACY_STAGE_LABELS[group[0].legacyStageKey] || (key === "manual" ? "项目临时工作项" : "未分类阶段"),
    ...summarizeGroup(group),
  }));

  const projectGroups = [...groupBy(items, (item) => item.projectId).entries()].map(([key, group]) => ({
    key,
    label: findProject(data, key)?.title || "未知项目",
    ...summarizeGroup(group),
  }));

  const flowTemplateGroups = [...groupBy(items.filter((item) => item.flowTemplateId), (item) => item.flowTemplateId).entries()].map(([key, group]) => ({
    key,
    label: (data.flowTemplates || []).find((template) => template.id === key)?.name || "未知流程",
    ...summarizeGroup(group),
  }));

  const assigneeGroups = [...groupBy(items, (item) => `${item.assignee?.type || "unassigned"}:${item.assignee?.id || "unassigned"}`).entries()].map(([key, group]) => ({
    key,
    label: group[0].assignee?.name || "未分配",
    type: group[0].assignee?.type || "unassigned",
    id: group[0].assignee?.id || null,
    ...summarizeGroup(group),
  }));

  const blockingLinks = active
    .filter((item) => BLOCKING_STATUSES.has(item.status) || unmetDependencies(data, item).length > 0)
    .map((item) => ({
      id: item.id,
      title: item.title,
      projectId: item.projectId,
      status: item.status,
      blockedReason: item.blockedReason,
      unmetDependencies: unmetDependencies(data, item),
    }));

  return {
    total: items.length,
    activeTotal: active.length,
    done: done.length,
    cancelled: items.filter((item) => item.status === "cancelled").length,
    blocked: active.filter((item) => BLOCKING_STATUSES.has(item.status)).length,
    overdue: active.filter((item) => isOverdue(item)).length,
    dueThisWeek: active.filter((item) => dueThisWeek(item)).length,
    completionRate: active.length ? done.length / active.length : 0,
    activeEstimateHours,
    doneEstimateHours,
    hourCompletionRate: activeEstimateHours > 0 ? doneEstimateHours / activeEstimateHours : null,
    statusCounts,
    stageGroups,
    projectGroups,
    flowTemplateGroups,
    assigneeGroups,
    blockingLinks,
    recentEvents,
    items: items.slice(0, 200).map((item) => ({ ...decorateWorkItem(data, item), effectiveProgress: effectiveProgress(items, item) })),
  };
}

function resolveAssigneeLabel(data, item) {
  const assignee = item.assignee || { type: "unassigned" };
  if (assignee.type === "employee") {
    const employee = (data.employees || []).find((record) => record.id === assignee.id);
    return {
      type: "employee",
      id: assignee.id || null,
      name: employee?.name || assignee.name || assignee.id || "未知员工",
      employeeType: employee?.type || null,
      agentId: employee?.agentId || null,
    };
  }
  if (assignee.type === "agent") {
    const agent = (data.agents || []).find((record) => record.id === assignee.id);
    return { type: "agent", id: assignee.id || null, name: agent?.name || assignee.name || assignee.id || "未知 Agent" };
  }
  if (assignee.type === "role") {
    const role = (data.roles || []).find((record) => record.id === assignee.id);
    return { type: "role", id: assignee.id || null, name: role?.name || assignee.name || assignee.id || "未知岗位" };
  }
  return { type: "unassigned", id: null, name: "未分配" };
}

function remainingHours(item) {
  if (FINISHED_STATUSES.has(item.status)) return 0;
  const estimate = Number(item.estimateHours);
  if (!Number.isFinite(estimate) || estimate <= 0) return 0;
  return Math.max(0, estimate * (1 - clampProgress(item.progress, 0) / 100));
}

function buildResourceDashboard(data, filters = {}) {
  const activeItems = filterWorkItems(data, filters).filter((item) => item.status !== "cancelled");
  const groups = new Map();
  for (const item of activeItems) {
    const assignee = resolveAssigneeLabel(data, item);
    const key = `${assignee.type}:${assignee.id || "unassigned"}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        assignee,
        inProgress: 0,
        ready: 0,
        blocked: 0,
        overdue: 0,
        dueThisWeek: 0,
        remainingHours: 0,
        recentlyDone: 0,
        total: 0,
        items: [],
      });
    }
    const group = groups.get(key);
    group.total += 1;
    if (item.status === "in_progress") group.inProgress += 1;
    if (item.status === "ready") group.ready += 1;
    if (BLOCKING_STATUSES.has(item.status)) group.blocked += 1;
    if (isOverdue(item)) group.overdue += 1;
    if (dueThisWeek(item)) group.dueThisWeek += 1;
    group.remainingHours += remainingHours(item);
    if (item.status === "done" && item.completedAt) {
      const completedAt = new Date(item.completedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (Number.isFinite(completedAt.getTime()) && completedAt.getTime() >= sevenDaysAgo.getTime()) group.recentlyDone += 1;
    }
    if (group.items.length < 20) group.items.push(decorateWorkItem(data, item));
  }
  const resources = [...groups.values()].sort((left, right) =>
    right.inProgress - left.inProgress ||
    right.blocked - left.blocked ||
    right.overdue - left.overdue ||
    left.assignee.name.localeCompare(right.assignee.name),
  );
  return {
    totalResources: resources.length,
    totalItems: activeItems.length,
    overloaded: resources.filter((group) => group.inProgress + group.ready >= 5 || group.blocked > 0).length,
    unassigned: resources.find((group) => group.assignee.type === "unassigned") || null,
    resources,
  };
}

module.exports = {
  SOURCE_TYPES,
  WORK_ITEM_STATUSES,
  WorkItemError,
  ensureWorkItemCollections,
  createWorkItem,
  updateWorkItem,
  cancelWorkItem,
  addDependency,
  removeDependency,
  addComment,
  filterWorkItems,
  decorateWorkItem,
  buildProgressDashboard,
  buildResourceDashboard,
  syncLegacyWorkItems,
  needsLegacySync,
  unmetDependencies,
};
