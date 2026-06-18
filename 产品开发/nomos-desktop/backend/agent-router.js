"use strict";

const { buildAgentTaskEnvelope } = require("./workflow");

const ROUTE_PREFERENCES = {
  develop: ["codex-cli", "claude-code", "kimi-cli", "alice"],
  test: ["claude-code", "codex-cli", "kimi-cli", "alice"],
  prd: ["kimi-cli", "alice", "tencent-hunyuan-agent", "tencent-yuanqi"],
  design: ["alice", "kimi-cli", "tencent-hunyuan-agent"],
  deploy: ["alice", "codex-cli", "tencent-cloud-agent"],
};

const WORK_ITEM_INTENT_PREFERENCES = {
  code: ["codex-cli", "claude-code", "kimi-cli", "alice"],
  review: ["claude-code", "codex-cli", "kimi-cli", "alice"],
  research: ["kimi-cli", "alice", "claude-code", "codex-cli"],
  content: ["kimi-cli", "alice", "claude-code"],
  coordination: ["alice", "kimi-cli", "claude-code", "codex-cli"],
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

function inferWorkItemIntent(workItem) {
  const text = [
    workItem.title,
    workItem.description,
    workItem.acceptanceCriteria,
    workItem.roleId,
    workItem.legacyStageKey,
    workItem.flowStageName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/test|qa|验收|测试|review|复核|检查|审查/.test(text)) return "review";
  if (/code|develop|dev|实现|开发|修复|bug|接口|前端|后端|脚本|测试用例/.test(text)) return "code";
  if (/research|调研|资料|竞品|分析|洞察|长上下文|文档/.test(text)) return "research";
  if (/content|copy|文案|文章|发布说明|报告|总结/.test(text)) return "content";
  return "coordination";
}

function resolveWorkItemRoute({ workItem, project, tools, requestedAgentId }) {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const requested = String(requestedAgentId || "").trim();
  const intent = inferWorkItemIntent(workItem);
  const stagePreferences = workItem.legacyStageKey ? ROUTE_PREFERENCES[workItem.legacyStageKey] : null;
  const preferences = requested
    ? [requested]
    : [
        ...(WORK_ITEM_INTENT_PREFERENCES[intent] || WORK_ITEM_INTENT_PREFERENCES.coordination),
        ...(stagePreferences || []),
      ].filter((id, index, values) => values.indexOf(id) === index);
  const selected = preferences.map((id) => toolById.get(id)).find(isUsable);

  if (!selected) {
    if (requested && toolById.has(requested)) {
      const tool = toolById.get(requested);
      throw new Error(`${tool.name} 当前不可派发`);
    }
    throw new Error("当前没有可用的 Agent 适配器");
  }

  return {
    idempotencyKey: routeKey(workItem.id, selected.id, 1),
    workItemId: workItem.id,
    projectId: workItem.projectId,
    projectTitle: project?.title || workItem.projectTitle || "未知项目",
    intent,
    selectedAgent: publicAdapter(selected),
    candidates: preferences.map((id) => toolById.get(id)).filter(Boolean).map(publicAdapter),
    reason: requested
      ? `按照人工指定路由到 ${selected.name}`
      : `${workItem.title} 识别为 ${intent} 工作项，优先使用 ${selected.name}`,
  };
}

module.exports = { resolveAgentRoute, resolveWorkItemRoute, routeKey };
