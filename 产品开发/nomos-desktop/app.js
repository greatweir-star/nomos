"use strict";

const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "请求失败");
    return payload;
  },
  workspace() {
    return this.request("/api/workspace");
  },
  project(id) {
    return this.request(`/api/projects/${id}`);
  },
  createProject(payload) {
    return this.request("/api/projects", { method: "POST", body: JSON.stringify(payload) });
  },
  updateProject(projectId, payload) {
    return this.request(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteProject(projectId) {
    return this.request(`/api/projects/${projectId}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    });
  },
  addAsset(projectId, payload) {
    return this.request(`/api/projects/${projectId}/assets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteAsset(projectId, assetId) {
    return this.request(`/api/projects/${projectId}/assets/${assetId}`, { method: "DELETE" });
  },
  sendMessage(projectId, text) {
    return this.request(`/api/projects/${projectId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  advance(projectId) {
    return this.request(`/api/projects/${projectId}/advance`, { method: "POST" });
  },
  workflow(projectId) {
    return this.request(`/api/projects/${projectId}/workflow`);
  },
  agentRoute(projectId, stageKey, agentId = "") {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/agent-route?agentId=${encodeURIComponent(agentId)}`);
  },
  submitStageReceipt(projectId, stageKey, payload) {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/receipts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  submitAgentReceipt(projectId, stageKey, agentId, payload) {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/agents/${agentId}/receipts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  syncAliceReceipt(projectId, stageKey, sessionId) {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/agents/alice/sync`, {
      method: "POST",
      body: JSON.stringify({ sessionId, confirm: true }),
    });
  },
  aliceSessions(projectId, stageKey) {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/agents/alice/sessions`);
  },
  returnStage(projectId, stageKey, targetStageKey, reason) {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/return`, {
      method: "POST",
      body: JSON.stringify({ targetStageKey, reason, confirm: true }),
    });
  },
  previewAliceDispatch(projectId, stageKey, note = "") {
    return this.request(`/api/projects/${projectId}/stages/${stageKey}/alice/preview`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
  confirmAliceDispatch(dispatchId, confirmationToken) {
    return this.request(`/api/alice-dispatches/${dispatchId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmationToken, confirm: true }),
    });
  },
  resolveCheckpoint(projectId, checkpointId, action, note = "") {
    return this.request(`/api/projects/${projectId}/checkpoints/${checkpointId}`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    });
  },
  bridge() {
    return this.request("/api/bridge");
  },
  pairBridge(aliases) {
    return this.request("/api/bridge/pair", {
      method: "POST",
      body: JSON.stringify({ aliases }),
    });
  },
  refreshBridge() {
    return this.request("/api/bridge/refresh", { method: "POST" });
  },
  startOpenClawGateway(acceptRisk) {
    return this.request("/api/bridge/openclaw/start", {
      method: "POST",
      body: JSON.stringify({ confirm: true, acceptRisk }),
    });
  },
  allowWorkspace(workspaceDir) {
    return this.request("/api/bridge/workspaces/allow", {
      method: "POST",
      body: JSON.stringify({ workspaceDir, confirm: true }),
    });
  },
  revokeWorkspace(workspaceDir) {
    return this.request("/api/bridge/workspaces/revoke", {
      method: "POST",
      body: JSON.stringify({ workspaceDir, confirm: true }),
    });
  },
  configureAdapter(agentId, command) {
    return this.request(`/api/bridge/adapters/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify({ command, confirm: true }),
    });
  },
  audit() {
    return this.request("/api/audit");
  },
  createBackup(reason = "manual") {
    return this.request("/api/system/backups", {
      method: "POST",
      body: JSON.stringify({ reason, confirm: true }),
    });
  },
  backups() {
    return this.request("/api/system/backups");
  },
  inspectBackup(fileName) {
    return this.request(`/api/system/backups/${encodeURIComponent(fileName)}/inspect`);
  },
  restoreBackup(fileName) {
    return this.request(`/api/system/backups/${encodeURIComponent(fileName)}/restore`, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
  },
  executions(projectId) {
    return this.request(`/api/executions?projectId=${encodeURIComponent(projectId)}`);
  },
  previewExecution(payload) {
    return this.request("/api/executions/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  confirmExecution(executionId, confirmationToken, confirmWrite) {
    return this.request(`/api/executions/${executionId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmationToken, confirmWrite }),
    });
  },
  cancelExecution(executionId) {
    return this.request(`/api/executions/${executionId}/cancel`, { method: "POST" });
  },
  retryExecution(executionId) {
    return this.request(`/api/executions/${executionId}/retry`, { method: "POST" });
  },
  previewDeployment(payload) {
    return this.request("/api/deployments/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  confirmDeployment(deploymentId, confirmationToken) {
    return this.request(`/api/deployments/${deploymentId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmationToken, confirm: true }),
    });
  },
};

const state = {
  workspace: null,
  project: null,
  selectedStageId: null,
  executions: [],
  activeTab: "overview",
  audit: [],
  agentRoute: null,
  backups: [],
  projectSearch: "",
};

const projectList = document.querySelector(".workspace .project-list");
const agentList = document.querySelectorAll(".workspace .project-list")[1];
const pipeline = document.getElementById("pipeline");
const activityList = document.querySelector(".activity-list");
const inspectorAgents = document.querySelector(".inspector .connection-list");
const assetList = document.querySelector(".inspector .file-list");
const messageInput = document.querySelector(".composer textarea");
const sendButton = document.querySelector(".composer .send");
const newProjectButton = document.querySelector(".workspace-head .round-action");
const dispatchButton = document.getElementById("dispatchButton");
const checkpointPrimary = document.querySelector(".checkpoint-actions .button.dark");
const checkpointSecondary = document.querySelector(".checkpoint-actions .button:not(.dark)");
const overviewPanel = document.getElementById("overviewPanel");
const emptyPanel = document.getElementById("emptyPanel");
const bridgeModal = document.getElementById("bridgeModal");
const actionModal = document.getElementById("actionModal");
const actionModalForm = document.getElementById("actionModalForm");
const appShell = document.querySelector(".app-shell");
const projectSearch = document.querySelector(".project-search");
let actionModalResolve = null;

function ensureExecutionPanel() {
  let section = document.getElementById("localExecutionSection");
  if (section) return section;
  section = document.createElement("section");
  section.className = "inspector-section";
  section.id = "localExecutionSection";
  const tools = state.workspace.localTools || [];
  section.innerHTML = `
    <div class="inspector-label">本地执行</div>
    <div class="execution-panel">
      <select class="execution-select" id="executionAgent">
        ${tools
          .map(
            (tool) =>
              `<option value="${escapeHtml(tool.id)}" ${tool.supportsExecution ? "" : "disabled"}>${escapeHtml(tool.name)}${tool.supportsExecution ? "" : " · 暂不可执行"}</option>`,
          )
          .join("")}
      </select>
      <div class="execution-actions">
        <button class="button" data-execution-mode="read-only">只读分析</button>
        <button class="button primary" data-execution-mode="workspace-write">代码写入</button>
      </div>
      <div id="executionList"></div>
    </div>
  `;
  document.querySelector(".inspector-body").appendChild(section);
  section.addEventListener("click", (event) => {
    const button = event.target.closest("[data-execution-mode]");
    if (!button) return;
    run(() => startLocalExecution(button.dataset.executionMode));
  });
  return section;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function closeActionModal(result = null) {
  actionModal.classList.remove("open");
  const resolve = actionModalResolve;
  actionModalResolve = null;
  if (resolve) resolve(result);
}

function openActionModal({
  title,
  description = "",
  fields = [],
  confirmLabel = "确认",
  danger = false,
}) {
  if (actionModalResolve) closeActionModal(null);
  document.getElementById("actionModalTitle").textContent = title;
  document.getElementById("actionModalCopy").innerHTML = escapeHtml(description).replaceAll("\n", "<br>");
  document.getElementById("actionModalFields").innerHTML = fields
    .map((field) => {
      const required = field.required === false ? "" : "required";
      const value = escapeHtml(field.value || "");
      const input =
        field.type === "textarea"
          ? `<textarea name="${escapeHtml(field.name)}" ${required} placeholder="${escapeHtml(field.placeholder || "")}">${value}</textarea>`
          : `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" value="${value}" ${required} placeholder="${escapeHtml(field.placeholder || "")}" />`;
      return `<label class="form-field"><span>${escapeHtml(field.label)}</span>${input}</label>`;
    })
    .join("");
  const confirmButton = document.getElementById("actionModalConfirm");
  confirmButton.textContent = confirmLabel;
  confirmButton.classList.toggle("danger", danger);
  confirmButton.classList.toggle("primary", !danger);
  actionModal.classList.add("open");
  const firstInput = actionModal.querySelector("input, textarea");
  if (firstInput) setTimeout(() => firstInput.focus(), 0);
  return new Promise((resolve) => {
    actionModalResolve = resolve;
  });
}

async function askText(title, label, value = "", options = {}) {
  const result = await openActionModal({
    title,
    description: options.description || "",
    confirmLabel: options.confirmLabel || "继续",
    fields: [{ name: "value", label, value, type: options.type, required: options.required }],
  });
  return result ? result.value : null;
}

async function askConfirm(description, options = {}) {
  return Boolean(
    await openActionModal({
      title: options.title || "请确认操作",
      description,
      confirmLabel: options.confirmLabel || "确认",
      danger: options.danger || false,
    }),
  );
}

actionModalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  closeActionModal(Object.fromEntries(new FormData(actionModalForm).entries()));
});
actionModal.querySelectorAll("[data-action-modal-close]").forEach((button) => {
  button.addEventListener("click", () => closeActionModal(null));
});
actionModal.addEventListener("click", (event) => {
  if (event.target === actionModal) closeActionModal(null);
});

function iconFor(value) {
  return escapeHtml(String(value || "A").slice(0, 2).toUpperCase());
}

function showToast(message, type = "ok") {
  let toast = document.getElementById("runtimeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "runtimeToast";
    toast.style.cssText =
      "position:fixed;right:22px;bottom:22px;z-index:20;padding:11px 14px;border-radius:10px;color:white;font-size:12px;font-weight:700;box-shadow:0 12px 34px rgba(20,30,27,.18);transition:180ms ease";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === "error" ? "#b95349" : "#315e50";
  toast.style.opacity = "1";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2400);
}

function relativeTime(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "刚刚";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  return `${Math.floor(seconds / 86400)} 天前`;
}

function projectBadge(project) {
  if (project.team.includes("内容")) return ["稿", "warm"];
  if (project.team.includes("运营")) return ["发", "blue"];
  return ["站", ""];
}

function agentRole(agent) {
  if (agent.type !== "local" || agent.status === "online") return agent.role;
  const role = String(agent.role || "").split(" · ")[0];
  return `${role} · ${agent.connection?.statusLabel || "等待连接"}`;
}

function renderWorkspace() {
  const query = state.projectSearch.trim().toLowerCase();
  const projects = state.workspace.projects.filter((project) =>
    [project.title, project.team, project.subtitle].some((value) => String(value || "").toLowerCase().includes(query)),
  );
  projectList.innerHTML = projects.length
    ? projects
    .map((project) => {
      const [badge, color] = projectBadge(project);
      return `
        <button class="project-item ${state.project?.id === project.id ? "active" : ""}" data-live-project="${escapeHtml(project.id)}">
          <span class="project-avatar ${color}">${badge}</span>
          <span>
            <span class="project-title">${escapeHtml(project.title)}</span>
            <span class="project-copy">${escapeHtml(project.team)} · ${escapeHtml(project.subtitle)}</span>
          </span>
          <span class="tiny-count">${project.unread || ""}</span>
        </button>
      `;
    })
    .join("")
    : '<p class="empty-copy" style="padding: 4px 8px">没有匹配的项目。</p>';

  const visibleAgents = state.workspace.agents.filter(
    (agent) => agent.id === "project-steward" || agent.type === "local",
  );
  agentList.innerHTML = visibleAgents
    .map(
      (agent) => `
        <article class="project-item agent-item">
          <span class="project-avatar ${agent.type === "local" ? "blue" : ""}">${iconFor(agent.alias || agent.name)}</span>
          <span>
            <span class="project-title">${escapeHtml(agent.name)}</span>
            <span class="project-copy">${escapeHtml(agentRole(agent))}</span>
          </span>
          <span class="${agent.status === "online" ? "online" : "pending"}"></span>
        </article>
      `,
    )
    .join("");

  const localAgents = state.workspace.agents.filter((agent) => agent.type === "local");
  document.querySelector(".local-status-head span:last-child").textContent =
    `${localAgents.filter((agent) => agent.status === "online").length} / ${localAgents.length}`;
}

function renderEmptyWorkspace() {
  state.project = null;
  state.executions = [];
  state.agentRoute = null;
  appShell.classList.add("workspace-empty");
  renderWorkspace();
  overviewPanel.style.display = "none";
  emptyPanel.style.display = "block";
  emptyPanel.innerHTML = `
    <section class="welcome-panel">
      <div class="welcome-mark">合</div>
      <div class="eyebrow">nomos Desktop</div>
      <h2>从第一个项目开始</h2>
      <p>创建项目并写下交付目标。nomos 会建立需求、设计、开发、测试和发布链路，再把需要你确认的节点集中呈现出来。</p>
      <div class="welcome-actions">
        <button class="button primary" type="button" data-create-first-project>创建第一个项目</button>
        <button class="button" type="button" data-open-agent-guide>检查本地 Agent</button>
      </div>
    </section>
  `;
}

function renderRuntimeSummary() {
  const activeStage =
    state.project.stages.find((stage) => ["in_progress", "review_pending", "blocked"].includes(stage.status)) ||
    state.project.stages.at(-1);
  const localAgents = state.workspace.agents.filter((agent) => agent.type === "local");
  const onlineCount = localAgents.filter((agent) => agent.status === "online").length;
  const activeExecutions = state.executions.filter((execution) =>
    ["pending_confirmation", "running", "cancelling"].includes(execution.status),
  ).length;
  const checkpoints = state.project.checkpoints.filter((checkpoint) => checkpoint.status === "pending").length;
  document.getElementById("runtimeSummary").innerHTML = `
    <article class="summary-card ${activeStage?.status === "blocked" ? "attention" : ""}">
      <span>当前阶段</span>
      <strong>${escapeHtml(activeStage?.title || "等待开始")}</strong>
    </article>
    <article class="summary-card">
      <span>本地 Agent</span>
      <strong>${onlineCount} / ${localAgents.length} 已连接</strong>
    </article>
    <article class="summary-card ${activeExecutions ? "attention" : ""}">
      <span>本地任务</span>
      <strong>${activeExecutions ? `${activeExecutions} 个处理中` : "当前空闲"}</strong>
    </article>
    <article class="summary-card ${checkpoints ? "attention" : ""}">
      <span>人工验收</span>
      <strong>${checkpoints ? `${checkpoints} 项待处理` : "暂无待办"}</strong>
    </article>
  `;
}

const stageStatus = {
  done: ["已完成", "done"],
  in_progress: ["进行中", "running"],
  review_pending: ["待验收", "running"],
  waiting: ["等待中", ""],
  blocked: ["受阻", "blocked"],
};

function renderPipeline() {
  pipeline.innerHTML = state.project.stages
    .map((stage, index) => {
      const [statusLabel, statusClass] = stageStatus[stage.status] || ["等待中", ""];
      const chipLabel = stage.ownerType === "local" && stage.status === "waiting" ? "本地执行" : statusLabel;
      const chipClass = stage.ownerType === "local" && stage.status === "waiting" ? "local" : statusClass;
      return `
        <button class="stage-card ${stage.status === "done" ? "done" : "waiting"} ${stage.id === state.selectedStageId ? "active" : ""}" data-live-stage="${escapeHtml(stage.id)}">
          <div class="stage-head">
            <span class="stage-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="chip ${chipClass}">${chipLabel}</span>
          </div>
          <h3>${escapeHtml(stage.title)}</h3>
          <p>${escapeHtml(stage.description)}</p>
          <div class="stage-meta">第 ${escapeHtml(stage.attempt || 1)} 轮 · ${(stage.deliverableIds || []).length} 份交付</div>
          <div class="agent-line"><span class="agent-dot">${escapeHtml(stage.ownerName.slice(0, 1))}</span>${escapeHtml(stage.ownerName)}</div>
        </button>
      `;
    })
    .join("");
}

function renderMessages() {
  const activeExecutions = state.executions.filter((execution) =>
    ["pending_confirmation", "running", "cancelling"].includes(execution.status),
  ).length;
  document.querySelector(".thread-head .chip").textContent = activeExecutions ? `${activeExecutions} 个本地任务处理中` : "本地任务空闲";
  document.querySelector(".thread-head .chip").classList.toggle("running", activeExecutions > 0);
  activityList.innerHTML = state.project.messages.length
    ? state.project.messages
    .slice(-5)
    .map((message) => {
      const iconClass = message.authorType === "local" ? "local" : message.authorType === "cloud" ? "system" : "";
      const localChip = message.authorType === "local" ? '<span class="chip local">本地在线</span>' : "";
      return `
        <div class="activity-item">
          <span class="activity-icon ${iconClass}">${escapeHtml(message.authorName.slice(0, 1))}</span>
          <div>
            <div class="activity-meta">
              <span class="activity-name">${escapeHtml(message.authorName)}</span>
              ${localChip}
              <span class="activity-time">${relativeTime(message.createdAt)}</span>
            </div>
            <p class="activity-copy">${escapeHtml(message.text)}</p>
          </div>
        </div>
      `;
    })
    .join("")
    : '<p class="empty-copy">还没有项目动态。补充要求或推进阶段后，记录会显示在这里。</p>';
}

function renderInspector() {
  const stage =
    state.project.stages.find((item) => item.id === state.selectedStageId) ||
    state.project.stages.find((item) => item.status === "in_progress") ||
    state.project.stages.at(-1);
  if (!stage) return;
  state.selectedStageId = stage.id;
  document.getElementById("taskTitle").textContent = stage.title;
  document.getElementById("taskDesc").textContent = stage.description;
  document.getElementById("taskOwner").textContent =
    `${stage.ownerName} · ${stage.ownerType === "local" ? "本地执行" : "云端执行"} · 第 ${stage.attempt || 1} 轮`;
  document.getElementById("taskPercent").textContent =
    stage.status === "waiting"
      ? "等待中"
      : stage.status === "review_pending"
        ? "待验收"
        : stage.status === "blocked"
          ? "受阻"
          : `${stage.progress}%`;
  document.getElementById("taskProgress").style.width = `${Math.max(stage.progress, 4)}%`;

  inspectorAgents.innerHTML = state.workspace.agents
    .filter((agent) => agent.type === "local")
    .map(
      (agent) => `
        <div class="connection-row">
          <span class="connection-icon ${agent.id === "claude-code" ? "blue" : ""}">${iconFor(agent.name.replaceAll(" ", ""))}</span>
          <span class="connection-copy">
            <span class="connection-name">${escapeHtml(agent.name)}</span>
            <span class="connection-desc">${escapeHtml(agentRole(agent))}</span>
          </span>
          <span class="${agent.status === "online" ? "online" : "pending"}"></span>
        </div>
      `,
    )
    .join("");

  assetList.innerHTML = state.project.assets.length
    ? state.project.assets
    .map(
      (asset) => `
        <div class="file-item"><span class="file-symbol">${escapeHtml(asset.type)}</span><span>${escapeHtml(asset.name)}${asset.stageKey ? `<small>${escapeHtml(asset.stageKey)}</small>` : ""}</span></div>
      `,
    )
    .join("")
    : '<p class="empty-copy">当前项目暂无资料。</p>';
  renderWorkflowPanel(stage);
  renderExecutions();
}

function ensureWorkflowPanel() {
  let section = document.getElementById("workflowReceiptSection");
  if (section) return section;
  section = document.createElement("section");
  section.className = "inspector-section";
  section.id = "workflowReceiptSection";
  document.querySelector(".inspector-body").appendChild(section);
  section.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workflow-action]");
    if (!button) return;
    run(() => handleWorkflowAction(button.dataset.workflowAction));
  });
  return section;
}

function renderWorkflowPanel(stage) {
  const section = ensureWorkflowPanel();
  const latestReceipt = state.project.taskReceipts.find((receipt) => receipt.stageKey === stage.key);
  const activeTask = (state.project.workflowTasks || []).find((task) => task.id === stage.activeTaskId);
  const suggestedReturnStage = stage.suggestedReturnStageKey || stage.key;
  const canReport = ["in_progress", "review_pending"].includes(stage.status);
  const route = state.agentRoute?.stageKey === stage.key ? state.agentRoute : null;
  section.innerHTML = `
    <div class="inspector-label">工作流回执</div>
    <div class="workflow-receipt">
      <div class="workflow-receipt-head">
        <strong>${escapeHtml(stage.title)}</strong>
        <span class="chip ${stageStatus[stage.status]?.[1] || ""}">${escapeHtml(stageStatus[stage.status]?.[0] || stage.status)}</span>
      </div>
      <p>${escapeHtml(stage.blockedReason || latestReceipt?.summary || "等待责任 Agent 提交结构化回执。")}</p>
      ${
        activeTask
          ? `<small>任务 ${escapeHtml(activeTask.id.slice(0, 8))} · ${escapeHtml(activeTask.status)} · ${(activeTask.inputAssetIds || []).length} 份输入资料</small>`
          : ""
      }
      ${
        activeTask?.dispatchedTo
          ? `<small>${escapeHtml(activeTask.dispatchedAgentName || activeTask.dispatchedTo)} 已接收 · ${escapeHtml(activeTask.dispatchAdapterType || "Agent")} · ${escapeHtml(formatDate(activeTask.dispatchedAt))}</small>`
          : ""
      }
      ${
        latestReceipt
          ? `<small>最近回执：${escapeHtml(latestReceipt.agentName)} · ${escapeHtml(formatDate(latestReceipt.createdAt))}</small>`
          : ""
      }
      ${
        latestReceipt?.testReport
          ? `<small>测试报告：${escapeHtml(latestReceipt.testReport.passed)} 通过 · ${escapeHtml(latestReceipt.testReport.failed)} 失败 · ${escapeHtml(latestReceipt.testReport.skipped)} 跳过</small>`
          : ""
      }
      ${
        activeTask?.dispatchedTo === "alice" && activeTask.externalRef
          ? `<small>Alice 会话：${escapeHtml(activeTask.externalRef.slice(0, 12))}</small>`
          : ""
      }
      ${
        route
          ? `<div class="workflow-route">
              <strong>推荐 ${escapeHtml(route.selectedAgent.name)}</strong>
              <small>${escapeHtml(route.reason)}</small>
              <small>${escapeHtml(route.selectedAgent.dispatchMode)} · 回执 ${escapeHtml(route.selectedAgent.receiptMode)}</small>
            </div>`
          : ""
      }
      <div class="workflow-actions">
        ${canReport ? '<button class="button" data-workflow-action="progress">提交进度</button>' : ""}
        ${canReport ? '<button class="button primary" data-workflow-action="complete">提交成果</button>' : ""}
        ${canReport ? '<button class="button danger" data-workflow-action="fail">标记失败</button>' : ""}
        ${canReport && activeTask && activeTask.dispatchedTo !== "alice" ? '<button class="button" data-workflow-action="alice">派发给 Alice</button>' : ""}
        ${canReport && activeTask?.dispatchedTo === "alice" ? '<button class="button" data-workflow-action="alice-sync">同步 Alice 回执</button>' : ""}
        ${stage.key === "deploy" && stage.status === "in_progress" ? '<button class="button primary" data-workflow-action="local-preview">生成本地预览</button>' : ""}
        ${
          stage.status === "blocked"
            ? `<button class="button primary" data-workflow-action="return" data-target-stage="${escapeHtml(suggestedReturnStage)}">退回 ${escapeHtml(suggestedReturnStage)} 返工</button>`
            : ""
        }
      </div>
    </div>
  `;
}

async function handleWorkflowAction(action) {
  const stage = state.project.stages.find((item) => item.id === state.selectedStageId);
  if (!stage) return;
  if (action === "progress") {
    const values = await openActionModal({
      title: "提交阶段进度",
      description: `${stage.title} · 第 ${stage.attempt || 1} 轮`,
      fields: [
        { name: "progress", label: "当前进度（1-99）", type: "number", value: String(Math.min(99, Math.max(1, stage.progress || 1))) },
        { name: "summary", label: "进度说明", type: "textarea", placeholder: "说明已经完成的内容和下一步计划" },
      ],
      confirmLabel: "提交进度",
    });
    if (!values) return;
    await api.submitStageReceipt(state.project.id, stage.key, { status: "progress", ...values });
    await loadWorkspace(state.project.id);
    showToast("阶段进度已经更新");
    return;
  }
  if (action === "complete") {
    const values = await openActionModal({
      title: "提交阶段成果",
      description: "成果提交后会进入下一阶段，或等待人工验收。",
      fields: [
        { name: "summary", label: "成果摘要", type: "textarea", placeholder: "说明本阶段完成了什么" },
        { name: "deliverableName", label: "交付物名称（可选）", required: false, placeholder: "例如：设计稿 v1" },
        { name: "deliverableUrl", label: "交付物链接（可选）", required: false, placeholder: "https://..." },
      ],
      confirmLabel: "提交成果",
    });
    if (!values) return;
    await api.submitStageReceipt(state.project.id, stage.key, {
      status: "completed",
      summary: values.summary,
      deliverables: values.deliverableName?.trim()
        ? [{ type: values.deliverableUrl?.trim() ? "URL" : "FILE", name: values.deliverableName, url: values.deliverableUrl }]
        : [],
    });
    state.selectedStageId = null;
    await loadWorkspace(state.project.id);
    showToast("阶段成果已经提交");
    return;
  }
  if (action === "fail") {
    const summary = await askText("标记阶段失败", "失败原因与补充要求", "", { type: "textarea", confirmLabel: "记录失败" });
    if (!summary?.trim()) return;
    await api.submitStageReceipt(state.project.id, stage.key, { status: "failed", summary });
    await loadWorkspace(state.project.id);
    showToast("失败回执已记录，请选择返工路径", "error");
    return;
  }
  if (action === "return") {
    const targetStageKey = stage.suggestedReturnStageKey || stage.key;
    const reason = await askText("退回返工", "返工要求", "", {
      type: "textarea",
      description: `当前阶段将退回 ${targetStageKey}，请说明需要调整的内容。`,
    });
    if (!reason?.trim()) return;
    if (!(await askConfirm(`确认将“${stage.title}”退回 ${targetStageKey} 阶段返工吗？`, { danger: true, confirmLabel: "确认退回" }))) return;
    await api.returnStage(state.project.id, stage.key, targetStageKey, reason);
    state.selectedStageId = null;
    await loadWorkspace(state.project.id);
    showToast("任务已经退回上游 Agent");
    return;
  }
  if (action === "alice") {
    const note = await askText("派发给 Alice", "协调说明（可留空）", "", { type: "textarea", required: false });
    if (note === null) return;
    const preview = await api.previewAliceDispatch(state.project.id, stage.key, note);
    const confirmed = await askConfirm(
      `即将把以下内容发送给本机 Alice MCP：\n\n${preview.dispatch.message}\n\n这会将项目目标、阶段要求和输入资料名称发送给 Alice。确认派发吗？`,
      { title: "确认派发给 Alice", confirmLabel: "确认派发" },
    );
    if (!confirmed) return;
    await api.confirmAliceDispatch(preview.dispatch.id, preview.confirmationToken);
    await loadWorkspace(state.project.id);
    showToast("任务已经派发给 Alice");
    return;
  }
  if (action === "alice-sync") {
    const activeTask = (state.project.workflowTasks || []).find((task) => task.id === stage.activeTaskId);
    const discovered = await api.aliceSessions(state.project.id, stage.key);
    const choices = discovered.sessions
      .slice(0, 8)
      .map((session, index) => `${index + 1}. ${session.title} · ${session.messageCount} 条消息 · ${session.id}`)
      .join("\n");
    const sessionId = await askText(
      "同步 Alice 回执",
      "Alice 会话 ID",
      activeTask?.externalRef || discovered.sessions[0]?.id || "",
      {
        description:
      `请选择要同步的 Alice 会话 ID。\n\n最近会话：\n${choices || "暂无可用会话"}`,
      },
    );
    if (!sessionId?.trim()) return;
    if (!(await askConfirm("将读取本机 Alice 会话并写入当前项目阶段状态。确认同步吗？", { confirmLabel: "确认同步" }))) return;
    await api.syncAliceReceipt(state.project.id, stage.key, sessionId);
    await loadWorkspace(state.project.id);
    showToast("Alice 回执已经同步");
    return;
  }
  if (action === "local-preview") {
    const values = await openActionModal({
      title: "生成本地预览",
      description: "仅允许执行已登记的 npm script，并使用本机预览地址。",
      fields: [
        { name: "workspaceDir", label: "项目工作目录", value: state.project.workspaceDir || "D:\\CodexOutputs" },
        { name: "script", label: "npm script", value: "build" },
        { name: "previewUrl", label: "本机预览地址", value: "http://127.0.0.1:4174" },
      ],
      confirmLabel: "检查预览命令",
    });
    if (!values) return;
    const preview = await api.previewDeployment({ projectId: state.project.id, ...values });
    if (!(await askConfirm(`即将执行：${preview.deployment.commandPreview}\n目录：${preview.deployment.workspaceDir}\n预览地址：${preview.deployment.previewUrl}`, { title: "确认生成本地预览", confirmLabel: "开始生成" }))) return;
    await api.confirmDeployment(preview.deployment.id, preview.confirmationToken);
    await loadWorkspace(state.project.id);
    showToast("本地预览已经生成，等待最终验收");
  }
}

const executionStatus = {
  pending_confirmation: ["待确认", "running"],
  running: ["执行中", "running"],
  cancelling: ["取消中", "running"],
  succeeded: ["已完成", "done"],
  failed: ["失败", "blocked"],
  cancelled: ["已取消", ""],
  interrupted: ["已中断", "blocked"],
};

function renderExecutions() {
  ensureExecutionPanel();
  const list = document.getElementById("executionList");
  list.innerHTML = state.executions.length
    ? state.executions
        .slice(0, 4)
        .map((execution) => {
          const [label, chipClass] = executionStatus[execution.status] || [execution.status, ""];
          const output = execution.output || execution.errorOutput || execution.prompt;
          const canCancel = ["pending_confirmation", "running", "cancelling"].includes(execution.status);
          const canRetry = ["failed", "cancelled", "interrupted"].includes(execution.status);
          return `
            <details class="execution-item">
              <summary>
                <span>${escapeHtml(execution.agentName)} · ${escapeHtml(execution.mode === "workspace-write" ? "写入" : "只读")}</span>
                <span class="chip ${chipClass}">${escapeHtml(label)}</span>
              </summary>
              <pre class="execution-output">${escapeHtml(output)}</pre>
              <div class="execution-item-actions">
                ${canCancel ? `<button class="button" data-cancel-execution="${escapeHtml(execution.id)}">取消任务</button>` : ""}
                ${canRetry ? `<button class="button" data-retry-execution="${escapeHtml(execution.id)}">重新执行</button>` : ""}
              </div>
            </details>
          `;
        })
        .join("")
    : '<p class="connection-desc">还没有本地执行记录。</p>';
}

document.querySelector(".inspector-body").addEventListener("click", (event) => {
  const cancelButton = event.target.closest("[data-cancel-execution]");
  if (cancelButton) {
    event.preventDefault();
    run(async () => {
      if (!(await askConfirm("确认取消这个本地任务吗？", { danger: true, confirmLabel: "取消任务" }))) return;
      await api.cancelExecution(cancelButton.dataset.cancelExecution);
      await loadWorkspace(state.project.id);
      showToast("取消请求已发送");
    });
    return;
  }

  const retryButton = event.target.closest("[data-retry-execution]");
  if (retryButton) {
    event.preventDefault();
    run(async () => {
      const preview = await api.retryExecution(retryButton.dataset.retryExecution);
      await confirmExecutionPreview(preview);
    });
  }
});

function renderCheckpoint() {
  const card = document.querySelector(".checkpoint-card");
  const checkpoint = state.project.checkpoints.find((item) => item.status === "pending");
  card.parentElement.classList.toggle("checkpoint-hidden", !checkpoint);
  card.style.display = checkpoint ? "block" : "none";
  if (!checkpoint) return;
  card.dataset.checkpointId = checkpoint.id;
  card.querySelector("h3").textContent = checkpoint.title;
  card.querySelector("p").textContent = checkpoint.description;
  checkpointPrimary.textContent = "批准并推进";
  checkpointSecondary.textContent = "要求修改";
}

function formatDate(iso) {
  if (!iso) return "暂无时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function renderMessagesPage() {
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Project Timeline</div>
        <h2>协作记录</h2>
        <p>项目消息、本地 Agent 回执与人工反馈都会保留在这里。</p>
      </div>
      <span class="date-chip">${state.project.messages.length} 条记录</span>
    </div>
    <div class="manage-list timeline-list">
      ${state.project.messages
        .slice()
        .reverse()
        .map(
          (message) => `
            <article class="manage-row timeline-row">
              <span class="activity-icon ${message.authorType === "local" ? "local" : message.authorType === "cloud" ? "system" : ""}">${escapeHtml(message.authorName.slice(0, 1))}</span>
              <div class="manage-copy">
                <div class="activity-meta">
                  <strong>${escapeHtml(message.authorName)}</strong>
                  <span class="chip ${message.authorType === "local" ? "local" : ""}">${escapeHtml(message.authorType === "local" ? "本地 Agent" : message.authorType === "user" ? "你" : "云端 Agent")}</span>
                  <span class="activity-time">${formatDate(message.createdAt)}</span>
                </div>
                <p>${escapeHtml(message.text)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAssetsPage() {
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Project Assets</div>
        <h2>项目资料</h2>
        <p>登记 PRD、文件说明或参考链接，让项目上下文保持清晰。</p>
      </div>
      <span class="date-chip">${state.project.assets.length} 份资料</span>
    </div>
    <form class="manage-card compact-form" data-asset-form>
      <label class="form-field">
        <span>类型</span>
        <select name="type">
          <option>FILE</option>
          <option>PRD</option>
          <option>TXT</option>
          <option>URL</option>
        </select>
      </label>
      <label class="form-field">
        <span>关联阶段</span>
        <select name="stageKey">
          ${state.project.stages.map((stage) => `<option value="${escapeHtml(stage.key)}">${escapeHtml(stage.title)}</option>`).join("")}
        </select>
      </label>
      <label class="form-field grow">
        <span>资料名称</span>
        <input name="name" maxlength="160" placeholder="例如：验收清单 v2" required />
      </label>
      <label class="form-field grow">
        <span>链接（可选）</span>
        <input name="url" maxlength="1000" placeholder="https://..." />
      </label>
      <button class="button primary" type="submit">添加资料</button>
    </form>
    <div class="manage-list">
      ${state.project.assets
        .map(
          (asset) => `
            <article class="manage-row">
              <span class="file-symbol">${escapeHtml(asset.type)}</span>
              <div class="manage-copy">
                <strong>${escapeHtml(asset.name)}</strong>
                ${asset.stageKey ? `<span class="chip">${escapeHtml(state.project.stages.find((stage) => stage.key === asset.stageKey)?.title || asset.stageKey)}</span>` : ""}
                ${asset.url ? `<a href="${escapeHtml(asset.url)}" target="_blank" rel="noreferrer">${escapeHtml(asset.url)}</a>` : "<p>本地项目资料</p>"}
              </div>
              <button class="button danger" type="button" data-delete-asset="${escapeHtml(asset.id)}">删除</button>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSettingsPage() {
  const approvedWorkspaces = state.workspace.bridge.allowedWorkspaces || [];
  const tools = state.workspace.localTools || [];
  const backups = state.backups || [];
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Rules & Permissions</div>
        <h2>规则与权限</h2>
        <p>维护项目资料、检查本地工具，并收回不再使用的目录授权。</p>
      </div>
    </div>
    <form class="manage-card settings-grid" data-settings-form>
      <label class="form-field"><span>项目名称</span><input name="title" value="${escapeHtml(state.project.title)}" required /></label>
      <label class="form-field"><span>所属团队</span><input name="team" value="${escapeHtml(state.project.team)}" /></label>
      <label class="form-field full"><span>状态说明</span><input name="subtitle" value="${escapeHtml(state.project.subtitle)}" /></label>
      <label class="form-field full"><span>本轮目标</span><textarea name="goal" rows="3">${escapeHtml(state.project.goal)}</textarea></label>
      <label class="form-field"><span>验收时间</span><input name="dueLabel" value="${escapeHtml(state.project.dueLabel)}" /></label>
      <div class="form-actions full"><button class="button primary" type="submit">保存项目设置</button></div>
    </form>
    <section class="page-section">
      <div class="section-head"><h3>本地工具</h3><span class="section-hint">自动检测可执行文件</span></div>
      <div class="manage-list">
        ${tools
          .map(
            (tool) => `
              <article class="manage-row">
                <span class="connection-icon ${tool.id === "claude-code" ? "blue" : ""}">${iconFor(tool.name)}</span>
                <div class="manage-copy">
                  <strong>${escapeHtml(tool.name)}</strong>
                  <p>${escapeHtml(tool.detail || tool.executable || `${tool.command} 已登记，但暂无可执行版本`)}</p>
                  <small>${tool.configuredCommand ? `自定义入口：${escapeHtml(tool.configuredCommand)}` : `自动检测：${escapeHtml(tool.defaultCommand || tool.command)}`}</small>
                </div>
                <span class="chip ${tool.connectionStatus === "connected" ? "done" : ""}">${escapeHtml(tool.statusLabel || (tool.supportsExecution ? "可执行" : "仅配对"))}</span>
                ${tool.configurable ? `<button class="button" type="button" data-configure-adapter="${escapeHtml(tool.id)}" data-adapter-command="${escapeHtml(tool.configuredCommand || "")}">配置</button>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
    <section class="page-section">
      <div class="section-head"><h3>额外授权目录</h3><span class="section-hint">默认目录无需单独登记</span></div>
      <div class="manage-list">
        ${
          approvedWorkspaces.length
            ? approvedWorkspaces
                .map(
                  (workspaceDir) => `
                    <article class="manage-row">
                      <span class="file-symbol">DIR</span>
                      <div class="manage-copy"><strong>${escapeHtml(workspaceDir)}</strong><p>本地 Agent 可以在派发任务时访问</p></div>
                      <button class="button danger" type="button" data-revoke-workspace="${escapeHtml(workspaceDir)}">撤销授权</button>
                    </article>
                  `,
                )
                .join("")
            : '<p class="empty-copy">还没有额外授权目录。首次派发到新目录时会请求确认。</p>'
        }
      </div>
    </section>
    <section class="page-section">
      <div class="section-head"><h3>最近审计记录</h3><span class="section-hint">${state.audit.length} 条</span></div>
      <div class="audit-list">
        ${state.audit
          .slice(0, 12)
          .map(
            (entry) => `<div class="audit-row"><span>${escapeHtml(entry.summary)}</span><time>${formatDate(entry.createdAt)}</time></div>`,
          )
          .join("")}
      </div>
    </section>
    <section class="page-section">
      <div class="section-head"><h3>本地数据备份</h3><span class="section-hint">JSON 快照</span></div>
      <div class="backup-zone">
        <div><p>在本机数据目录创建项目、消息、回执和配置快照。不会上传到网络。</p></div>
        <button class="button" type="button" data-create-backup>创建本地备份</button>
      </div>
      <div class="manage-list">
        ${
          backups.length
            ? backups
                .map(
                  (backup) => `
                    <article class="manage-row">
                      <span class="file-symbol">JSON</span>
                      <div class="manage-copy"><strong>${escapeHtml(backup.fileName)}</strong><p>${escapeHtml(formatDate(backup.createdAt))} · ${escapeHtml(Math.ceil(backup.size / 1024))} KB</p></div>
                      <button class="button" type="button" data-restore-backup="${escapeHtml(backup.fileName)}">恢复</button>
                    </article>
                  `,
                )
                .join("")
            : '<p class="empty-copy">还没有本地备份。创建快照后会显示在这里。</p>'
        }
      </div>
    </section>
    <section class="page-section danger-zone">
      <div><h3>删除项目</h3><p>删除后会同时移除项目消息、资料和执行历史入口。</p></div>
      <button class="button danger" type="button" data-delete-project>删除当前项目</button>
    </section>
  `;
}

function renderActiveTab() {
  const isOverview = state.activeTab === "overview";
  overviewPanel.style.display = isOverview ? "block" : "none";
  emptyPanel.style.display = isOverview ? "none" : "block";
  if (isOverview || !state.project) return;
  if (state.activeTab === "messages") renderMessagesPage();
  if (state.activeTab === "assets") renderAssetsPage();
  if (state.activeTab === "settings") renderSettingsPage();
}

function renderProject() {
  appShell.classList.remove("workspace-empty");
  document.getElementById("projectTitle").textContent = state.project.title;
  document.getElementById("projectSubtitle").textContent = state.project.subtitle;
  document.getElementById("goalCopy").textContent = state.project.goal;
  document.getElementById("goalDate").textContent = state.project.dueLabel;
  const active = state.project.stages.find((stage) => ["in_progress", "review_pending", "blocked"].includes(stage.status));
  state.selectedStageId = state.selectedStageId || active?.id || state.project.stages[0]?.id;
  renderWorkspace();
  renderRuntimeSummary();
  renderPipeline();
  renderMessages();
  renderInspector();
  renderCheckpoint();
  renderActiveTab();
}

async function loadWorkspace(selectProjectId) {
  state.workspace = await api.workspace();
  const nextProjectId = selectProjectId || state.project?.id || state.workspace.projects[0]?.id;
  if (!nextProjectId) {
    renderEmptyWorkspace();
    return;
  }
  state.project = await api.project(nextProjectId);
  state.executions = await api.executions(nextProjectId);
  if (state.activeTab === "settings") {
    state.audit = await api.audit();
    state.backups = await api.backups();
  }
  state.selectedStageId = state.project.stages.find((stage) =>
    ["in_progress", "review_pending", "blocked"].includes(stage.status),
  )?.id;
  const activeStage = state.project.stages.find((stage) =>
    ["in_progress", "review_pending", "blocked"].includes(stage.status),
  );
  try {
    state.agentRoute = activeStage ? await api.agentRoute(state.project.id, activeStage.key) : null;
  } catch {
    state.agentRoute = null;
  }
  renderProject();
  scheduleExecutionRefresh();
}

async function startLocalExecution(mode) {
  const defaultWorkspace = state.project.workspaceDir || "D:\\CodexOutputs";
  const values = await openActionModal({
    title: mode === "workspace-write" ? "派发代码写入任务" : "派发只读分析任务",
    description:
      mode === "workspace-write"
        ? "写入任务需要二次确认。Agent 只会访问你明确授权的目录。"
        : "只读任务不会修改工作目录中的文件。",
    fields: [
      { name: "workspaceDir", label: "本地工作目录", value: defaultWorkspace },
      { name: "prompt", label: "任务说明", type: "textarea", placeholder: "描述希望 Agent 完成的工作" },
    ],
    confirmLabel: "检查任务",
  });
  if (!values) return;
  const { workspaceDir, prompt } = values;

  const payload = {
    projectId: state.project.id,
    agentId: document.getElementById("executionAgent").value,
    stageKey: state.project.stages.find((item) => item.id === state.selectedStageId)?.key,
    mode,
    workspaceDir,
    prompt,
  };
  const stage = state.project.stages.find((item) => item.id === state.selectedStageId);
  if (stage && ["in_progress", "blocked"].includes(stage.status)) {
    payload.agentRoute = await api.agentRoute(state.project.id, stage.key, payload.agentId);
  }
  let preview;
  try {
    preview = await api.previewExecution(payload);
  } catch (error) {
    if (error.message !== "工作目录不在允许范围内") throw error;
    const approved = await askConfirm(`该目录尚未授权：\n${workspaceDir}\n\n确认允许本地 Agent 访问这个目录吗？`, {
      title: "授权本地目录",
      confirmLabel: "允许访问",
    });
    if (!approved) return;
    await api.allowWorkspace(workspaceDir);
    preview = await api.previewExecution(payload);
  }
  await confirmExecutionPreview(preview);
}

async function confirmExecutionPreview(preview) {
  const execution = preview.execution;
  const mode = execution.mode;
  const confirmationCopy = [
    `Agent：${execution.agentName}`,
    `权限：${mode === "workspace-write" ? "允许写入工作目录" : "只读分析"}`,
    `目录：${execution.workspaceDir}`,
    preview.execution.routeReason ? `路由：${preview.execution.routeReason}` : "",
    "",
    "确认开始执行吗？",
  ].join("\n");
  if (!(await askConfirm(confirmationCopy, { title: "确认本地执行", confirmLabel: "开始执行" }))) {
    await api.cancelExecution(execution.id);
    await loadWorkspace(state.project.id);
    return;
  }
  const confirmWrite =
    mode !== "workspace-write" ||
    (await askConfirm("这是代码写入任务。再次确认允许修改该目录中的文件。", {
      title: "二次确认写入权限",
      confirmLabel: "允许修改文件",
      danger: true,
    }));
  if (!confirmWrite) {
    await api.cancelExecution(execution.id);
    await loadWorkspace(state.project.id);
    return;
  }
  await api.confirmExecution(execution.id, preview.confirmationToken, mode === "workspace-write");
  await loadWorkspace(state.project.id);
  showToast("本地 Agent 已开始执行");
}

function scheduleExecutionRefresh() {
  clearTimeout(scheduleExecutionRefresh.timer);
  if (!state.executions.some((execution) => ["running", "cancelling"].includes(execution.status))) return;
  scheduleExecutionRefresh.timer = setTimeout(async () => {
    await run(() => loadWorkspace(state.project.id));
  }, 1800);
}

async function run(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  document.querySelectorAll("[data-rail-action]").forEach((button) => {
    button.classList.toggle("active", button.dataset.railAction === tabName || (tabName === "overview" && button.dataset.railAction === "overview"));
  });
  state.activeTab = tabName;
  return run(async () => {
    if (state.activeTab === "settings") {
      state.audit = await api.audit();
      state.backups = await api.backups();
    }
    renderActiveTab();
  });
}

projectList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-live-project]");
  if (!item) return;
  run(() => loadWorkspace(item.dataset.liveProject));
});

projectSearch.addEventListener("input", () => {
  state.projectSearch = projectSearch.value;
  renderWorkspace();
});

pipeline.addEventListener("click", (event) => {
  const card = event.target.closest("[data-live-stage]");
  if (!card) return;
  state.selectedStageId = card.dataset.liveStage;
  renderPipeline();
  renderInspector();
});

sendButton.addEventListener("click", () => {
  run(async () => {
    const text = messageInput.value.trim();
    if (!text) return;
    await api.sendMessage(state.project.id, text);
    messageInput.value = "";
    await loadWorkspace(state.project.id);
    showToast("消息已写入项目记录");
  });
});

messageInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") sendButton.click();
});

newProjectButton.addEventListener("click", () => {
  run(async () => {
    const values = await openActionModal({
      title: "创建新项目",
      description: "先写清楚目标，nomos 会为项目建立五阶段交付链路。",
      fields: [
        { name: "title", label: "项目名称", placeholder: "例如：个人官网首版" },
        { name: "goal", label: "本轮目标", type: "textarea", placeholder: "说明希望 Agent 团队交付的结果" },
      ],
      confirmLabel: "创建项目",
    });
    if (!values) return;
    const project = await api.createProject(values);
    await loadWorkspace(project.id);
    showToast("新项目已经创建");
  });
});

emptyPanel.addEventListener("click", (event) => {
  if (event.target.closest("[data-create-first-project]")) {
    newProjectButton.click();
    return;
  }
  if (event.target.closest("[data-open-agent-guide]")) {
    toggleBridgeModal(true);
    run(renderBridge);
  }
});

dispatchButton.addEventListener("click", () => {
  run(async () => {
    await api.advance(state.project.id);
    state.selectedStageId = null;
    await loadWorkspace(state.project.id);
    showToast("任务已经推进到下一阶段");
  });
});

checkpointPrimary.addEventListener("click", () => {
  run(async () => {
    const checkpointId = document.querySelector(".checkpoint-card").dataset.checkpointId;
    await api.resolveCheckpoint(state.project.id, checkpointId, "approve");
    state.selectedStageId = null;
    await loadWorkspace(state.project.id);
    showToast("验收通过，下一阶段已启动");
  });
});

checkpointSecondary.addEventListener("click", () => {
  run(async () => {
    const checkpointId = document.querySelector(".checkpoint-card").dataset.checkpointId;
    const note = await askText("要求修改", "修改意见", "", { type: "textarea", confirmLabel: "退回修改" });
    if (!note?.trim()) return;
    await api.resolveCheckpoint(state.project.id, checkpointId, "reject", note);
    await loadWorkspace(state.project.id);
    showToast("修改意见已经回流");
  });
});

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

document.querySelector(".rail").addEventListener("click", (event) => {
  const button = event.target.closest("[data-rail-action]");
  if (!button) return;
  const action = button.dataset.railAction;
  if (action === "team") {
    toggleBridgeModal(true);
    run(renderBridge);
    return;
  }
  if (action === "automation") {
    showToast("自动化编排将在后续版本开放");
    return;
  }
  activateTab(action);
});

emptyPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  run(async () => {
    const payload = Object.fromEntries(new FormData(form).entries());
    if (form.matches("[data-asset-form]")) {
      await api.addAsset(state.project.id, payload);
      await loadWorkspace(state.project.id);
      showToast("项目资料已经添加");
      return;
    }
    if (form.matches("[data-settings-form]")) {
      await api.updateProject(state.project.id, payload);
      await loadWorkspace(state.project.id);
      showToast("项目设置已经保存");
    }
  });
});

emptyPanel.addEventListener("click", (event) => {
  const restoreBackupButton = event.target.closest("[data-restore-backup]");
  if (restoreBackupButton) {
    run(async () => {
      const fileName = restoreBackupButton.dataset.restoreBackup;
      const preview = await api.inspectBackup(fileName);
      if (!(await askConfirm(`确认恢复本地备份吗？\n\n${preview.fileName}\n项目：${preview.projectCount}\nAgent：${preview.agentCount}\n执行记录：${preview.executionCount}\n\n恢复前会自动创建保护备份。`, { title: "恢复本地备份", danger: true, confirmLabel: "确认恢复" }))) return;
      await api.restoreBackup(fileName);
      state.project = null;
      state.selectedStageId = null;
      await loadWorkspace();
      showToast("本地备份已经恢复");
    });
    return;
  }

  if (event.target.closest("[data-create-backup]")) {
    run(async () => {
      if (!(await askConfirm("确认在本机数据目录创建一份 JSON 备份吗？", { title: "创建本地备份", confirmLabel: "创建备份" }))) return;
      const backup = await api.createBackup();
      await loadWorkspace(state.project.id);
      showToast(`本地备份已创建：${backup.fileName}`);
    });
    return;
  }

  const configureAdapterButton = event.target.closest("[data-configure-adapter]");
  if (configureAdapterButton) {
    run(async () => {
      const agentId = configureAdapterButton.dataset.configureAdapter;
      const command = await askText("配置本地命令入口", "命令名或可执行文件绝对路径", configureAdapterButton.dataset.adapterCommand || "", {
        description: "留空可以恢复自动检测。",
        required: false,
      });
      if (command === null) return;
      if (!(await askConfirm(`确认更新 ${agentId} 的本地命令入口吗？`, { confirmLabel: "更新入口" }))) return;
      await api.configureAdapter(agentId, command);
      await loadWorkspace(state.project.id);
      showToast("本地 Agent 命令入口已经更新");
    });
    return;
  }

  const deleteAssetButton = event.target.closest("[data-delete-asset]");
  if (deleteAssetButton) {
    run(async () => {
      if (!(await askConfirm("确认删除这份项目资料吗？", { danger: true, confirmLabel: "删除资料" }))) return;
      await api.deleteAsset(state.project.id, deleteAssetButton.dataset.deleteAsset);
      await loadWorkspace(state.project.id);
      showToast("项目资料已经删除");
    });
    return;
  }

  const revokeButton = event.target.closest("[data-revoke-workspace]");
  if (revokeButton) {
    run(async () => {
      if (!(await askConfirm(`确认撤销目录授权吗？\n\n${revokeButton.dataset.revokeWorkspace}`, { danger: true, confirmLabel: "撤销授权" }))) return;
      await api.revokeWorkspace(revokeButton.dataset.revokeWorkspace);
      await loadWorkspace(state.project.id);
      showToast("目录授权已经撤销");
    });
    return;
  }

  if (event.target.closest("[data-delete-project]")) {
    run(async () => {
      if (!(await askConfirm(`确认删除项目“${state.project.title}”吗？此操作无法撤销。`, { title: "删除项目", danger: true, confirmLabel: "确认删除" }))) return;
      await api.deleteProject(state.project.id);
      state.project = null;
      state.selectedStageId = null;
      state.activeTab = "overview";
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === "overview"));
      await loadWorkspace();
      showToast("项目已经删除");
    });
  }
});

function toggleBridgeModal(isOpen) {
  bridgeModal.classList.toggle("open", isOpen);
}

async function renderBridge(bridge) {
  bridge = bridge || (await api.bridge());
  const container = document.querySelector(".modal-content");
  const connectedCount = bridge.agents.filter((agent) => agent.status === "online").length;
  container.innerHTML = `
    <div class="modal-note">
      <span><i class="status-dot"></i>${connectedCount} / ${bridge.agents.length} 个本地智能体已连接</span>
      <button class="button" type="button" data-refresh-bridge>重新检测</button>
    </div>
    ${bridge.agents
      .map(
        (agent) => `
          <div class="detected-agent">
            <span class="check ${agent.status === "online" ? "" : "pending-check"}">${agent.status === "online" ? "✓" : "·"}</span>
            <span class="connection-icon ${agent.id === "claude-code" ? "blue" : ""}">${iconFor(agent.name.replaceAll(" ", ""))}</span>
            <span class="connection-copy">
              <span class="connection-name">${escapeHtml(agent.name)}</span>
              <span class="connection-desc">${escapeHtml(agent.connection?.statusLabel || "等待检测")} · ${escapeHtml(agent.connection?.detail || agent.role)}</span>
              ${
                agent.id === "openclaw" && agent.status !== "online"
                  ? '<button class="bridge-inline-action" type="button" data-start-openclaw>初始化并启动网关</button>'
                  : ""
              }
            </span>
            <input data-alias-agent="${escapeHtml(agent.id)}" value="${escapeHtml(agent.alias || "")}" aria-label="${escapeHtml(agent.name)} 名称" />
          </div>
        `,
      )
      .join("")}
  `;
  document.getElementById("confirmBridge").textContent = `保存 ${bridge.agents.length} 个 Agent`;
}

document.querySelector(".modal-content").addEventListener("click", (event) => {
  const refreshButton = event.target.closest("[data-refresh-bridge]");
  const startOpenClawButton = event.target.closest("[data-start-openclaw]");
  if (!refreshButton && !startOpenClawButton) return;
  run(async () => {
    if (startOpenClawButton) {
      if (
        !(await askConfirm(
          "OpenClaw Agent 可能获得较高系统权限。确认接受风险并初始化本地网关吗？\n\nnomos 仅绑定 127.0.0.1，使用随机令牌，不安装开机常驻服务。",
          { title: "启动 OpenClaw 网关", danger: true, confirmLabel: "接受风险并启动" },
        ))
      )
        return;
      const result = await api.startOpenClawGateway(true);
      await renderBridge(result.bridge);
    } else {
      await renderBridge(await api.refreshBridge());
    }
    await loadWorkspace(state.project.id);
    showToast("本地智能体连接状态已经刷新");
  });
});

for (const button of [document.getElementById("openBridge"), document.getElementById("headerBridge"), document.getElementById("teamBridge")]) {
  button.addEventListener("click", () => {
    toggleBridgeModal(true);
    run(renderBridge);
  });
}

document.getElementById("hideInspector").addEventListener("click", () => {
  appShell.classList.add("inspector-collapsed");
});

document.getElementById("showInspector").addEventListener("click", () => {
  appShell.classList.remove("inspector-collapsed");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (actionModal.classList.contains("open")) closeActionModal(null);
  if (bridgeModal.classList.contains("open")) toggleBridgeModal(false);
});

document.getElementById("closeBridge").addEventListener("click", () => toggleBridgeModal(false));
document.getElementById("cancelBridge").addEventListener("click", () => toggleBridgeModal(false));
bridgeModal.addEventListener("click", (event) => {
  if (event.target === bridgeModal) toggleBridgeModal(false);
});

document.getElementById("confirmBridge").addEventListener("click", () => {
  run(async () => {
    const aliases = {};
    document.querySelectorAll("[data-alias-agent]").forEach((input) => {
      aliases[input.dataset.aliasAgent] = input.value;
    });
    await api.pairBridge(aliases);
    await loadWorkspace(state.project.id);
    toggleBridgeModal(false);
    showToast("本地 Agent 配对信息已保存");
  });
});

run(() => loadWorkspace());
