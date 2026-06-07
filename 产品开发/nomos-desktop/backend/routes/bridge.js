"use strict";
const { sendJson, sendError, readJson, addMessage, summarizeProject } = require("../utils");
const { createAdapterDirectory, enrichAgents } = require("../agent-registry");
const { createBridgePayload } = require("../utils");

module.exports = async function handleBridge(request, response, url, segments, store) {
  if (url.pathname === "/api/bridge" && request.method === "GET") {
  const data = store.snapshot();
  const tools = await executionManager.listTools();
  sendJson(response, 200, createBridgePayload(data, tools));
  return;
  }

  if (url.pathname === "/api/bridge/pair" && request.method === "POST") {
  const body = await readJson(request);
  const aliases = body.aliases || {};
  const bridge = store.update((data) => {
  data.bridge.status = "online";
  data.bridge.pairedAt = new Date().toISOString();
  for (const agent of data.agents.filter((item) => item.type === "local")) {
  agent.paired = true;
  if (typeof aliases[agent.id] === "string" && aliases[agent.id].trim()) {
  agent.alias = aliases[agent.id].trim();
  }
  }
  store.audit("bridge.pair", "保存本地 Agent 配对");
  return data.bridge;
  });
  const data = store.snapshot();
  const tools = await executionManager.listTools({ refresh: true });
  sendJson(response, 200, { ...bridge, ...createBridgePayload(data, tools) });
  return;
  }

  if (url.pathname === "/api/bridge/refresh" && request.method === "POST") {
  const data = store.snapshot();
  const tools = await executionManager.listTools({ refresh: true });
  sendJson(response, 200, createBridgePayload(data, tools));
  return;
  }

  if (url.pathname === "/api/bridge/openclaw/start" && request.method === "POST") {
  const body = await readJson(request);
  try {
  const gateway = await executionManager.startOpenClawGateway(body);
  const data = store.snapshot();
  const tools = await executionManager.listTools({ refresh: true });
  sendJson(response, 200, { gateway, bridge: createBridgePayload(data, tools) });
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (url.pathname === "/api/bridge/workspaces/allow" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 201, executionManager.allowWorkspace(body));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (url.pathname === "/api/bridge/workspaces/revoke" && request.method === "POST") {
  const body = await readJson(request);
  try {
  sendJson(response, 200, executionManager.revokeWorkspace(body));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "bridge" && segments[2] === "adapters" && segments[3] && request.method === "PATCH") {
  const body = await readJson(request);
  try {
  sendJson(response, 200, await executionManager.configureAdapter({
  agentId: segments[3],
  command: body.command,
  confirm: body.confirm,
  }));
  } catch (error) {
  sendError(response, 400, error.message);
  }
  return;
  }

  if (segments[1] === "agent-adapters" && segments[2] && segments[3] === "configure" && request.method === "PATCH") {
  const body = await readJson(request);
  if (body.confirm !== true) {
  sendError(response, 400, "配置云端智能体接入需要明确确认");
  return;
  }
  const adapterId = segments[2];
  const configured = store.update((data) => {
  data.agentAdapters = data.agentAdapters || {};
  const current = data.agentAdapters[adapterId] || {};
  data.agentAdapters[adapterId] = {
  status: body.status === "disabled" ? "disabled" : "configured",
  endpoint: typeof body.endpoint === "string" ? body.endpoint.trim().slice(0, 500) : current.endpoint || "",
  workspace: typeof body.workspace === "string" ? body.workspace.trim().slice(0, 200) : current.workspace || "",
  tokenConfigured: Boolean(body.tokenConfigured),
  updatedAt: new Date().toISOString(),
  };
  store.audit("agent-adapter.configure", `配置技术架构适配器：${adapterId}`, {
  adapterId,
  tokenConfigured: Boolean(body.tokenConfigured),
  });
  return data.agentAdapters[adapterId];
  });
  sendJson(response, 200, configured);
  return;
  }

  // ─── Organization Management API ───────────────────────────────

  return false;
};
