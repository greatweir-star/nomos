"use strict";
const { sendJson, sendError, readJson, addMessage, summarizeProject } = require("../utils");

module.exports = async function handleAgents(request, response, url, segments, store) {
  if (url.pathname === "/api/agents" && request.method === "GET") {
  const data = store.snapshot();
  const localTools = await executionManager.listTools();
  sendJson(response, 200, mergeAgentConnections(data.agents, localTools, data.agentAdapters));
  return;
  }

  if (url.pathname === "/api/agent-directory" && request.method === "GET") {
  const data = store.snapshot();
  const localTools = await executionManager.listTools();
  const technicalAdapters = createAdapterDirectory({
  localTools,
  adapterConfigs: data.agentAdapters,
  });
  const agents = mergeAgentConnections(data.agents, localTools, data.agentAdapters);
  sendJson(response, 200, {
  agents,
  technicalAdapters,
  summary: {
  carbonEmployees: agents.filter((agent) => agent.employee?.employmentType === "carbon").length,
  siliconEmployees: agents.filter((agent) => agent.employee?.employmentType === "silicon").length,
  hybridEmployees: agents.filter((agent) => agent.employee?.employmentType === "hybrid").length,
  localAdapters: technicalAdapters.filter((adapter) => adapter.scope === "local").length,
  cloudAdapters: technicalAdapters.filter((adapter) => adapter.scope === "cloud").length,
  connectedAdapters: technicalAdapters.filter((adapter) =>
  ["connected", "configured"].includes(adapter.connectionStatus)
  ).length,
  },
  });
  return;
  }

  if (segments[1] === "agents" && segments[2] && request.method === "PATCH") {
  const body = await readJson(request);
  const agent = store.update((data) => {
  const target = data.agents.find((item) => item.id === segments[2]);
  if (!target) return null;
  for (const field of ["alias", "role", "status"]) {
  if (typeof body[field] === "string") target[field] = body[field].trim();
  }
  store.audit("agent.update", `更新 Agent：${target.name}`, { agentId: target.id });
  return target;
  });
  if (!agent) {
  sendError(response, 404, "Agent 不存在");
  return;
  }
  sendJson(response, 200, agent);
  return;
  }

  return false;
};
