"use strict";

const { buildAgentTaskEnvelope } = require("./workflow");

const ROUTE_PREFERENCES = {
  develop: ["codex-cli", "claude-code", "alice"],
  test: ["claude-code", "codex-cli", "alice"],
  prd: ["alice", "tencent-hunyuan-agent", "tencent-yuanqi"],
  design: ["alice", "tencent-hunyuan-agent"],
  deploy: ["alice", "tencent-cloud-agent"],
};

function routeKey(taskId, agentId, attempt) {
  return `${taskId}:${agentId}:${attempt}`;
}

function publicAdapter(tool) {
  return {
    id: tool.id,
    name: tool.name,
    connectorType: tool.connectorType,
    provider: tool.provider,
    scope: tool.scope,
    supportsDispatch: tool.supportsDispatch !== false,
    supportsExecution: tool.supportsExecution === true,
    dispatchMode: tool.dispatchMode || "local-process",
    receiptMode: tool.receiptMode || "process-exit",
    connectionStatus: tool.connectionStatus,
  };
}

function isUsable(tool) {
  return tool && tool.supportsDispatch !== false && ["connected", "configured"].includes(tool.connectionStatus);
}

function resolveAgentRoute({ project, stageKey, tools, requestedAgentId }) {
  const envelope = buildAgentTaskEnvelope(project, stageKey);
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const preferences = ROUTE_PREFERENCES[stageKey] || ["alice", "codex-cli", "claude-code"];
  const requested = String(requestedAgentId || "").trim();
  const candidates = requested ? [requested] : preferences;
  const selected = candidates.map((id) => toolById.get(id)).find(isUsable);

  if (!selected) {
    if (requested && toolById.has(requested)) {
      const tool = toolById.get(requested);
      throw new Error(`${tool.name} 当前不可派发`);
    }
    throw new Error("当前没有可用的 Agent 适配器");
  }

  return {
    idempotencyKey: routeKey(envelope.taskId, selected.id, envelope.attempt),
    taskId: envelope.taskId,
    stageKey: envelope.stageKey,
    attempt: envelope.attempt,
    selectedAgent: publicAdapter(selected),
    candidates: preferences.map((id) => toolById.get(id)).filter(Boolean).map(publicAdapter),
    reason: requested
      ? `按照人工指定路由到 ${selected.name}`
      : `${envelope.stageTitle}阶段优先使用 ${selected.name}`,
  };
}

module.exports = { resolveAgentRoute, routeKey };
