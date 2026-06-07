"use strict";
const {
  sendJson, sendError, readJson,
  createBridgePayload,
} = require("../utils");

module.exports = async function handleSystem(request, response, url, segments, store, executionManager, deploymentManager) {
  if (url.pathname === "/api/health" && request.method === "GET") {
  sendJson(response, 200, { status: "ok", service: "nomos-local-backend" });
  return;
  }

  if (segments[0] !== "api") {
  serveStatic(response, rendererDir, url.pathname);
  return;
  }

  if (url.pathname === "/api/workspace" && request.method === "GET") {
  const data = store.snapshot();
  const localTools = await executionManager.listTools();
  const technicalAdapters = createAdapterDirectory({
  localTools,
  adapterConfigs: data.agentAdapters,
  });
  sendJson(response, 200, {
  projects: data.projects.map(summarizeProject),
  agents: mergeAgentConnections(data.agents, localTools, data.agentAdapters),
  bridge: data.bridge,
  localTools,
  technicalAdapters,
  skills: data.skills,
  roles: data.roles,
  employees: data.employees,
  flowTemplates: data.flowTemplates,
  });
  return;
  }

  if (url.pathname === "/api/audit" && request.method === "GET") {
  sendJson(response, 200, store.snapshot().audit);
  return;
  }

  if (url.pathname === "/api/system/backups" && request.method === "GET") {
  sendJson(response, 200, store.listBackups());
  return;
  }

  if (url.pathname === "/api/system/backups" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, store.backup({ confirm: body.confirm, reason: body.reason }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "system" && segments[2] === "backups" && segments[3] && segments[4] === "inspect" && request.method === "GET") {
  try {
  sendJson(response, 200, store.inspectBackup({ fileName: segments[3] }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "system" && segments[2] === "backups" && segments[3] && segments[4] === "restore" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 200, store.restoreBackup({ fileName: segments[3], confirm: body.confirm }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (url.pathname === "/api/system/diagnostics" && request.method === "GET") {
  const data = store.snapshot();
  const tools = await executionManager.listTools();
  sendJson(response, 200, {
  status: "ok",
  dataVersion: data.version,
  projectCount: data.projects.length,
  activeExecutionCount: (data.executions || []).filter((execution) =>
  ["pending_confirmation", "running", "cancelling"].includes(execution.status),
  ).length,
  allowedWorkspaceCount: (data.bridge?.allowedWorkspaces || []).length,
  backupCount: store.listBackups().length,
  adapters: tools.map((tool) => ({
  id: tool.id,
  connectorType: tool.connectorType,
  connectionStatus: tool.connectionStatus,
  supportsExecution: tool.supportsExecution,
  })),
  });
  return;
  }

  if (url.pathname === "/api/local-tools" && request.method === "GET") {
  sendJson(response, 200, await executionManager.listTools());
  return;
  }

  if (url.pathname === "/api/agent-adapters" && request.method === "GET") {
  const tools = await executionManager.listTools();
  const data = store.snapshot();
  sendJson(response, 200, createAdapterDirectory({ localTools: tools, adapterConfigs: data.agentAdapters }));
  return;
  }

  if (url.pathname === "/api/executions" && request.method === "GET") {
  sendJson(response, 200, executionManager.getExecutions(url.searchParams.get("projectId")));
  return;
  }

  if (url.pathname === "/api/deployments/preview" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, deploymentManager.preview(body));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "deployments" && segments[2] && segments[3] === "confirm" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, deploymentManager.confirm({
  deploymentId: segments[2],
  confirmationToken: body.confirmationToken,
  confirm: body.confirm,
  }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "alice-dispatches" && segments[2] && segments[3] === "confirm" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(
  response,
  202,
  await aliceCoordinator.confirm({
  dispatchId: segments[2],
  confirmationToken: body.confirmationToken,
  confirm: body.confirm,
  }),
  );
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "executions" && segments[2] && segments[3] === "cancel" && request.method === "POST") {
  try {
  sendJson(response, 200, executionManager.cancel(segments[2]));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "executions" && segments[2] && segments[3] === "retry" && request.method === "POST") {
  try {
  sendJson(response, 201, executionManager.retry(segments[2]));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (url.pathname === "/api/executions/preview" && request.method === "POST") {
  const body = await readJson(request);
  const project = findProject(store.snapshot(), body.projectId);
  if (!project) {
  sendError(response, 404, "项目不存在");
  return;
  }
  try {
  sendJson(response, 201, executionManager.preview(body));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "executions" && segments[2] && segments[3] === "confirm" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(
  response,
  202,
  executionManager.confirm({
  executionId: segments[2],
  confirmationToken: body.confirmationToken,
  confirmWrite: body.confirmWrite,
  }),
  );
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "executions" && segments[2] && request.method === "GET") {
  const execution = executionManager.getExecution(segments[2]);
  if (!execution) {
  sendError(response, 404, "执行任务不存在");
  return;
  }
  sendJson(response, 200, execution);
  return;
  }

  if (url.pathname === "/api/reset" && request.method === "POST") {
    sendJson(response, 200, store.reset());
    return;
  }

  return false;
};
