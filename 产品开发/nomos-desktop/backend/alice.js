"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { buildAgentTaskEnvelope, ensureProjectWorkflow, markTaskDispatched, submitStageReceipt } = require("./workflow");
const { routeKey } = require("./agent-router");
const { extractSessionId, parseAgentReceipt } = require("./agent-receipt");
const { updateWorkItem, addComment } = require("./work-items");

const MAX_MESSAGE_CHARS = 6000;
const PREVIEW_TTL_MS = 10 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getAliceConfig() {
  const pointer = readJsonFile(path.join(os.homedir(), ".alice-pointer.json"));
  const dataDir = pointer?.dataDir || "D:\\Alice\\AliceData";
  return readJsonFile(path.join(dataDir, "cli", "config.json"));
}

function parseSse(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

async function requestAlice(config, payload, sessionId) {
  if (!config?.serverUrl || !config?.token) throw new Error("Alice MCP 尚未配置");
  const response = await fetch(config.serverUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Alice MCP 请求失败：HTTP ${response.status}`);
  return { response, messages: text ? parseSse(text) : [] };
}

async function connectAlice(config) {
  const initialized = await requestAlice(config, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "nomos", version: "1.0.1" },
    },
  });
  const sessionId = initialized.response.headers.get("mcp-session-id");
  await requestAlice(config, { jsonrpc: "2.0", method: "notifications/initialized", params: {} }, sessionId);
  return sessionId;
}

async function callAliceTool(name, args, { maxChars = 1000 } = {}) {
  const config = getAliceConfig();
  const sessionId = await connectAlice(config);
  const result = await requestAlice(
    config,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: args },
    },
    sessionId,
  );
  const response = result.messages.find((item) => item.id === 2);
  if (!response) throw new Error("Alice MCP 未返回派发结果");
  if (response.error) throw new Error(response.error.message || "Alice MCP 派发失败");
  return {
    content: (response.result?.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n")
      .slice(0, maxChars),
  };
}

async function sendAliceMessage({ message }) {
  return callAliceTool("alice_send_message", { message });
}

async function readAliceConversation({ sessionId }) {
  return callAliceTool("alice_read_conversation", { sessionId, limit: 50, offset: 0 }, { maxChars: 100000 });
}

async function listAliceConversations() {
  return callAliceTool("alice_list_conversations", {}, { maxChars: 100000 });
}

async function getAliceConversationStatus({ sessionId }) {
  return callAliceTool("alice_get_conversation_status", { sessionId });
}

async function getAliceWorkspace({ sessionId }) {
  return callAliceTool("alice_get_workspace", { sessionId });
}

function parseAliceJson(content, fallback) {
  try {
    return JSON.parse(String(content || ""));
  } catch {
    return fallback;
  }
}

function normalizeAliceSessions(content) {
  const parsed = parseAliceJson(content, []);
  const sessions = Array.isArray(parsed) ? parsed : parsed.sessions || parsed.conversations || [];
  return sessions
    .filter((session) => session?.id || session?.sessionId)
    .map((session) => ({
      id: String(session.id || session.sessionId),
      title: String(session.title || "Untitled Alice conversation"),
      createdAt: session.createdAt || null,
      updatedAt: session.updatedAt || null,
      messageCount: Number(session.messageCount || 0),
      archived: Boolean(session.archived),
    }))
    .slice(0, 30);
}

function publicPreview(preview) {
  const { tokenHash, ...safePreview } = preview;
  return safePreview;
}

function buildTaskMessage(envelope) {
  return [
    "nomos 本地项目协调任务",
    `项目：${envelope.projectTitle}`,
    `目标：${envelope.projectGoal}`,
    `阶段：${envelope.stageTitle}（第 ${envelope.attempt} 轮）`,
    `当前责任 Agent：${envelope.ownerName}`,
    `任务 ID：${envelope.taskId}`,
    `执行要求：${envelope.instructions}`,
    envelope.inputAssets.length ? `输入资料：${envelope.inputAssets.join("、")}` : "输入资料：暂无",
    envelope.note ? `补充说明：${envelope.note}` : "",
    "请根据当前阶段要求协调处理，并在完成后返回成果摘要、交付物和需要人工确认的事项。",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_MESSAGE_CHARS);
}

function buildWorkItemTaskMessage({ project, workItem, note = "" }) {
  return [
    "nomos 工作项协作任务",
    `项目：${project?.title || workItem.projectTitle || workItem.projectId}`,
    project?.goal ? `项目目标：${project.goal}` : "",
    `工作项：${workItem.title}`,
    workItem.description ? `任务描述：${workItem.description}` : "",
    workItem.acceptanceCriteria ? `验收标准：${workItem.acceptanceCriteria}` : "",
    workItem.dueAt ? `截止时间：${workItem.dueAt}` : "",
    note ? `补充说明：${note}` : "",
    "请协调处理该工作项，并在完成后返回进度、成果摘要、交付物和需要人工确认的事项。",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_MESSAGE_CHARS);
}

class AliceCoordinator {
  constructor({
    store,
    sendMessage = sendAliceMessage,
    readConversation = readAliceConversation,
    listConversations = listAliceConversations,
    getConversationStatus = getAliceConversationStatus,
    getWorkspace = getAliceWorkspace,
  }) {
    this.store = store;
    this.sendMessage = sendMessage;
    this.readConversation = readConversation;
    this.listConversations = listConversations;
    this.getConversationStatus = getConversationStatus;
    this.getWorkspace = getWorkspace;
    this.previews = new Map();
  }

  preview({ projectId, stageKey, note = "" }) {
    const project = this.store.snapshot().projects.find((item) => item.id === projectId);
    if (!project) throw new Error("项目不存在");
    ensureProjectWorkflow(project);
    const envelope = buildAgentTaskEnvelope(project, stageKey, note);
    const stage = project.stages.find((item) => item.key === stageKey);
    const task = project.workflowTasks.find((item) => item.id === stage.activeTaskId);
    if (task.dispatchedTo === "alice") throw new Error("当前任务已经派发给 Alice");
    const confirmationToken = randomUUID();
    const preview = {
      id: randomUUID(),
      projectId,
      stageKey,
      taskId: task.id,
      target: "Alice MCP",
      status: "pending_confirmation",
      message: buildTaskMessage(envelope),
      tokenHash: hashToken(confirmationToken),
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
    };
    this.previews.set(preview.id, preview);
    return { dispatch: publicPreview(preview), confirmationToken };
  }

  previewWorkItem({ workItem, project, note = "" }) {
    if (!workItem) throw new Error("工作项不存在");
    const confirmationToken = randomUUID();
    const preview = {
      id: randomUUID(),
      projectId: workItem.projectId,
      workItemId: workItem.id,
      target: "Alice MCP",
      status: "pending_confirmation",
      message: buildWorkItemTaskMessage({ project, workItem, note }),
      tokenHash: hashToken(confirmationToken),
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
    };
    this.previews.set(preview.id, preview);
    return { dispatch: publicPreview(preview), confirmationToken };
  }

  async confirm({ dispatchId, confirmationToken, confirm }) {
    const preview = this.previews.get(dispatchId);
    if (!preview) throw new Error("Alice 派发预览不存在或已经失效");
    if (Date.now() > new Date(preview.expiresAt).getTime()) {
      this.previews.delete(dispatchId);
      throw new Error("Alice 派发预览已经过期，请重新生成");
    }
    if (confirm !== true) throw new Error("派发给 Alice 需要明确确认");
    if (hashToken(String(confirmationToken || "")) !== preview.tokenHash) {
      throw new Error("Alice 派发确认令牌无效");
    }

    const result = await this.sendMessage({ message: preview.message });
    const dispatchedAt = nowIso();
    if (preview.workItemId) {
      const dispatched = this.store.update((data) => {
        const item = (data.workItems || []).find((record) => record.id === preview.workItemId);
        const project = data.projects.find((record) => record.id === preview.projectId);
        if (!item) throw new Error("工作项不存在");
        const updated = updateWorkItem(
          data,
          item.id,
          {
            status: "in_progress",
            assignee: { type: "agent", id: "alice", name: "Alice" },
          },
          { actor: { type: "system", name: "Nomos Dispatcher" } },
        );
        addComment(
          data,
          item.id,
          `已派发给 Alice 协调处理。${String(result.content || "").slice(0, 500)}`,
          { actor: { type: "agent", id: "alice", name: "Alice" } },
        );
        if (project) {
          project.messages.push({
            id: randomUUID(),
            authorId: "project-steward",
            authorName: "项目总管",
            authorType: "cloud",
            text: `已将工作项「${updated.title}」派发给 Alice 协调处理。`,
            createdAt: dispatchedAt,
          });
          project.updatedAt = dispatchedAt;
        }
        this.store.audit("alice.workitem.dispatch", "派发工作项给 Alice MCP", {
          projectId: preview.projectId,
          workItemId: preview.workItemId,
        });
        return {
          ...publicPreview(preview),
          status: "dispatched",
          dispatchedAt,
          result: result.content || "",
          workItem: updated,
        };
      });
      this.previews.delete(dispatchId);
      return dispatched;
    }
    const dispatched = this.store.update((data) => {
      const project = data.projects.find((item) => item.id === preview.projectId);
      if (!project) throw new Error("项目不存在");
      ensureProjectWorkflow(project);
      const task = project.workflowTasks.find((item) => item.id === preview.taskId);
      if (!task) throw new Error("任务信封不存在");
      markTaskDispatched(project, {
        taskId: task.id,
        agentId: "alice",
        agentName: "Alice",
        adapterType: "MCP",
        externalRef: extractSessionId(result.content),
        idempotencyKey: routeKey(task.id, "alice", task.attempt),
      });
      task.dispatchResult = String(result.content || "").slice(0, 1000);
      project.messages.push({
        id: randomUUID(),
        authorId: "project-steward",
        authorName: "项目总管",
        authorType: "cloud",
        text: `已将${project.stages.find((stage) => stage.key === preview.stageKey)?.title || preview.stageKey}任务派发给 Alice 协调处理。`,
        createdAt: dispatchedAt,
      });
      project.updatedAt = dispatchedAt;
      this.store.audit("alice.dispatch", "派发任务给 Alice MCP", {
        projectId: preview.projectId,
        stageKey: preview.stageKey,
        taskId: preview.taskId,
      });
      return {
        ...publicPreview(preview),
        status: "dispatched",
        dispatchedAt,
        result: result.content || "",
      };
    });
    this.previews.delete(dispatchId);
    return dispatched;
  }

  async sync({ projectId, stageKey, sessionId, confirm }) {
    if (confirm !== true) throw new Error("Synchronizing an Alice receipt requires explicit confirmation.");
    const project = this.store.snapshot().projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found.");
    ensureProjectWorkflow(project);
    const stage = project.stages.find((item) => item.key === stageKey);
    const task = project.workflowTasks.find((item) => item.id === stage?.activeTaskId);
    if (!stage || !task) throw new Error("Active workflow task not found.");
    if (task.dispatchedTo !== "alice") throw new Error("The active task has not been dispatched to Alice.");
    const conversationId = String(sessionId || task.externalRef || "").trim();
    if (!conversationId) throw new Error("Please provide the Alice conversation ID.");
    const result = await this.readConversation({ sessionId: conversationId });
    const normalized = parseAgentReceipt(result.content, {
      status: "progress",
      summary: "Alice conversation synchronized. No structured completion receipt was found.",
    });
    return this.store.update((data) => {
      const currentProject = data.projects.find((item) => item.id === projectId);
      if (!currentProject) throw new Error("Project not found.");
      ensureProjectWorkflow(currentProject);
      const currentTask = currentProject.workflowTasks.find((item) => item.id === task.id);
      currentTask.externalRef = conversationId;
      const receiptResult = submitStageReceipt(currentProject, {
        ...normalized,
        stageKey,
        agentId: "alice",
        agentName: "Alice",
        agentType: "local",
        source: "alice-sync",
      });
      this.store.audit("alice.receipt.sync", "Synchronize Alice conversation receipt", {
        projectId,
        stageKey,
        taskId: task.id,
        sessionId: conversationId,
        receiptId: receiptResult.receipt.id,
      });
      return receiptResult;
    });
  }

  async sessions({ projectId, stageKey }) {
    const project = this.store.snapshot().projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found.");
    ensureProjectWorkflow(project);
    const stage = project.stages.find((item) => item.key === stageKey);
    const task = project.workflowTasks.find((item) => item.id === stage?.activeTaskId);
    if (!stage || !task) throw new Error("Active workflow task not found.");
    if (task.dispatchedTo !== "alice") throw new Error("The active task has not been dispatched to Alice.");
    const result = await this.listConversations();
    const sessions = normalizeAliceSessions(result.content);
    const linkedSessionId = String(task.externalRef || "").trim() || null;
    let linkedSession = null;
    if (linkedSessionId) {
      const [status, workspace] = await Promise.all([
        this.getConversationStatus({ sessionId: linkedSessionId }).catch(() => null),
        this.getWorkspace({ sessionId: linkedSessionId }).catch(() => null),
      ]);
      linkedSession = {
        id: linkedSessionId,
        status: parseAliceJson(status?.content, status?.content || null),
        workspace: parseAliceJson(workspace?.content, workspace?.content || null),
      };
    }
    return { linkedSessionId, linkedSession, sessions };
  }
}

module.exports = {
  AliceCoordinator,
  buildTaskMessage,
  buildWorkItemTaskMessage,
  getAliceConversationStatus,
  getAliceWorkspace,
  listAliceConversations,
  normalizeAliceSessions,
  readAliceConversation,
};
