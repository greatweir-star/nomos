"use strict";
const { randomUUID } = require("crypto");
const {
  sendJson, sendError, readJson,
  findProject, summarizeProject, addMessage,
  advanceProject,
} = require("../utils");
const { resolveAgentRoute } = require("../agent-router");
const {
  addStageDeliverable,
  manuallyAdvanceActiveStage,
  resolveCheckpoint,
  returnStageForRevision,
  submitStageReceipt,
  workflowPayload,
} = require("../workflow");

module.exports = async function handleProjects(request, response, url, segments, store, executionManager, aliceCoordinator, deploymentManager) {
  if (url.pathname === "/api/projects" && request.method === "GET") {
  sendJson(response, 200, store.snapshot().projects.map(summarizeProject));
  return;
  }

  if (url.pathname === "/api/projects" && request.method === "POST") {
  const body = await readJson(request);
  if (!body.title || !body.goal) {
  sendError(response, 400, "项目名称和目标不能为空");
  return;
  }
  const project = createProject({
  title: String(body.title).trim(),
  goal: String(body.goal).trim(),
  subtitle: body.subtitle || "总管正在分析目标并准备拆解任务。",
  dueLabel: body.dueLabel || "等待排期",
  team: body.team || "开发团队",
  activeIndex: 0,
  });
  const templateId = body.templateId ? String(body.templateId).trim() : null;
  let flowInstance = null;
  store.update((data) => {
  data.projects.unshift(project);
  if (templateId) {
  try {
  flowInstance = createFlowInstance(data, project.id, templateId);
  } catch (error) {
  // Template not found, continue without binding
  }
  }
  store.audit("project.create", `创建项目：${project.title}${flowInstance ? `（绑定流程：${flowInstance.templateName}）` : ""}`, { projectId: project.id, templateId: flowInstance?.templateId || null });
  return project;
  });
  sendJson(response, 201, flowInstance ? { ...project, flowInstanceId: flowInstance.id, _flowInstance: flowInstance } : project);
  return;
  }

  if (segments[1] === "projects" && segments[2]) {
  const projectId = segments[2];

  if (segments.length === 3 && request.method === "GET") {
  const data = store.snapshot();
  const project = findProject(data, projectId);
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  if (project.flowInstanceId) {
  const flowInstance = findFlowInstance(data, project.flowInstanceId);
  sendJson(response, 200, { ...project, _flowInstance: flowInstance });
  } else {
  sendJson(response, 200, project);
  }
  return;
  }

  if (segments[3] === "workflow" && segments.length === 4 && request.method === "GET") {
  const project = findProject(store.snapshot(), projectId);
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 200, workflowPayload(project));
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "agent-route" && request.method === "GET") {
  const project = findProject(store.snapshot(), projectId);
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  try {
  const data = store.snapshot();
  const tools = createAdapterDirectory({
  localTools: await executionManager.listTools(),
  adapterConfigs: data.agentAdapters,
  });
  sendJson(response, 200, resolveAgentRoute({
  project,
  stageKey: segments[4],
  tools,
  requestedAgentId: url.searchParams.get("agentId"),
  }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "receipts" && request.method === "POST") {
  const body = await readJson(request);
  try {
  const result = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const receiptResult = submitStageReceipt(project, { ...body, stageKey: segments[4] });
  store.audit("workflow.receipt", `阶段回执：${receiptResult.stage.title}`, {
  projectId,
  stageKey: receiptResult.stage.key,
  receiptId: receiptResult.receipt.id,
  status: receiptResult.receipt.status,
  });
  return receiptResult;
  });
  if (!result) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 201, result);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "alice" && segments[6] === "preview" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, aliceCoordinator.preview({ projectId, stageKey: segments[4], note: body.note }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] && segments[7] === "receipts" && request.method === "POST") {
  const body = await readJson(request);
  try {
  const result = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const agent = data.agents.find((item) => item.id === segments[6]);
  const receiptResult = submitStageReceipt(project, {
  ...body,
  stageKey: segments[4],
  agentId: segments[6],
  agentName: body.agentName || agent?.name || segments[6],
  agentType: body.agentType || agent?.type || "local",
  source: body.source || segments[6],
  });
  store.audit("agent.receipt", `Agent 回执：${receiptResult.stage.title}`, {
  projectId,
  stageKey: receiptResult.stage.key,
  agentId: segments[6],
  receiptId: receiptResult.receipt.id,
  });
  return receiptResult;
  });
  if (!result) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 201, result);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] === "alice" && segments[7] === "sync" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, await aliceCoordinator.sync({
  projectId,
  stageKey: segments[4],
  sessionId: body.sessionId,
  confirm: body.confirm,
  }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] === "alice" && segments[7] === "sessions" && request.method === "GET") {
  try {
  sendJson(response, 200, await aliceCoordinator.sessions({
  projectId,
  stageKey: segments[4],
  }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "deliverables" && request.method === "POST") {
  const body = await readJson(request);
  try {
  const asset = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const created = addStageDeliverable(project, { ...body, stageKey: segments[4] });
  store.audit("workflow.deliverable.create", `添加阶段交付物：${created.name}`, {
  projectId,
  stageKey: segments[4],
  assetId: created.id,
  });
  return created;
  });
  if (!asset) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 201, asset);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "stages" && segments[4] && segments[5] === "return" && request.method === "POST") {
  const body = await readJson(request);
  if (body.confirm !== true) {
  sendError(response, 400, "退回返工需要明确确认");
  return;
  }
  try {
  const result = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const returned = returnStageForRevision(project, {
  fromStageKey: segments[4],
  targetStageKey: body.targetStageKey,
  reason: body.reason,
  });
  store.audit("workflow.return", `退回返工：${returned.targetStage.title}`, {
  projectId,
  fromStageKey: segments[4],
  targetStageKey: returned.targetStage.key,
  });
  return returned;
  });
  if (!result) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 200, result);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments.length === 3 && request.method === "PATCH") {
  const body = await readJson(request);
  const project = store.update((data) => {
  const target = findProject(data, projectId);
  if (!target) return null;
  for (const field of ["title", "subtitle", "goal", "dueLabel", "team"]) {
  if (typeof body[field] === "string") target[field] = body[field].trim();
  }
  target.updatedAt = new Date().toISOString();
  store.audit("project.update", `更新项目：${target.title}`, { projectId });
  return target;
  });
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 200, project);
  return;
  }

  if (segments.length === 3 && request.method === "DELETE") {
  const body = await readJson(request);
  if (body.confirm !== true) {
  sendError(response, 400, "删除项目需要明确确认");
  return;
  }
  const project = store.update((data) => {
  if (data.projects.length <= 1) return { lastProject: true };
  const index = data.projects.findIndex((item) => item.id === projectId);
  if (index === -1) return null;
  const [deleted] = data.projects.splice(index, 1);
  store.audit("project.delete", `删除项目：${deleted.title}`, { projectId });
  return deleted;
  });
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  if (project.lastProject) {
  sendError(response, 400, "至少保留一个项目");
  return;
  }
  sendJson(response, 200, project);
  return;
  }

  if (segments[3] === "assets" && segments.length === 4 && request.method === "POST") {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) {
  sendError(response, 400, "资料名称不能为空");
  return;
  }
  try {
  const asset = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const stageKey = String(body.stageKey || "").trim();
  const created = stageKey
  ? addStageDeliverable(project, { ...body, stageKey })
  : {
  id: randomUUID(),
  stageKey: null,
  type: String(body.type || "FILE").trim().slice(0, 12).toUpperCase() || "FILE",
  name: name.slice(0, 160),
  url: String(body.url || "").trim().slice(0, 1000),
  createdAt: new Date().toISOString(),
  };
  if (!stageKey) {
  project.assets = project.assets || [];
  project.assets.push(created);
  }
  project.updatedAt = created.createdAt;
  store.audit("asset.create", `添加项目资料：${created.name}`, { projectId, assetId: created.id });
  return created;
  });
  if (!asset) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 201, asset);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[3] === "assets" && segments[4] && request.method === "DELETE") {
  const asset = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const index = (project.assets || []).findIndex((item) => item.id === segments[4]);
  if (index === -1) return { missingAsset: true };
  const [deleted] = project.assets.splice(index, 1);
  for (const stage of project.stages) {
  stage.deliverableIds = (stage.deliverableIds || []).filter((assetId) => assetId !== deleted.id);
  }
  project.updatedAt = new Date().toISOString();
  store.audit("asset.delete", `删除项目资料：${deleted.name}`, { projectId, assetId: deleted.id });
  return deleted;
  });
  if (!asset) {
  sendError(response, 404, "项目不存在");
  return;
  }
  if (asset.missingAsset) {
  sendError(response, 404, "项目资料不存在");
  return;
  }
  sendJson(response, 200, asset);
  return;
  }

  if (segments[3] === "messages" && request.method === "POST") {
  const body = await readJson(request);
  if (!String(body.text || "").trim()) {
  sendError(response, 400, "消息不能为空");
  return;
  }
  const message = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const created = addMessage(project, {
  authorId: "local-user",
  authorName: "你",
  authorType: "user",
  text: String(body.text).trim(),
  });
  store.audit("message.create", `项目消息：${project.title}`, { projectId });
  return created;
  });
  if (!message) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 201, message);
  return;
  }

  if (segments[3] === "advance" && request.method === "POST") {
  const result = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const advanced = advanceProject(project);
  store.audit("project.advance", `推进项目：${project.title}`, { projectId });
  return advanced;
  });
  if (!result) {
  sendError(response, 404, "项目不存在");
  return;
  }
  sendJson(response, 200, result);
  return;
  }

  if (segments[3] === "checkpoints" && segments[4] && request.method === "POST") {
  const body = await readJson(request);
  try {
  const result = store.update((data) => {
  const project = findProject(data, projectId);
  if (!project) return null;
  const resolved = resolveCheckpoint(project, {
  checkpointId: segments[4],
  action: body.action,
  note: body.note,
  });
  if (resolved.missingCheckpoint) return resolved;
  store.audit("checkpoint.resolve", `处理验收点：${project.title}`, {
  projectId,
  checkpointId: resolved.checkpoint.id,
  status: resolved.checkpoint.status,
  });
  return resolved;
  });
  if (!result) {
  sendError(response, 404, "项目不存在");
  return;
  }
  if (result.missingCheckpoint) {
  sendError(response, 404, "验收点不存在");
  return;
  }
  sendJson(response, 200, result);
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }
  }

  return false;
};
