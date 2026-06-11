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
  configureCloudAdapter(adapterId, payload) {
    return this.request(`/api/agent-adapters/${adapterId}/configure`, {
      method: "PATCH",
      body: JSON.stringify({ ...payload, confirm: true }),
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

  // Skill API
  skills(params = "") {
    return this.request(`/api/skills${params ? "?" + params : ""}`);
  },
  createSkill(payload) {
    return this.request("/api/skills", { method: "POST", body: JSON.stringify(payload) });
  },
  skill(id) {
    return this.request(`/api/skills/${id}`);
  },
  updateSkill(id, payload) {
    return this.request(`/api/skills/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteSkill(id) {
    return this.request(`/api/skills/${id}`, { method: "DELETE" });
  },

  // Role API
  roles(params = "") {
    return this.request(`/api/roles${params ? "?" + params : ""}`);
  },
  createRole(payload) {
    return this.request("/api/roles", { method: "POST", body: JSON.stringify(payload) });
  },
  role(id) {
    return this.request(`/api/roles/${id}`);
  },
  updateRole(id, payload) {
    return this.request(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteRole(id) {
    return this.request(`/api/roles/${id}`, { method: "DELETE" });
  },

  // Employee API
  employees(params = "") {
    return this.request(`/api/employees${params ? "?" + params : ""}`);
  },
  createEmployee(payload) {
    return this.request("/api/employees", { method: "POST", body: JSON.stringify(payload) });
  },
  employee(id) {
    return this.request(`/api/employees/${id}`);
  },
  updateEmployee(id, payload) {
    return this.request(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteEmployee(id) {
    return this.request(`/api/employees/${id}`, { method: "DELETE" });
  },

  // Adapter API
  adapters() {
    return this.request("/api/adapters");
  },

  // Org API
  orgHealth() {
    return this.request("/api/org/health");
  },
  initOrgDefaults() {
    return this.request("/api/org/init-defaults", { method: "POST" });
  },

  // Flow API
  flowTemplates(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/flow-templates${qs ? `?${qs}` : ""}`);
  },
  flowTemplate(id) {
    return this.request(`/api/flow-templates/${id}`);
  },
  createFlowTemplate(payload) {
    return this.request("/api/flow-templates", { method: "POST", body: JSON.stringify(payload) });
  },
  updateFlowTemplate(id, payload) {
    return this.request(`/api/flow-templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteFlowTemplate(id) {
    return this.request(`/api/flow-templates/${id}`, { method: "DELETE" });
  },
  cloneFlowTemplate(id) {
    return this.request(`/api/flow-templates/${id}/clone`, { method: "POST" });
  },
  flowInstances(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/flow-instances${qs ? `?${qs}` : ""}`);
  },
  flowInstance(id) {
    return this.request(`/api/flow-instances/${id}`);
  },
  createFlowInstance(payload) {
    return this.request("/api/flow-instances", { method: "POST", body: JSON.stringify(payload) });
  },
  updateFlowInstance(id, payload) {
    return this.request(`/api/flow-instances/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteFlowInstance(id) {
    return this.request(`/api/flow-instances/${id}`, { method: "DELETE" });
  },
  advanceFlowInstance(id) {
    return this.request(`/api/flow-instances/${id}/advance`, { method: "POST" });
  },
  reviewFlowGate(id, payload) {
    return this.request(`/api/flow-instances/${id}/review`, { method: "POST", body: JSON.stringify(payload) });
  },
  returnFlowStage(id, payload) {
    return this.request(`/api/flow-instances/${id}/return`, { method: "POST", body: JSON.stringify(payload) });
  },
  submitFlowReceipt(instanceId, stageId, payload) {
    return this.request(`/api/flow-instances/${instanceId}/stages/${stageId}/receipts`, {
      method: "POST",
      body: JSON.stringify(payload),
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
  digitalEmployeeStep: 0,
  orgData: null,
  orgSubPage: "overview",
  editingSkill: null,
  editingRole: null,
  editingEmployee: null,
  factoryEmployeeId: null,
  factoryStep: 0,
  workflowSubPage: "overview",
  flowTemplates: [],
  flowInstances: [],
  editingFlowTemplate: null,
  flowTemplateFilter: { category: "", search: "" },
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
const osArchitecture = document.getElementById("osArchitecture");
const emptyPanel = document.getElementById("emptyPanel");
const bridgeModal = document.getElementById("bridgeModal");
const actionModal = document.getElementById("actionModal");
const actionModalForm = document.getElementById("actionModalForm");
const appShell = document.querySelector(".app-shell");
const projectSearch = document.querySelector(".project-search");
let actionModalResolve = null;

const designThemeNames = new Set(["slate", "golden", "garden", "nocturne", "bluepond", "dream", "rose", "custom"]);
const designThemeVersion = "appearance-palette-v1";
const designThemes = [
  { id: "slate", name: "清雾", swatch: "#2f2f2f", copy: "半透明灰，透过薄雾看世界" },
  { id: "golden", name: "金阁", swatch: "#a78a4c", copy: "香槟轻奢，仙境的黄金下午" },
  { id: "garden", name: "青园", swatch: "#51916b", copy: "青绿护眼，秘密花园" },
  { id: "nocturne", name: "夜宴", swatch: "#d8b86b", copy: "深色护眼，月下的山巅盛宴" },
  { id: "bluepond", name: "蓝池", swatch: "#4f8fc4", copy: "清新天蓝，眼泪池畔的倒影" },
  { id: "dream", name: "梦境", swatch: "#8a75b6", copy: "薰衣草紫，兔子洞里的幻梦" },
  { id: "rose", name: "瑰园", swatch: "#b96f7b", copy: "玫瑰金粉，红皇后的玫瑰园" },
  { id: "custom", name: "专属", swatch: "linear-gradient(135deg,#4f8fc4,#b96f7b,#d8b86b)", copy: "万千颜色，你和艾莉一起指定" },
];

function applyDesignTheme(themeName) {
  const nextTheme = designThemeNames.has(themeName) ? themeName : "slate";
  document.body.dataset.designTheme = nextTheme;
  localStorage.setItem("nomos.designTheme", nextTheme);
  document.querySelectorAll("[data-appearance-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.designTheme === nextTheme);
  });
}

if (localStorage.getItem("nomos.designThemeVersion") !== designThemeVersion) {
  localStorage.setItem("nomos.designThemeVersion", designThemeVersion);
  applyDesignTheme("slate");
} else {
  applyDesignTheme(localStorage.getItem("nomos.designTheme") || document.body.dataset.designTheme || "slate");
}

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
      let input;
      if (field.type === "select") {
        input = `<select name="${escapeHtml(field.name)}" ${required}>${
          (field.options || []).map((opt) => {
            const optValue = typeof opt === "object" ? opt.value : opt;
            const optLabel = typeof opt === "object" ? opt.label : opt;
            return `<option value="${escapeHtml(optValue)}"${String(field.value || "") === String(optValue) ? " selected" : ""}>${escapeHtml(optLabel)}</option>`;
          }).join("")
        }</select>`;
      } else if (field.type === "checkbox" && Array.isArray(field.options)) {
        const checkedValues = Array.isArray(field.value) ? field.value.map(String) : [];
        input = `<div class="checkbox-group" data-checkbox-group="${escapeHtml(field.name)}">${
          field.options.map((opt) => {
            const optValue = typeof opt === "object" ? opt.value : opt;
            const optLabel = typeof opt === "object" ? opt.label : opt;
            const checked = checkedValues.includes(String(optValue));
            return `<label class="checkbox-item"><input type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(optValue)}"${checked ? " checked" : ""} />${escapeHtml(optLabel)}</label>`;
          }).join("")
        }</div>`;
      } else if (field.type === "textarea") {
        input = `<textarea name="${escapeHtml(field.name)}" ${required} placeholder="${escapeHtml(field.placeholder || "")}">${value}</textarea>`;
      } else {
        input = `<input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" value="${value}" ${required} placeholder="${escapeHtml(field.placeholder || "")}" />`;
      }
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
  const formData = new FormData(actionModalForm);
  const result = {};
  const checkboxGroups = new Set();
  actionModalForm.querySelectorAll("[data-checkbox-group]").forEach((group) => {
    checkboxGroups.add(group.dataset.checkboxGroup);
  });
  for (const [key, value] of formData.entries()) {
    if (checkboxGroups.has(key)) {
      if (!result[key]) result[key] = [];
      result[key].push(value);
    } else {
      result[key] = value;
    }
  }
  closeActionModal(result);
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
  const employee = agent.employee || {};
  const architecture = agent.architecture || {};
  const adapter = agent.adapter || {};
  const title = employee.title || agent.role || agent.name;
  const scope = architecture.runtimeScope === "local" ? "\u672c\u673a" : architecture.runtimeScope === "cloud" ? "\u4e91\u7aef" : "\u67b6\u6784";
  const provider = architecture.provider || adapter.provider || agent.type;
  const status = agent.connection?.statusLabel || adapter.statusLabel || (agent.status === "online" ? "\u53ef\u7528" : "\u5f85\u63a5\u5165");
  return `${title} ? ${scope}/${provider} ? ${status}`;
}

function employeeTypeLabel(agent) {
  const type = agent.employee?.employmentType || (agent.type === "human" ? "carbon" : "silicon");
  if (type === "carbon") return "\u78b3\u57fa";
  if (type === "hybrid") return "\u78b3\u7845";
  return "\u7845\u57fa";
}

function adapterStatusLabel(adapter) {
  if (adapter.connectionStatus === "connected") return "\u5df2\u8fde\u63a5";
  if (adapter.connectionStatus === "configured") return "\u5df2\u914d\u7f6e";
  if (adapter.connectionStatus === "discovered") return "\u5df2\u53d1\u73b0";
  if (adapter.connectionStatus === "setup_required") return "\u5f85\u914d\u7f6e";
  if (adapter.connectionStatus === "unconfigured") return "\u5f85\u63a5\u5165";
  return "\u4e0d\u53ef\u7528";
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

  const visibleAgents = state.workspace.agents.slice(0, 8);
  agentList.innerHTML = visibleAgents
    .map(
      (agent) => `
        <article class="project-item agent-item">
          <span class="project-avatar ${agent.architecture?.runtimeScope === "local" ? "blue" : ""}">${iconFor(agent.alias || agent.name)}</span>
          <span>
            <span class="project-title">${escapeHtml(agent.name)}</span>
            <span class="project-copy">${escapeHtml(employeeTypeLabel(agent))}\u5458\u5de5 ? ${escapeHtml(agentRole(agent))}</span>
          </span>
          <span class="${agent.status === "online" ? "online" : "pending"}"></span>
        </article>
      `,
    )
    .join("");

  const adapters = state.workspace.technicalAdapters || state.workspace.localTools || [];
  const availableAdapters = adapters.filter((adapter) => ["connected", "configured"].includes(adapter.connectionStatus));
  document.querySelector(".local-status-head span:last-child").textContent =
    `${availableAdapters.length} / ${adapters.length}`;
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
      <div class="welcome-mark">N</div>
      <div class="eyebrow">nomos Desktop</div>
      <h2>从第一个项目开始</h2>
      <p>创建项目并写下交付目标。nomos 会建立需求、设计、开发、测试和发布链路，再把需要你确认的节点集中呈现出来。</p>
      <div class="welcome-actions">
        <button class="button primary" type="button" data-create-first-project>创建第一个项目</button>
        <button class="button" type="button" data-open-agent-guide>检查本地 Agent</button>
      </div>
    </section>
  `;
  if (state.activeTab !== "overview") renderActiveTab();
}

function renderRuntimeSummary() {
  const activeStage =
    state.project.stages.find((stage) => ["in_progress", "review_pending", "blocked"].includes(stage.status)) ||
    state.project.stages.at(-1);
  const employees = state.workspace.agents || [];
  const siliconCount = employees.filter((agent) => agent.employee?.employmentType !== "carbon").length;
  const onlineCount = employees.filter((agent) => agent.status === "online").length;
  const adapters = state.workspace.technicalAdapters || state.workspace.localTools || [];
  const readyAdapters = adapters.filter((adapter) => ["connected", "configured"].includes(adapter.connectionStatus)).length;
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
      <span>\u78b3\u7845\u5458\u5de5</span>
      <strong>${onlineCount} / ${employees.length} \u53ef\u7528 · ${siliconCount} \u4f4d\u7845\u57fa</strong>
    </article>
    <article class="summary-card ${activeExecutions ? "attention" : ""}">
      <span>\u6280\u672f\u67b6\u6784</span>
      <strong>${readyAdapters} / ${adapters.length} \u5df2\u63a5\u5165</strong>
    </article>
    <article class="summary-card ${checkpoints ? "attention" : ""}">
      <span>人工验收</span>
      <strong>${checkpoints ? `${checkpoints} 项待处理` : "暂无待办"}</strong>
    </article>
  `;
}

function renderOperatingSystemArchitecture() {
  if (!osArchitecture || !state.workspace || !state.project) return;
  const employees = state.workspace.agents || [];
  const adapters = state.workspace.technicalAdapters || state.workspace.localTools || [];
  const activeStage =
    state.project.stages.find((stage) => ["in_progress", "review_pending", "blocked"].includes(stage.status)) ||
    state.project.stages.at(-1);
  const currentRole = activeStage?.ownerName || "项目总管";
  const currentProcess = state.project.process?.name || state.project.workflow?.name || "端到端项目交付流程";
  const carbonCount = employees.filter((agent) => agent.employee?.employmentType === "carbon").length;
  const siliconCount = employees.filter((agent) => agent.employee?.employmentType === "silicon").length;
  const hybridCount = employees.filter((agent) => agent.employee?.employmentType === "hybrid").length;
  const skillPool = new Set();
  for (const agent of employees) {
    for (const skill of agent.employee?.skills || agent.capabilities || []) skillPool.add(skill);
  }
  for (const adapter of adapters) {
    for (const capability of adapter.capabilities || []) skillPool.add(capability);
  }
  const readyAdapters = adapters.filter((adapter) => ["connected", "configured"].includes(adapter.connectionStatus)).length;
  const activeProjects = (state.workspace.projects || []).filter((project) => project.status !== "archived").length;

  const roleBlueprints = [
    {
      scale: "OPC / 微型",
      people: "1-9 人",
      roles: "5-8 个岗位",
      skills: "20-40 项 Skill",
      pattern: "创始人、增长、交付、财务法务、AI 运营先合并。",
    },
    {
      scale: "小微企业",
      people: "10-50 人",
      roles: "8-15 个岗位",
      skills: "40-80 项 Skill",
      pattern: "按获客、销售、交付、客户成功、经营支持拆清责任。",
    },
    {
      scale: "中型企业",
      people: "50-300 人",
      roles: "15-35 个岗位",
      skills: "80-200 项 Skill",
      pattern: "形成专业岗位族，关键岗位可配置硅基副驾和共享专家。",
    },
    {
      scale: "大型企业",
      people: "300+ 人",
      roles: "35-80+ 个岗位",
      skills: "200+ 项 Skill",
      pattern: "按岗位族、流程 Owner、平台 COE 和区域单元分层治理。",
    },
  ];

  const flowLanes = [
    { title: "价值流", nodes: ["MTL 市场到线索", "LTC 线索到现金", "IPD 产品开发", "ITR 问题到解决"] },
    { title: "使能流", nodes: ["DSTE 战略到执行", "MCR 管理变革", "知识与数据治理", "平台能力供给"] },
    { title: "支撑流", nodes: ["人力与组织", "财务与法务", "IT 与安全", "采购与行政"] },
  ];
  const digitalEmployeeSteps = [
    {
      step: "Step1",
      title: "岗位匹配",
      tagline: "配置目标技能",
      copy: "从企业岗位库中选择目标岗位，确认职责边界、Skill 等级、输入输出和验收标准。",
      owner: "组织管理员 / 岗位 Owner",
      configs: ["岗位画像", "Skill 等级", "职责边界", "验收标准"],
      outputs: ["岗位适配度", "技能差距清单"],
      guardrail: "未匹配岗位前，数字员工只能处于候选态。",
    },
    {
      step: "Step2",
      title: "入职培训",
      tagline: "学习专业知识",
      copy: "绑定企业知识库、业务语料、产品资料、行业规则和历史案例，形成岗位专属知识底座。",
      owner: "知识库管理员 / 业务专家",
      configs: ["知识库", "业务语料", "行业规则", "案例样本"],
      outputs: ["知识覆盖率", "考试与问答记录"],
      guardrail: "关键知识缺口会阻止进入高风险流程。",
    },
    {
      step: "Step3",
      title: "师父带教",
      tagline: "定义工作流程",
      copy: "由资深员工、流程 Owner 或岗位负责人沉淀 SOP、示范样例和异常处理路径。",
      owner: "师父 / 流程 Owner",
      configs: ["SOP", "示范样例", "异常路径", "升级机制"],
      outputs: ["流程执行手册", "带教评估"],
      guardrail: "没有师父确认的流程，只能以人工复核模式运行。",
    },
    {
      step: "Step4",
      title: "分配工具",
      tagline: "关联终端设备",
      copy: "配置可调用的软件系统、API、自动化脚本、智能体、终端设备和数据源。",
      owner: "AgentOps / IT 管理员",
      configs: ["业务系统", "API", "终端设备", "数据源"],
      outputs: ["工具权限矩阵", "调用审计点"],
      guardrail: "工具权限按最小可用原则授予，并保留调用日志。",
    },
    {
      step: "Step5",
      title: "上手实习",
      tagline: "获取工作权限",
      copy: "在沙盒、低风险任务或人工复核场景中试运行，收集回执、质量评分和异常样本。",
      owner: "岗位 Owner / 验收人",
      configs: ["实习任务", "沙盒环境", "人工复核", "质量阈值"],
      outputs: ["实习成绩", "回执证据", "风险报告"],
      guardrail: "连续通过验收后，才允许提升流程权限。",
    },
    {
      step: "Step6",
      title: "转正上岗",
      tagline: "赋予专属性格",
      copy: "固化协作风格、性格设定、风险边界、升级机制和岗位 SLA，成为可派工的专业数字员工。",
      owner: "组织负责人 / 安全审计",
      configs: ["性格设定", "协作风格", "风险边界", "岗位 SLA"],
      outputs: ["员工档案", "派工权限", "运行看板"],
      guardrail: "转正不等于放任，仍需按流程保留日志、回执和人工验收点。",
    },
  ];
  const digitalEmployeeStack = [
    { title: "自定义", items: ["技能", "知识", "流程", "权限", "性格"] },
    { title: "AI 汇聚平台", items: ["大模型", "智能体", "工具链", "行业应用"] },
    { title: "感知与操控", items: ["终端", "摄像头", "传感器", "AGV/机械臂"] },
    { title: "承载", items: ["云", "边缘服务器", "边缘网关", "专用设备"] },
  ];
  const activeDigitalStepIndex = Math.min(
    Math.max(Number(state.digitalEmployeeStep || 0), 0),
    digitalEmployeeSteps.length - 1,
  );
  const activeDigitalStep = digitalEmployeeSteps[activeDigitalStepIndex];

  osArchitecture.innerHTML = `
    <article class="os-hero">
      <div>
        <div class="os-kicker">NOMOS ENTERPRISE OS · 首页信息架构</div>
        <h2>能力建在组织上，组织跑在流程上。</h2>
        <p>
          Nomos 把企业拆成三个可运营对象：能力不是散落在工具里，而是沉淀为 Skill；Skill 组合成岗位；
          岗位由碳基员工、硅基员工或混编单元承担；每个项目都是某条业务流程的一次运行实例。
        </p>
        <div class="os-pill-row">
          <span class="os-pill">概览：经营态势与执行热区</span>
          <span class="os-pill">组织：岗位、Skill、员工身份</span>
          <span class="os-pill">流程：价值流、关口、项目实例</span>
        </div>
      </div>
      <div class="os-principle">
        <div class="os-principle-line"><span>能力层</span><strong>${skillPool.size || "待建"} Skill</strong></div>
        <div class="os-principle-line"><span>组织层</span><strong>${employees.length} 员工 / ${readyAdapters} 架构</strong></div>
        <div class="os-principle-line"><span>流程层</span><strong>${activeProjects} 项目运行</strong></div>
      </div>
    </article>

    <section class="os-grid os-organization-grid">
      <article class="os-card org-model-card">
        <div class="os-card-head">
          <div>
            <h3>组织：公司 OS 的架构层</h3>
            <p>企业先维护 Skill 池，再把 Skill 编排成岗位，最后把岗位分配给碳基、硅基或混编员工。</p>
          </div>
          <div class="os-stat"><strong>${employees.length}</strong><span>当前员工</span></div>
        </div>
        <div class="org-stack">
          <div class="org-layer">
            <span class="org-layer-label">Skill Pool</span>
            <div><strong>技能池是企业能力资产</strong><span class="os-copy">${skillPool.size || 0} 项已识别能力，可继续补充等级、证据和适用流程。</span></div>
          </div>
          <div class="org-layer">
            <span class="org-layer-label">Role</span>
            <div><strong>岗位是 Skill 的稳定组合</strong><span class="os-copy">岗位不等于人，岗位定义职责、权限、验收标准和所需技能等级。</span></div>
          </div>
          <div class="org-layer">
            <span class="org-layer-label">Employee</span>
            <div><strong>员工是岗位的承担者</strong><span class="os-copy">当前：${carbonCount} 碳基 · ${siliconCount} 硅基 · ${hybridCount} 混编。</span></div>
          </div>
        </div>
        <div class="role-scale">
          ${roleBlueprints
            .map(
              (item) => `
                <div class="role-tier">
                  <strong>${item.scale}</strong>
                  <span>${item.people}</span>
                  <span>${item.roles}</span>
                  <span>${item.skills}</span>
                  <span>${item.pattern}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="os-card digital-employee-lab">
        <div class="digital-lab-head">
          <div>
            <span class="os-kicker">DIGITAL EMPLOYEE FACTORY</span>
            <h3>六步生成数字员工</h3>
            <p>把“职场小白”训练为“专业数字员工”：岗位、知识、流程、工具、权限、性格逐步装配，每一步都能验收。</p>
          </div>
          <div class="digital-employee-output">
            <span>职场小白</span>
            <strong>→</strong>
            <span>专业数字员工</span>
          </div>
        </div>
        <div class="digital-step-tabs" role="tablist" aria-label="六步生成数字员工">
          ${digitalEmployeeSteps
            .map(
              (item, index) => `
                <button class="digital-step-tab ${index === activeDigitalStepIndex ? "active" : ""}" type="button" role="tab" aria-selected="${index === activeDigitalStepIndex}" data-digital-step="${index}">
                  <span>${item.step}</span>
                  <strong>${item.title}</strong>
                  <small>${item.tagline}</small>
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="digital-step-panel" role="tabpanel">
          <div class="digital-step-stage">
            <span class="digital-avatar trainee">职场小白</span>
            <span class="digital-stage-line"></span>
            <span class="digital-stage-badge">${activeDigitalStep.step}</span>
            <span class="digital-stage-line"></span>
            <span class="digital-avatar pro">专业数字员工</span>
          </div>
          <div class="digital-step-detail">
            <div>
              <span class="os-kicker">${activeDigitalStep.step} · ${activeDigitalStep.tagline}</span>
              <h4>${activeDigitalStep.title}</h4>
              <p>${activeDigitalStep.copy}</p>
            </div>
            <div class="digital-owner-card">
              <span>责任角色</span>
              <strong>${activeDigitalStep.owner}</strong>
              <small>${activeDigitalStep.guardrail}</small>
            </div>
          </div>
          <div class="digital-config-grid">
            <div class="digital-config-card">
              <span>本步配置</span>
              <div>${activeDigitalStep.configs.map((item) => `<b>${item}</b>`).join("")}</div>
            </div>
            <div class="digital-config-card">
              <span>阶段产出</span>
              <div>${activeDigitalStep.outputs.map((item) => `<b>${item}</b>`).join("")}</div>
            </div>
          </div>
          <div class="digital-stack">
            ${digitalEmployeeStack
              .map(
                (group) => `
                  <div class="digital-stack-group">
                    <strong>${group.title}</strong>
                    <div>${group.items.map((item) => `<span class="skill-pill">${item}</span>`).join("")}</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      </article>
    </section>

    <article class="os-card os-process-card">
        <div class="os-card-head">
          <div>
            <h3>流程：公司 OS 的业务流</h3>
            <p>参考华为流程型组织思路，先定义流程体系，再让项目继承流程模板、岗位责任和关口标准。</p>
          </div>
          <div class="os-stat"><strong>${state.project.stages.length}</strong><span>当前关口</span></div>
        </div>
        <div class="flow-map">
          ${flowLanes
            .map(
              (lane) => `
                <div class="flow-lane">
                  <div class="flow-lane-title">${lane.title}</div>
                  <div class="flow-node-list">
                    ${lane.nodes.map((node) => `<span class="flow-pill">${node}</span>`).join("")}
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="process-instance">
          <strong>项目 = 流程的一次运行实例</strong>
          <div class="os-copy">
            “${escapeHtml(state.project.title)}” 当前运行在 ${escapeHtml(currentProcess)} 上，
            当前关口由 ${escapeHtml(currentRole)} 承担；产出、回执、异常和验收会回流到组织知识。
          </div>
        </div>
    </article>

    <section class="os-lens">
      <div class="os-lens-item">
        <span>01 · 概览</span>
        <strong>先看企业脑状态</strong>
        <p>把项目进度、员工可用性、技术架构接入和人工验收聚到一个决策面。</p>
      </div>
      <div class="os-lens-item">
        <span>02 · 组织</span>
        <strong>能力沉淀到岗位</strong>
        <p>Skill 有等级、岗位有职责、员工有双重身份，避免智能体只是散乱工具。</p>
      </div>
      <div class="os-lens-item">
        <span>03 · 流程</span>
        <strong>项目必须跑在流程上</strong>
        <p>流程给项目提供模板、关口、RACI 和验收标准，项目执行后反哺流程优化。</p>
      </div>
    </section>
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
  const project = state.project;
  const flowInstance = project?._flowInstance;
  const stages = flowInstance?.stages || project?.stages || [];

  pipeline.innerHTML = stages
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
          <h3>${escapeHtml(stage.title || stage.name)}</h3>
          <p>${escapeHtml(stage.description)}</p>
          <div class="stage-meta">第 ${escapeHtml(stage.attempt || 1)} 轮${flowInstance ? ` · ${stage.gate?.enabled ? "有关口" : "无关口"}` : ` · ${(stage.deliverableIds || []).length} 份交付`}</div>
          ${stage.ownerName ? `<div class="agent-line"><span class="agent-dot">${escapeHtml(stage.ownerName.slice(0, 1))}</span>${escapeHtml(stage.ownerName)}</div>` : ""}
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
  const project = state.project;
  const flowInstance = project?._flowInstance;
  const stage =
    (flowInstance?.stages || project?.stages || []).find((item) => item.id === state.selectedStageId) ||
    (flowInstance?.stages || project?.stages || []).find((item) => item.status === "in_progress") ||
    (project?.stages || []).at(-1);
  if (!stage) return;
  state.selectedStageId = stage.id;
  document.getElementById("taskTitle").textContent = stage.title || stage.name;
  document.getElementById("taskDesc").textContent = stage.description;
  if (flowInstance) {
    const gateInfo = stage.gate?.enabled ? ` · 关口${stage.gate.review?.status === "approved" ? "已通过" : stage.gate.review?.status === "rejected" ? "已驳回" : "待评审"}` : "";
    document.getElementById("taskOwner").textContent = `流程实例 · 第 ${stage.attempt || 1} 轮${gateInfo}`;
  } else {
    document.getElementById("taskOwner").textContent =
      `${stage.ownerName} · ${stage.ownerType === "local" ? "本地执行" : "云端执行"} · 第 ${stage.attempt || 1} 轮`;
  }
  document.getElementById("taskPercent").textContent =
    stage.status === "waiting"
      ? "等待中"
      : stage.status === "review_pending"
        ? "待验收"
        : stage.status === "blocked"
          ? "受阻"
          : flowInstance
            ? (stage.status === "done" ? "已完成" : "执行中")
            : `${stage.progress}%`;
  document.getElementById("taskProgress").style.width = `${Math.max(stage.progress || (stage.status === "done" ? 100 : stage.status === "in_progress" ? 50 : 4), 4)}%`;

  inspectorAgents.innerHTML = state.workspace.agents
    .map(
      (agent) => `
        <div class="connection-row">
          <span class="connection-icon ${agent.id === "claude-code" ? "blue" : ""}">${iconFor(agent.name.replaceAll(" ", ""))}</span>
          <span class="connection-copy">
            <span class="connection-name">${escapeHtml(agent.name)}</span>
            <span class="connection-desc">${escapeHtml(employeeTypeLabel(agent))}\u5458\u5de5 ? ${escapeHtml(agentRole(agent))}</span>
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
    const wfButton = event.target.closest("[data-workflow-action]");
    if (wfButton) {
      run(() => handleWorkflowAction(wfButton.dataset.workflowAction));
      return;
    }
    const flowButton = event.target.closest("[data-flow-action]");
    if (flowButton) {
      run(() => handleFlowAction(flowButton.dataset.flowAction, flowButton.dataset));
      return;
    }
  });
  return section;
}

function renderWorkflowPanel(stage) {
  const section = ensureWorkflowPanel();
  const project = state.project;
  const flowInstance = project?._flowInstance;
  const isFlowStage = flowInstance?.stages?.some((s) => s.id === stage.id);

  if (isFlowStage) {
    const gate = stage.gate || {};
    const review = gate.review || {};
    section.innerHTML = `
      <div class="inspector-label">流程关口</div>
      <div class="workflow-receipt">
        <div class="workflow-receipt-head">
          <strong>${escapeHtml(stage.name || stage.title)}</strong>
          <span class="chip ${stageStatus[stage.status]?.[1] || ""}">${escapeHtml(stageStatus[stage.status]?.[0] || stage.status)}</span>
        </div>
        <p>${escapeHtml(stage.blockedReason || stage.description || "等待执行")}</p>
        ${gate.enabled ? `
          <div style="margin-top:8px;padding:8px;background:var(--surface-2);border-radius:8px;">
            <small><strong>准入条件：</strong>${escapeHtml((gate.entryConditions || []).join("；") || "无")}</small><br>
            <small><strong>准出标准：</strong>${escapeHtml((gate.exitCriteria || []).join("；") || "无")}</small>
          </div>
        ` : ""}
        ${review.status !== "pending" ? `<small>评审人：${escapeHtml(review.reviewer || "-")} · ${review.reviewedAt ? formatDate(review.reviewedAt) : ""}</small>` : ""}
        <div class="workflow-actions">
          ${stage.status === "in_progress" ? `<button class="button primary" data-flow-action="receipt" data-status="completed">提交回执</button>` : ""}
          ${stage.status === "review_pending" ? `
            <button class="button primary" data-flow-action="review" data-action="approve">通过</button>
            <button class="button danger" data-flow-action="review" data-action="reject">驳回</button>
          ` : ""}
          ${stage.status === "blocked" ? `<button class="button" data-flow-action="return">重新提交</button>` : ""}
        </div>
      </div>
    `;
    return;
  }

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
    showToast("\u5458\u5de5\u522b\u540d\u548c\u672c\u5730\u914d\u5bf9\u4fe1\u606f\u5df2\u4fdd\u5b58");
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

async function handleFlowAction(action, dataset) {
  const project = state.project;
  const flowInstance = project?._flowInstance;
  if (!flowInstance) return;
  const stage = flowInstance.stages.find((s) => s.id === state.selectedStageId);
  if (!stage) return;

  if (action === "receipt") {
    const summary = await askText("提交阶段回执", "成果摘要", "", { type: "textarea", confirmLabel: "提交" });
    if (!summary?.trim()) return;
    await api.submitFlowReceipt(flowInstance.id, stage.id, { status: dataset.status || "completed", summary });
    await loadWorkspace(project.id);
    showToast("阶段回执已提交");
    return;
  }

  if (action === "review") {
    const reviewAction = dataset.action;
    if (reviewAction === "approve") {
      await api.reviewFlowGate(flowInstance.id, { action: "approve", comment: "评审通过" });
      await api.advanceFlowInstance(flowInstance.id);
      await loadWorkspace(project.id);
      showToast("关口评审通过，已推进到下一阶段");
    } else if (reviewAction === "reject") {
      const comment = await askText("驳回阶段", "驳回原因", "", { type: "textarea", confirmLabel: "驳回" });
      if (!comment?.trim()) return;
      await api.reviewFlowGate(flowInstance.id, { action: "reject", comment });
      await loadWorkspace(project.id);
      showToast("关口评审已驳回，阶段退回执行");
    }
    return;
  }

  if (action === "return") {
    const reason = await askText("重新提交阶段", "补充说明", "", { type: "textarea", confirmLabel: "重新提交" });
    if (!reason?.trim()) return;
    await api.returnFlowStage(flowInstance.id, { reason });
    await api.submitFlowReceipt(flowInstance.id, stage.id, { status: "completed", summary: reason });
    await loadWorkspace(project.id);
    showToast("阶段已重新提交");
    return;
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

function renderTopicsPage() {
  const messages = state.project?.messages || [];
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Topics</div>
        <h2>话题</h2>
        <p>把项目消息、本地 Agent 回执、云端 Agent 反馈和人工决策沉淀为可追踪话题。</p>
      </div>
      <span class="date-chip">${messages.length} 条记录</span>
    </div>
    <section class="ia-panel">
      <div class="ia-card accent">
        <span>当前话题</span>
        <strong>${state.project ? escapeHtml(state.project.title) : "等待创建项目"}</strong>
        <p>${state.project ? escapeHtml(state.project.goal) : "创建第一个项目后，需求、设计、执行和验收讨论会聚合到这里。"}</p>
      </div>
      <div class="ia-card">
        <span>回流原则</span>
        <strong>每条话题都要能回到组织或流程</strong>
        <p>讨论不是聊天流，而是项目产出、异常、验收意见和知识复盘的证据链。</p>
      </div>
    </section>
    <div class="manage-list timeline-list">
      ${
        messages.length
          ? messages
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
              .join("")
          : '<p class="empty-copy">还没有话题。创建项目或补充要求后，讨论记录会显示在这里。</p>'
      }
    </div>
  `;
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

function renderWorkflowHomePage() {
  const subPages = [
    { key: "overview", label: "概览" },
    { key: "library", label: "流程库" },
    { key: "tracker", label: "实例追踪" },
  ];
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Workflow</div>
        <h2>工作流</h2>
        <p>项目不是孤立任务，而是流程模板、岗位责任、输入输出和验收关口的一次运行实例。</p>
      </div>
    </div>
    <nav class="org-nav">
      ${subPages.map((sp) => `<button class="org-nav-item${state.workflowSubPage === sp.key ? " active" : ""}" data-flow-sub="${sp.key}">${sp.label}</button>`).join("")}
    </nav>
    <div id="flowSubContent"></div>
  `;
  emptyPanel.querySelector(".org-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-flow-sub]");
    if (!btn) return;
    state.workflowSubPage = btn.dataset.flowSub;
    renderWorkflowHomePage();
  });
  const container = document.getElementById("flowSubContent");
  if (state.workflowSubPage === "overview") renderWorkflowOverview(container);
  else if (state.workflowSubPage === "library") renderFlowLibrary(container);
  else if (state.workflowSubPage === "tracker") renderFlowInstanceTracker(container);
}

function renderWorkflowOverview(container) {
  const project = state.project;
  const stages = project?.stages || [];
  const tasks = project?.workflowTasks || [];
  const receipts = project?.taskReceipts || [];
  const flowLanes = [
    { title: "价值流", copy: "直接创造客户价值，如 MTL、LTC、IPD、ITR。", nodes: ["MTL", "LTC", "IPD", "ITR"] },
    { title: "使能流", copy: "提升价值流效率，如战略到执行、知识治理、平台能力供给。", nodes: ["DSTE", "知识治理", "平台供给"] },
    { title: "支撑流", copy: "保障组织运行，如人力、财务、法务、IT、安全。", nodes: ["HR", "财务", "法务", "IT"] },
  ];
  container.innerHTML = `
    <section class="ia-panel">
      ${flowLanes
        .map(
          (lane) => `
            <article class="ia-card">
              <span>${lane.title}</span>
              <strong>${escapeHtml(lane.nodes.join(" / "))}</strong>
              <p>${lane.copy}</p>
            </article>
          `,
        )
        .join("")}
    </section>
    <section class="page-section">
      <div class="section-head"><h3>当前流程实例</h3><span class="section-hint">${project ? escapeHtml(project.title) : "暂无项目"}</span></div>
      <div class="workflow-map-list">
        ${
          stages.length
            ? stages
                .map((stage, index) => {
                  const [statusLabel, statusClass] = stageStatus[stage.status] || ["等待中", ""];
                  const task = tasks.find((item) => item.id === stage.activeTaskId || item.stageKey === stage.key);
                  const receipt = receipts.find((item) => item.stageKey === stage.key);
                  return `
                    <article class="workflow-map-row">
                      <span class="stage-index">${String(index + 1).padStart(2, "0")}</span>
                      <div class="manage-copy">
                        <strong>${escapeHtml(stage.title)}</strong>
                        <p>${escapeHtml(receipt?.summary || stage.description)}</p>
                        <small>${task ? `任务 ${escapeHtml(task.id.slice(0, 8))} · ${escapeHtml(task.status)}` : "等待责任员工提交结构化回执"}</small>
                      </div>
                      <span class="chip ${statusClass}">${escapeHtml(statusLabel)}</span>
                    </article>
                  `;
                })
                .join("")
            : '<p class="empty-copy">创建项目后，Nomos 会在这里显示流程关口、责任岗位、任务回执和验收状态。</p>'
        }
      </div>
    </section>
  `;
}

async function loadFlowData() {
  try {
    const [templatesRes, instancesRes] = await Promise.all([api.flowTemplates(), api.flowInstances()]);
    state.flowTemplates = templatesRes.data || [];
    state.flowInstances = instancesRes.data || [];
  } catch (error) {
    console.error("加载流程数据失败", error);
  }
}

function renderFlowLibrary(container) {
  const templates = state.flowTemplates || [];
  const filter = state.flowTemplateFilter || {};
  const categoryLabels = { value_stream: "价值流", enabling_stream: "使能流", supporting_stream: "支撑流" };

  let filtered = templates;
  if (filter.category) filtered = filtered.filter((t) => t.category === filter.category);
  if (filter.search) {
    const term = filter.search.toLowerCase();
    filtered = filtered.filter((t) => t.name.toLowerCase().includes(term) || (t.description || "").toLowerCase().includes(term));
  }

  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <input type="text" class="text-input" placeholder="搜索流程模板" id="flowSearchInput" value="${escapeHtml(filter.search || "")}" style="width:220px;">
          <select class="text-input" id="flowCategoryFilter" style="width:140px;">
            <option value="">全部分类</option>
            <option value="value_stream" ${filter.category === "value_stream" ? "selected" : ""}>价值流</option>
            <option value="enabling_stream" ${filter.category === "enabling_stream" ? "selected" : ""}>使能流</option>
            <option value="supporting_stream" ${filter.category === "supporting_stream" ? "selected" : ""}>支撑流</option>
          </select>
          <button class="button primary" id="btnNewFlowTemplate">新建流程模板</button>
        </div>
      </div>
      <div class="org-grid" id="flowTemplateGrid">
        ${filtered.length
          ? filtered.map((t) => `
            <article class="org-card" data-flow-template-id="${t.id}">
              <div class="org-card-header">
                <div>
                  <strong>${escapeHtml(t.name)}</strong>
                  <span class="chip ${t.category === "value_stream" ? "accent" : t.category === "enabling_stream" ? "local" : ""}">${escapeHtml(categoryLabels[t.category] || t.category)}</span>
                  ${t.isDefault ? '<span class="chip">默认</span>' : ""}
                </div>
              </div>
              <p class="org-card-desc">${escapeHtml(t.description || "无描述")}</p>
              <div class="org-card-meta">${t.stages?.length || 0} 个阶段</div>
              <div class="org-card-actions">
                <button class="button" data-action="edit">编辑</button>
                <button class="button" data-action="clone">复制</button>
                <button class="button" data-action="delete">删除</button>
              </div>
            </article>
          `).join("")
          : '<p class="empty-copy">暂无流程模板，点击"新建流程模板"创建第一个。</p>'
        }
      </div>
    </section>
  `;

  container.querySelector("#flowSearchInput")?.addEventListener("input", (e) => {
    state.flowTemplateFilter.search = e.target.value;
    renderFlowLibrary(container);
  });
  container.querySelector("#flowCategoryFilter")?.addEventListener("change", (e) => {
    state.flowTemplateFilter.category = e.target.value;
    renderFlowLibrary(container);
  });
  container.querySelector("#btnNewFlowTemplate")?.addEventListener("click", () => {
    state.editingFlowTemplate = null;
    renderFlowTemplateEditor(container);
  });
  container.querySelectorAll("[data-flow-template-id]").forEach((card) => {
    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
      const id = card.dataset.flowTemplateId;
      state.editingFlowTemplate = templates.find((t) => t.id === id) || null;
      renderFlowTemplateEditor(container);
    });
    card.querySelector('[data-action="clone"]')?.addEventListener("click", async () => {
      const id = card.dataset.flowTemplateId;
      await run(async () => {
        await api.cloneFlowTemplate(id);
        await loadFlowData();
        renderFlowLibrary(container);
      });
    });
    card.querySelector('[data-action="delete"]')?.addEventListener("click", async () => {
      const id = card.dataset.flowTemplateId;
      if (!confirm("确定删除此流程模板？")) return;
      await run(async () => {
        try {
          await api.deleteFlowTemplate(id);
        } catch (error) {
          alert(error.message);
          return;
        }
        await loadFlowData();
        renderFlowLibrary(container);
      });
    });
  });
}

function renderFlowTemplateEditor(container) {
  const template = state.editingFlowTemplate;
  const isNew = !template;
  const draft = isNew
    ? { name: "", category: "value_stream", description: "", stages: [] }
    : JSON.parse(JSON.stringify(template));

  function renderStageList() {
    const listEl = container.querySelector("#stageList");
    if (!listEl) return;
    listEl.innerHTML = draft.stages
      .map((stage, index) => `
        <div class="org-detail-section" data-stage-index="${index}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong>阶段 ${index + 1}</strong>
            <div style="display:flex;gap:6px;">
              <button class="button" data-move="up" ${index === 0 ? "disabled" : ""}>上移</button>
              <button class="button" data-move="down" ${index === draft.stages.length - 1 ? "disabled" : ""}>下移</button>
              <button class="button" data-action="remove">删除</button>
            </div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
            <input type="text" class="text-input stage-name" placeholder="阶段名称" value="${escapeHtml(stage.name)}" style="flex:1;min-width:200px;">
            <textarea class="text-input stage-desc" placeholder="阶段描述" style="flex:2;min-width:300px;min-height:48px;">${escapeHtml(stage.description)}</textarea>
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" class="gate-enabled" ${stage.gate?.enabled ? "checked" : ""}>
              <span>启用关口评审</span>
            </label>
          </div>
          <div class="gate-fields" style="display:${stage.gate?.enabled ? "block" : "none"};padding-left:16px;border-left:2px solid var(--border);">
            <div style="margin-bottom:8px;">
              <small>准入条件（每行一条）</small>
              <textarea class="text-input gate-entry" placeholder="进入此阶段前必须满足的条件" style="min-height:60px;">${escapeHtml((stage.gate?.entryConditions || []).join("\n"))}</textarea>
            </div>
            <div>
              <small>准出标准（每行一条）</small>
              <textarea class="text-input gate-exit" placeholder="离开此阶段必须达成的标准" style="min-height:60px;">${escapeHtml((stage.gate?.exitCriteria || []).join("\n"))}</textarea>
            </div>
          </div>
        </div>
      `).join("");

    listEl.querySelectorAll('[data-move="up"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest("[data-stage-index]").dataset.stageIndex);
        if (idx > 0) {
          [draft.stages[idx], draft.stages[idx - 1]] = [draft.stages[idx - 1], draft.stages[idx]];
          draft.stages.forEach((s, i) => (s.order = i + 1));
          renderStageList();
        }
      });
    });
    listEl.querySelectorAll('[data-move="down"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest("[data-stage-index]").dataset.stageIndex);
        if (idx < draft.stages.length - 1) {
          [draft.stages[idx], draft.stages[idx + 1]] = [draft.stages[idx + 1], draft.stages[idx]];
          draft.stages.forEach((s, i) => (s.order = i + 1));
          renderStageList();
        }
      });
    });
    listEl.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest("[data-stage-index]").dataset.stageIndex);
        draft.stages.splice(idx, 1);
        draft.stages.forEach((s, i) => (s.order = i + 1));
        renderStageList();
      });
    });
    listEl.querySelectorAll(".gate-enabled").forEach((cb) => {
      cb.addEventListener("change", () => {
        const section = cb.closest("[data-stage-index]");
        const fields = section.querySelector(".gate-fields");
        fields.style.display = cb.checked ? "block" : "none";
      });
    });
  }

  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <button class="button" id="btnBackToLibrary">← 返回流程库</button>
      </div>
      <div class="org-detail-panel">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
          <input type="text" class="text-input" id="tplName" placeholder="流程模板名称" value="${escapeHtml(draft.name)}" style="flex:1;min-width:260px;">
          <select class="text-input" id="tplCategory" style="width:160px;">
            <option value="value_stream" ${draft.category === "value_stream" ? "selected" : ""}>价值流</option>
            <option value="enabling_stream" ${draft.category === "enabling_stream" ? "selected" : ""}>使能流</option>
            <option value="supporting_stream" ${draft.category === "supporting_stream" ? "selected" : ""}>支撑流</option>
          </select>
        </div>
        <textarea class="text-input" id="tplDesc" placeholder="流程描述" style="width:100%;min-height:64px;margin-bottom:16px;">${escapeHtml(draft.description)}</textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3>阶段序列</h3>
          <button class="button primary" id="btnAddStage">+ 添加阶段</button>
        </div>
        <div id="stageList"></div>
        <div style="display:flex;gap:12px;margin-top:24px;">
          <button class="button primary" id="btnSaveTemplate">保存</button>
          <button class="button" id="btnCancelEdit">取消</button>
        </div>
      </div>
    </section>
  `;

  renderStageList();

  container.querySelector("#btnBackToLibrary")?.addEventListener("click", () => {
    state.editingFlowTemplate = null;
    renderFlowLibrary(container);
  });
  container.querySelector("#btnCancelEdit")?.addEventListener("click", () => {
    state.editingFlowTemplate = null;
    renderFlowLibrary(container);
  });
  container.querySelector("#btnAddStage")?.addEventListener("click", () => {
    draft.stages.push({
      id: crypto.randomUUID(),
      name: `阶段 ${draft.stages.length + 1}`,
      order: draft.stages.length + 1,
      description: "",
      gate: { enabled: false, entryConditions: [], exitCriteria: [] },
      roleResponsibilities: [],
      inputs: [],
      outputs: [],
    });
    renderStageList();
  });
  container.querySelector("#btnSaveTemplate")?.addEventListener("click", async () => {
    draft.name = container.querySelector("#tplName").value.trim();
    draft.category = container.querySelector("#tplCategory").value;
    draft.description = container.querySelector("#tplDesc").value.trim();

    if (!draft.name) { alert("请输入流程模板名称"); return; }
    if (draft.stages.length === 0) { alert("请至少添加一个阶段"); return; }

    // Collect stage data from DOM
    container.querySelectorAll("#stageList > [data-stage-index]").forEach((section, index) => {
      const stage = draft.stages[index];
      stage.name = section.querySelector(".stage-name").value.trim();
      stage.description = section.querySelector(".stage-desc").value.trim();
      stage.order = index + 1;
      stage.gate.enabled = section.querySelector(".gate-enabled").checked;
      stage.gate.entryConditions = section.querySelector(".gate-entry").value.split("\n").map((s) => s.trim()).filter(Boolean);
      stage.gate.exitCriteria = section.querySelector(".gate-exit").value.split("\n").map((s) => s.trim()).filter(Boolean);
    });

    await run(async () => {
      if (isNew) {
        await api.createFlowTemplate(draft);
      } else {
        await api.updateFlowTemplate(template.id, draft);
      }
      await loadFlowData();
      state.editingFlowTemplate = null;
      renderFlowLibrary(container);
    });
  });
}

function renderFlowInstanceTracker(container) {
  const instances = state.flowInstances || [];
  const categoryLabels = { value_stream: "价值流", enabling_stream: "使能流", supporting_stream: "支撑流" };
  const statusLabels = { pending: "待启动", running: "运行中", completed: "已完成", failed: "失败", paused: "已暂停" };

  container.innerHTML = `
    <section class="page-section">
      <div class="section-head"><h3>流程实例追踪</h3><span class="section-hint">${instances.length} 个实例</span></div>
      <div class="org-grid">
        ${instances.length
          ? instances.map((inst) => {
              const currentStage = inst.stages?.find((s) => s.id === inst.currentStageId);
              const stageStatusLabel = currentStage ? (stageStatus[currentStage.status] || ["等待中", ""])[0] : "已完成";
              return `
                <article class="org-card">
                  <div class="org-card-header">
                    <div>
                      <strong>${escapeHtml(inst.templateName)}</strong>
                      <span class="chip ${inst.status === "running" ? "accent" : inst.status === "completed" ? "local" : ""}">${escapeHtml(statusLabels[inst.status] || inst.status)}</span>
                    </div>
                  </div>
                  <p class="org-card-desc">项目：${escapeHtml(state.workspace?.projects?.find((p) => p.id === inst.projectId)?.title || inst.projectId)}</p>
                  <div class="org-card-meta">
                    当前阶段：${escapeHtml(currentStage?.name || "无")} · ${escapeHtml(stageStatusLabel)}
                  </div>
                  <div class="org-card-actions">
                    <button class="button" data-instance-id="${inst.id}" data-action="view">查看详情</button>
                  </div>
                </article>
              `;
            }).join("")
          : '<p class="empty-copy">暂无运行中的流程实例。创建项目并绑定流程模板后会自动创建实例。</p>'
        }
      </div>
    </section>
  `;

  container.querySelectorAll('[data-action="view"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.instanceId;
      const instance = instances.find((i) => i.id === id);
      if (!instance) return;
      renderFlowInstanceDetail(container, instance);
    });
  });
}

function renderFlowInstanceDetail(container, instance) {
  const statusLabels = { pending: "待启动", in_progress: "执行中", review_pending: "评审中", done: "已完成", blocked: "阻塞" };
  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <button class="button" id="btnBackToTracker">← 返回实例追踪</button>
      </div>
      <div class="org-detail-panel">
        <h3>${escapeHtml(instance.templateName)}</h3>
        <p>状态：${escapeHtml(instance.status)}</p>
        <div class="workflow-map-list" style="margin-top:16px;">
          ${instance.stages.map((stage, index) => {
            const [label, cls] = stageStatus[stage.status] || ["等待中", ""];
            return `
              <article class="workflow-map-row">
                <span class="stage-index">${String(index + 1).padStart(2, "0")}</span>
                <div class="manage-copy">
                  <strong>${escapeHtml(stage.name)}</strong>
                  <p>${escapeHtml(stage.description || "")}</p>
                  ${stage.gate?.enabled ? `<small>关口：${escapeHtml((stage.gate.entryConditions || []).join("；") || "无准入条件")} → ${escapeHtml((stage.gate.exitCriteria || []).join("；") || "无准出标准")}</small>` : ""}
                </div>
                <span class="chip ${cls}">${escapeHtml(label)}</span>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
  container.querySelector("#btnBackToTracker")?.addEventListener("click", () => {
    renderFlowInstanceTracker(container);
  });
}

async function loadOrgData() {
  try {
    const [skillsRes, rolesRes, employeesRes, adaptersRes, healthRes] = await Promise.all([
      api.skills(),
      api.roles(),
      api.employees(),
      api.adapters(),
      api.orgHealth(),
    ]);
    state.orgData = {
      skills: skillsRes.data || [],
      roles: rolesRes.data || [],
      employees: employeesRes.data || [],
      adapters: adaptersRes.data || [],
      health: healthRes.data || {},
    };
  } catch (err) {
    console.error("加载组织数据失败:", err);
    state.orgData = { skills: [], roles: [], employees: [], adapters: [], health: {} };
  }
}

const ORG_CATEGORY_LABELS = { general: "通用", industry: "行业", "role-specific": "岗位专属" };
const ORG_SOURCE_LABELS = { huawei_methodology: "华为方法论", org_practice: "组织实践", common_base: "公共基础" };
const ORG_TYPE_LABELS = { carbon: "碳基", silicon: "硅基", hybrid: "混编" };
const ORG_STATUS_LABELS = { active: "在职", vacation: "休假", inactive: "离职" };
const ORG_FAMILY_LIST = ["经营与战略", "市场与增长", "销售与客户", "产品与研发", "交付与运营", "职能支撑", "AI 与平台"];

function renderOrganizationPage() {
  if (!state.orgData) {
    emptyPanel.innerHTML = `<div class="page-head"><div><div class="eyebrow">Organization</div><h2>组织</h2><p>正在加载组织数据...</p></div></div>`;
    run(async () => { await loadOrgData(); renderOrganizationPage(); });
    return;
  }
  const subPages = [
    { key: "overview", label: "概览" },
    { key: "skills", label: "Skill 池" },
    { key: "roles", label: "岗位" },
    { key: "employees", label: "员工" },
    { key: "factory", label: "数字员工工厂" },
  ];
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Organization</div>
        <h2>组织</h2>
        <p>管理 Skill、岗位、员工和数字员工，构建碳硅混编团队。</p>
      </div>
    </div>
    <nav class="org-nav">
      ${subPages.map((sp) => `<button class="org-nav-item${state.orgSubPage === sp.key ? " active" : ""}" data-org-sub="${sp.key}">${sp.label}</button>`).join("")}
    </nav>
    <div id="orgSubContent"></div>
  `;
  emptyPanel.querySelector(".org-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-org-sub]");
    if (!btn) return;
    state.orgSubPage = btn.dataset.orgSub;
    renderOrganizationPage();
  });
  const container = document.getElementById("orgSubContent");
  if (state.orgSubPage === "overview") renderOrgOverview(container);
  else if (state.orgSubPage === "skills") renderSkillList(container);
  else if (state.orgSubPage === "roles") renderRoleList(container);
  else if (state.orgSubPage === "employees") renderEmployeeList(container);
  else if (state.orgSubPage === "factory") renderDigitalEmployeeFactory(container);
}

function renderOrgOverview(container) {
  const h = state.orgData.health || {};
  const emp = h.employeeCount || {};
  const coveragePercent = Math.round((h.agentCoverageRate || 0) * 100);
  const hasDefaults = state.orgData.roles.some((r) => r.isDefault);
  const draftCount = (h.draftEmployees || []).length;
  container.innerHTML = `
    <section class="ia-panel">
      <article class="ia-card accent">
        <span>Skill 池</span>
        <strong>${h.skillCount || 0} 项能力</strong>
        <p>技能是岗位的基本构成单元。</p>
      </article>
      <article class="ia-card">
        <span>岗位</span>
        <strong>${h.roleCount || 0} 个岗位</strong>
        <p>岗位定义职责、权限和验收标准。</p>
      </article>
      <article class="ia-card">
        <span>员工</span>
        <strong>碳 ${emp.carbon || 0} · 硅 ${emp.silicon || 0} · 混编 ${emp.hybrid || 0}</strong>
        <p>总计 ${emp.total || 0} 名员工。</p>
      </article>
      <article class="ia-card">
        <span>Agent 覆盖率</span>
        <strong>${coveragePercent}%</strong>
        <p>硅基员工中有 Agent 关联的比例。</p>
      </article>
    </section>
    ${!hasDefaults ? `
    <section class="page-section">
      <div class="section-head"><h3>快速开始</h3></div>
      <p class="empty-copy">初始化 7 大岗位族默认模板，快速搭建组织框架。</p>
      <button class="button primary" type="button" data-init-defaults>生成默认模板</button>
    </section>` : ""}
    <section class="page-section">
      <div class="section-head"><h3>数字员工工厂</h3></div>
      <p class="empty-copy">为硅基/混编员工配置技能匹配、入职培训和师父带教。${draftCount > 0 ? `当前有 ${draftCount} 个草稿进行中。` : ""}</p>
      <button class="button primary" type="button" data-goto-factory>进入数字员工工厂</button>
    </section>
    ${(h.emptyFamilies && h.emptyFamilies.length > 0) ? `
    <section class="page-section">
      <div class="section-head"><h3>岗位族缺口</h3></div>
      <p class="empty-copy">以下岗位族暂无任何岗位：${h.emptyFamilies.map((f) => `「${escapeHtml(f)}」`).join("、")}</p>
    </section>` : ""}
    ${(h.rolesWithoutEmployees && h.rolesWithoutEmployees.length > 0) ? `
    <section class="page-section">
      <div class="section-head"><h3>无员工岗位</h3></div>
      <div class="manage-list">
        ${h.rolesWithoutEmployees.map((r) => `<article class="manage-row"><div class="manage-copy"><strong>${escapeHtml(r.name)}</strong></div></article>`).join("")}
      </div>
    </section>` : ""}
    ${(h.rolesWithoutSkills && h.rolesWithoutSkills.length > 0) ? `
    <section class="page-section">
      <div class="section-head"><h3>无 Skill 岗位</h3></div>
      <div class="manage-list">
        ${h.rolesWithoutSkills.map((r) => `<article class="manage-row"><div class="manage-copy"><strong>${escapeHtml(r.name)}</strong></div></article>`).join("")}
      </div>
    </section>` : ""}
    ${(h.draftEmployees && h.draftEmployees.length > 0) ? `
    <section class="page-section">
      <div class="section-head"><h3>数字员工草稿进行中</h3></div>
      <div class="manage-list">
        ${h.draftEmployees.map((e) => `<article class="manage-row"><div class="manage-copy"><strong>${escapeHtml(e.name)}</strong><p>草稿状态：${escapeHtml(e.draftStatus)}</p></div></article>`).join("")}
      </div>
    </section>` : ""}
  `;
  const initBtn = container.querySelector("[data-init-defaults]");
  if (initBtn) {
    initBtn.addEventListener("click", () => {
      run(async () => {
        try {
          const result = await api.initOrgDefaults();
          await loadOrgData();
          renderOrganizationPage();
          showToast(`已生成 ${result.data.skillsCreated} 个 Skill 和 ${result.data.rolesCreated} 个岗位`);
        } catch (error) {
          showToast("初始化默认模板失败: " + error.message, "error");
        }
      });
    });
  }
  const factoryBtn = container.querySelector("[data-goto-factory]");
  if (factoryBtn) {
    factoryBtn.addEventListener("click", () => {
      state.orgSubPage = "factory";
      renderOrganizationPage();
    });
  }
}

function renderSkillList(container) {
  const skills = state.orgData.skills || [];
  const roles = state.orgData.roles || [];
  const search = "";
  const category = "";
  function filtered() {
    let result = skills;
    const searchInput = container.querySelector("[data-skill-search]");
    const categorySelect = container.querySelector("[data-skill-category]");
    const s = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const c = categorySelect ? categorySelect.value : "";
    if (c) result = result.filter((sk) => sk.category === c);
    if (s) result = result.filter((sk) => sk.name.toLowerCase().includes(s) || (sk.tags || []).some((t) => t.toLowerCase().includes(s)));
    return result;
  }
  function renderRows() {
    const list = filtered();
    const listEl = container.querySelector("[data-skill-list]");
    if (!listEl) return;
    listEl.innerHTML = list.length === 0
      ? `<p class="empty-copy">暂无 Skill，点击右上角新建。</p>`
      : list.map((sk) => {
          const refRoles = roles.filter((r) => (r.skillIds || []).includes(sk.id));
          return `
            <article class="manage-row" data-skill-id="${escapeHtml(sk.id)}">
              <div class="manage-copy">
                <strong>${escapeHtml(sk.name)}</strong>
                <p>${escapeHtml(sk.description || "")}</p>
                <small>${ORG_CATEGORY_LABELS[sk.category] || sk.category || ""} · L${sk.level || 1} · ${ORG_SOURCE_LABELS[sk.source] || sk.source || ""}${(sk.tags && sk.tags.length > 0) ? ` · ${sk.tags.map((t) => `#${escapeHtml(t)}`).join(" ")}` : ""}${refRoles.length > 0 ? ` · 被 ${refRoles.length} 个岗位引用` : ""}</small>
              </div>
              <div class="manage-actions">
                <button class="button" type="button" data-edit-skill="${escapeHtml(sk.id)}">编辑</button>
                <button class="button danger" type="button" data-delete-skill="${escapeHtml(sk.id)}">删除</button>
              </div>
            </article>`;
        }).join("");
  }
  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <h3>Skill 池</h3>
        <span class="section-hint">${skills.length} 项</span>
        <button class="button primary" type="button" data-create-skill>新建 Skill</button>
      </div>
      <div class="compact-form" style="display:flex;gap:8px;margin-bottom:12px;">
        <input data-skill-search type="text" placeholder="搜索名称或标签..." style="flex:1;" />
        <select data-skill-category style="min-width:120px;">
          <option value="">全部分类</option>
          <option value="general">通用</option>
          <option value="industry">行业</option>
          <option value="role-specific">岗位专属</option>
        </select>
      </div>
      <div class="manage-list" data-skill-list>
      </div>
    </section>
  `;
  renderRows();
  container.querySelector("[data-skill-search]").addEventListener("input", renderRows);
  container.querySelector("[data-skill-category]").addEventListener("change", renderRows);
  container.querySelector("[data-create-skill]").addEventListener("click", () => {
    run(async () => {
      const values = await openActionModal({
        title: "新建 Skill",
        fields: [
          { name: "name", label: "名称", required: true, placeholder: "例如：战略规划" },
          { name: "description", label: "描述", type: "textarea", placeholder: "Skill 的详细描述" },
          { name: "category", label: "分类", value: "general", type: "select", options: [
            { value: "general", label: "通用" },
            { value: "industry", label: "行业" },
            { value: "role-specific", label: "岗位专属" },
          ]},
          { name: "level", label: "等级 (1-4)", value: "1", type: "number" },
          { name: "source", label: "来源", value: "org_practice", type: "select", options: [
            { value: "huawei_methodology", label: "华为方法论" },
            { value: "org_practice", label: "组织实践" },
            { value: "common_base", label: "公共基础" },
          ]},
          { name: "tags", label: "标签（逗号分隔）", placeholder: "例如：规划,战略" },
        ],
      });
      if (!values) return;
      try {
        const tags = String(values.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        await api.createSkill({ name: values.name, description: values.description, category: values.category, level: Number(values.level) || 1, source: values.source, tags });
        await loadOrgData();
        renderOrganizationPage();
        showToast("Skill 已创建");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  container.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit-skill]");
    const deleteBtn = event.target.closest("[data-delete-skill]");
    if (editBtn) {
      const skillId = editBtn.dataset.editSkill;
      const skill = state.orgData.skills.find((s) => s.id === skillId);
      if (!skill) return;
      run(async () => {
        const values = await openActionModal({
          title: "编辑 Skill",
          fields: [
            { name: "name", label: "名称", value: skill.name, required: true },
            { name: "description", label: "描述", type: "textarea", value: skill.description || "" },
            { name: "category", label: "分类", value: skill.category || "general", type: "select", options: [
              { value: "general", label: "通用" },
              { value: "industry", label: "行业" },
              { value: "role-specific", label: "岗位专属" },
            ]},
            { name: "level", label: "等级 (1-4)", value: String(skill.level || 1), type: "number" },
            { name: "source", label: "来源", value: skill.source || "org_practice", type: "select", options: [
              { value: "huawei_methodology", label: "华为方法论" },
              { value: "org_practice", label: "组织实践" },
              { value: "common_base", label: "公共基础" },
            ]},
            { name: "tags", label: "标签（逗号分隔）", value: (skill.tags || []).join(", ") },
          ],
        });
        if (!values) return;
        try {
          const tags = String(values.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
          await api.updateSkill(skillId, { name: values.name, description: values.description, category: values.category, level: Number(values.level) || 1, source: values.source, tags });
          await loadOrgData();
          renderOrganizationPage();
          showToast("Skill 已更新");
        } catch (error) { showToast(error.message, "error"); }
      });
    }
    if (deleteBtn) {
      const skillId = deleteBtn.dataset.deleteSkill;
      run(async () => {
        if (!(await askConfirm("确认删除此 Skill？如果被岗位引用将无法删除。", { title: "删除 Skill", danger: true, confirmLabel: "确认删除" }))) return;
        try {
          await api.deleteSkill(skillId);
          await loadOrgData();
          renderOrganizationPage();
          showToast("Skill 已删除");
        } catch (error) {
          if (error.message && error.message.includes("引用")) {
            showToast(error.message, "error");
          } else {
            showToast(error.message, "error");
          }
        }
      });
    }
  });
}

function renderRoleList(container) {
  const roles = state.orgData.roles || [];
  const skills = state.orgData.skills || [];
  const employees = state.orgData.employees || [];
  function filtered() {
    let result = roles;
    const familySelect = container.querySelector("[data-role-family]");
    const typeSelect = container.querySelector("[data-role-type]");
    const f = familySelect ? familySelect.value : "";
    const t = typeSelect ? typeSelect.value : "";
    if (f) result = result.filter((r) => r.family === f);
    if (t) result = result.filter((r) => r.type === t);
    return result;
  }
  function renderRows() {
    const list = filtered();
    const listEl = container.querySelector("[data-role-list]");
    if (!listEl) return;
    listEl.innerHTML = list.length === 0
      ? `<p class="empty-copy">暂无岗位，点击右上角新建。</p>`
      : list.map((r) => {
          const roleSkills = (r.skillIds || []).map((sid) => skills.find((s) => s.id === sid)).filter(Boolean);
          const roleEmployees = employees.filter((e) => (e.roleIds || []).includes(r.id));
          return `
            <article class="manage-row" data-role-id="${escapeHtml(r.id)}">
              <div class="manage-copy">
                <strong>${escapeHtml(r.name)}${r.isDefault ? ' <span class="chip">预设</span>' : ""}</strong>
                <p>${escapeHtml(r.description || "")}</p>
                <small>${escapeHtml(r.family || "")} · ${ORG_TYPE_LABELS[r.type] || r.type || ""} · ${roleSkills.length} 个 Skill · ${roleEmployees.length} 名员工</small>
              </div>
              <div class="manage-actions">
                <button class="button" type="button" data-edit-role="${escapeHtml(r.id)}">编辑</button>
                ${!r.isDefault ? `<button class="button danger" type="button" data-delete-role="${escapeHtml(r.id)}">删除</button>` : ""}
              </div>
            </article>`;
        }).join("");
  }
  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <h3>岗位</h3>
        <span class="section-hint">${roles.length} 个</span>
        <button class="button primary" type="button" data-create-role>新建岗位</button>
      </div>
      <div class="compact-form" style="display:flex;gap:8px;margin-bottom:12px;">
        <select data-role-family style="min-width:140px;">
          <option value="">全部岗位族</option>
          ${ORG_FAMILY_LIST.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("")}
          <option value="__custom__">自定义</option>
        </select>
        <select data-role-type style="min-width:100px;">
          <option value="">全部类型</option>
          <option value="carbon">碳基</option>
          <option value="silicon">硅基</option>
          <option value="hybrid">混编</option>
        </select>
      </div>
      <div class="manage-list" data-role-list></div>
    </section>
  `;
  renderRows();
  container.querySelector("[data-role-family]").addEventListener("change", renderRows);
  container.querySelector("[data-role-type]").addEventListener("change", renderRows);
  container.querySelector("[data-create-role]").addEventListener("click", () => {
    run(async () => {
      const values = await openActionModal({
        title: "新建岗位",
        fields: [
          { name: "name", label: "名称", required: true, placeholder: "例如：产品经理" },
          { name: "description", label: "描述", type: "textarea", placeholder: "岗位职责描述" },
          { name: "family", label: "岗位族", value: "", type: "select", options: [
            { value: "", label: "请选择岗位族" },
            ...ORG_FAMILY_LIST.map((f) => ({ value: f, label: f })),
            { value: "__custom__", label: "自定义" },
          ]},
          { name: "type", label: "类型", value: "hybrid", type: "select", options: [
            { value: "carbon", label: "碳基" },
            { value: "silicon", label: "硅基" },
            { value: "hybrid", label: "混编" },
          ]},
          { name: "skillIds", label: "关联 Skill", type: "checkbox", value: [], options: skills.map((s) => ({ value: s.id, label: s.name })) },
          { name: "acceptanceCriteria", label: "验收标准", type: "textarea" },
          { name: "flowNotes", label: "流程备注", type: "textarea" },
        ],
      });
      if (!values) return;
      try {
        const skillIdList = Array.isArray(values.skillIds) ? values.skillIds : [];
        await api.createRole({ name: values.name, description: values.description, family: values.family, type: values.type, skillIds: skillIdList, acceptanceCriteria: values.acceptanceCriteria, flowNotes: values.flowNotes });
        await loadOrgData();
        renderOrganizationPage();
        showToast("岗位已创建");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  container.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit-role]");
    const deleteBtn = event.target.closest("[data-delete-role]");
    if (editBtn) {
      const roleId = editBtn.dataset.editRole;
      const role = state.orgData.roles.find((r) => r.id === roleId);
      if (!role) return;
      run(async () => {
        const currentSkillIds = role.skillIds || [];
        const values = await openActionModal({
          title: "编辑岗位",
          fields: [
            { name: "name", label: "名称", value: role.name, required: true },
            { name: "description", label: "描述", type: "textarea", value: role.description || "" },
            { name: "family", label: "岗位族", value: role.family || "", type: "select", options: [
              { value: "", label: "请选择岗位族" },
              ...ORG_FAMILY_LIST.map((f) => ({ value: f, label: f })),
              { value: "__custom__", label: "自定义" },
            ]},
            { name: "type", label: "类型", value: role.type || "hybrid", type: "select", options: [
              { value: "carbon", label: "碳基" },
              { value: "silicon", label: "硅基" },
              { value: "hybrid", label: "混编" },
            ]},
            { name: "skillIds", label: "关联 Skill", type: "checkbox", value: currentSkillIds, options: skills.map((s) => ({ value: s.id, label: s.name })) },
            { name: "acceptanceCriteria", label: "验收标准", type: "textarea", value: role.acceptanceCriteria || "" },
            { name: "flowNotes", label: "流程备注", type: "textarea", value: role.flowNotes || "" },
          ],
        });
        if (!values) return;
        try {
          const skillIdList = Array.isArray(values.skillIds) ? values.skillIds : [];
          await api.updateRole(roleId, { name: values.name, description: values.description, family: values.family, type: values.type, skillIds: skillIdList, acceptanceCriteria: values.acceptanceCriteria, flowNotes: values.flowNotes });
          await loadOrgData();
          renderOrganizationPage();
          showToast("岗位已更新");
        } catch (error) { showToast(error.message, "error"); }
      });
    }
    if (deleteBtn) {
      const roleId = deleteBtn.dataset.deleteRole;
      run(async () => {
        if (!(await askConfirm("确认删除此岗位？如果被员工绑定将无法删除。", { title: "删除岗位", danger: true, confirmLabel: "确认删除" }))) return;
        try {
          await api.deleteRole(roleId);
          await loadOrgData();
          renderOrganizationPage();
          showToast("岗位已删除");
        } catch (error) { showToast(error.message, "error"); }
      });
    }
  });
}

function renderEmployeeList(container) {
  const employees = state.orgData.employees || [];
  const roles = state.orgData.roles || [];
  const agents = state.workspace?.agents || [];
  function filtered() {
    let result = employees;
    const typeSelect = container.querySelector("[data-emp-type]");
    const t = typeSelect ? typeSelect.value : "";
    if (t) result = result.filter((e) => e.type === t);
    return result;
  }
  function renderRows() {
    const list = filtered();
    const listEl = container.querySelector("[data-emp-list]");
    if (!listEl) return;
    listEl.innerHTML = list.length === 0
      ? `<p class="empty-copy">暂无员工，点击右上角新建。</p>`
      : list.map((e) => {
          const empRoles = (e.roleIds || []).map((rid) => roles.find((r) => r.id === rid)).filter(Boolean);
          const draftStatus = e.digitalEmployeeDraft ? e.digitalEmployeeDraft.status : null;
          const draftLabel = draftStatus === "draft_complete" ? "草稿完成（待分配工具）" : draftStatus && draftStatus !== "empty" ? `草稿中：${draftStatus}` : "";
          return `
            <article class="manage-row" data-emp-id="${escapeHtml(e.id)}">
              <div class="manage-copy">
                <strong>${escapeHtml(e.name)}</strong>
                <p>${ORG_TYPE_LABELS[e.type] || e.type || ""}员工 · ${ORG_STATUS_LABELS[e.status] || e.status || ""}${empRoles.length > 0 ? ` · ${empRoles.map((r) => escapeHtml(r.name)).join("、")}` : ""}</p>
                ${draftLabel ? `<small>${escapeHtml(draftLabel)}</small>` : ""}
              </div>
              <div class="manage-actions">
                <button class="button" type="button" data-edit-emp="${escapeHtml(e.id)}">编辑</button>
                ${(e.type === "silicon" || e.type === "hybrid") && e.digitalEmployeeDraft ? `<button class="button" type="button" data-factory-emp="${escapeHtml(e.id)}">工厂</button>` : ""}
                ${e.status !== "inactive" ? `<button class="button danger" type="button" data-delete-emp="${escapeHtml(e.id)}">删除</button>` : ""}
              </div>
            </article>`;
        }).join("");
  }
  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <h3>员工</h3>
        <span class="section-hint">${employees.length} 名</span>
        <button class="button primary" type="button" data-create-emp>新建员工</button>
      </div>
      <div class="compact-form" style="display:flex;gap:8px;margin-bottom:12px;">
        <select data-emp-type style="min-width:100px;">
          <option value="">全部类型</option>
          <option value="carbon">碳基</option>
          <option value="silicon">硅基</option>
          <option value="hybrid">混编</option>
        </select>
      </div>
      <div class="manage-list" data-emp-list></div>
    </section>
  `;
  renderRows();
  container.querySelector("[data-emp-type]").addEventListener("change", renderRows);
  container.querySelector("[data-create-emp]").addEventListener("click", () => {
    run(async () => {
      const values = await openActionModal({
        title: "新建员工",
        fields: [
          { name: "name", label: "姓名", required: true, placeholder: "员工姓名" },
          { name: "type", label: "类型", value: "carbon", type: "select", options: [
            { value: "carbon", label: "碳基" },
            { value: "silicon", label: "硅基" },
            { value: "hybrid", label: "混编" },
          ]},
          { name: "agentId", label: "关联 Agent（硅基/混编必填）", value: "", type: "select", options: [
            { value: "", label: "无（碳基员工不需要）" },
            ...agents.map((a) => ({ value: a.id, label: a.name })),
          ]},
          { name: "roleIds", label: "关联岗位", type: "checkbox", value: [], options: roles.map((r) => ({ value: r.id, label: r.name })) },
        ],
      });
      if (!values) return;
      try {
        const empType = values.type || "carbon";
        const roleIds = Array.isArray(values.roleIds) ? values.roleIds : [];
        await api.createEmployee({ name: values.name, type: empType, agentId: values.agentId || undefined, roleIds });
        await loadOrgData();
        renderOrganizationPage();
        showToast("员工已创建");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  container.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit-emp]");
    const deleteBtn = event.target.closest("[data-delete-emp]");
    const factoryBtn = event.target.closest("[data-factory-emp]");
    if (editBtn) {
      const empId = editBtn.dataset.editEmp;
      const emp = state.orgData.employees.find((e) => e.id === empId);
      if (!emp) return;
      run(async () => {
        const currentRoleIds = emp.roleIds || [];
        const values = await openActionModal({
          title: "编辑员工",
          fields: [
            { name: "name", label: "姓名", value: emp.name, required: true },
            { name: "status", label: "状态", value: emp.status || "active", type: "select", options: [
              { value: "active", label: "在职" },
              { value: "vacation", label: "休假" },
              { value: "inactive", label: "离职" },
            ]},
            { name: "roleIds", label: "关联岗位", type: "checkbox", value: currentRoleIds, options: roles.map((r) => ({ value: r.id, label: r.name })) },
          ],
        });
        if (!values) return;
        try {
          const roleIds = Array.isArray(values.roleIds) ? values.roleIds : [];
          await api.updateEmployee(empId, { name: values.name, status: values.status, roleIds });
          await loadOrgData();
          renderOrganizationPage();
          showToast("员工已更新");
        } catch (error) { showToast(error.message, "error"); }
      });
    }
    if (deleteBtn) {
      const empId = deleteBtn.dataset.deleteEmp;
      run(async () => {
        if (!(await askConfirm("确认删除此员工？员工将被标记为离职状态。", { title: "删除员工", danger: true, confirmLabel: "确认删除" }))) return;
        try {
          await api.deleteEmployee(empId);
          await loadOrgData();
          renderOrganizationPage();
          showToast("员工已删除");
        } catch (error) { showToast(error.message, "error"); }
      });
    }
    if (factoryBtn) {
      state.factoryEmployeeId = factoryBtn.dataset.factoryEmp;
      state.orgSubPage = "factory";
      renderOrganizationPage();
    }
  });
}

const FACTORY_STEP_LABELS = ["岗位匹配", "入职培训", "师父带教", "工具配置", "试运行", "正式上岗"];
const DRAFT_STATUS_STEP_MAP = { empty: 0, skill_matching: 0, onboarding: 1, mentorship: 2, draft_complete: 3 };

function renderDigitalEmployeeFactory(container) {
  const employees = (state.orgData.employees || []).filter(
    (e) => (e.type === "silicon" || e.type === "hybrid") && e.digitalEmployeeDraft
  );
  const selectedEmployee = state.factoryEmployeeId
    ? employees.find((e) => e.id === state.factoryEmployeeId)
    : null;
  const draftStatus = selectedEmployee?.digitalEmployeeDraft?.status || "empty";
  const currentStep = DRAFT_STATUS_STEP_MAP[draftStatus] ?? 0;

  if (!selectedEmployee) {
    container.innerHTML = `
      <section class="page-section">
        <div class="section-head"><h3>数字员工工厂</h3></div>
        <p class="empty-copy">选择一个硅基/混编员工开始配置数字员工。${employees.length === 0 ? "请先在员工页创建硅基或混编员工。" : ""}</p>
        ${employees.length > 0 ? `
        <div class="manage-list">
          ${employees.map((e) => {
            const ds = e.digitalEmployeeDraft?.status || "empty";
            const stepNum = DRAFT_STATUS_STEP_MAP[ds] ?? 0;
            const isDraftComplete = ds === "draft_complete";
            return `
              <article class="manage-row">
                <div class="manage-copy">
                  <strong>${escapeHtml(e.name)}</strong>
                  <p>草稿状态：${escapeHtml(ds)}${isDraftComplete ? " — 草稿完成（待分配工具）" : stepNum > 0 ? ` — 步骤 ${stepNum + 1}/3 进行中` : " — 尚未开始"}</p>
                </div>
                <button class="button primary" type="button" data-select-factory-emp="${escapeHtml(e.id)}">${isDraftComplete ? "查看" : "继续配置"}</button>
              </article>`;
          }).join("")}
        </div>` : ""}
      </section>
    `;
    container.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-select-factory-emp]");
      if (!btn) return;
      state.factoryEmployeeId = btn.dataset.selectFactoryEmp;
      renderDigitalEmployeeFactory(container);
    });
    return;
  }

  container.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <h3>数字员工工厂 — ${escapeHtml(selectedEmployee.name)}</h3>
        <button class="button" type="button" data-factory-back>返回列表</button>
      </div>
      <div class="factory-steps">
        ${FACTORY_STEP_LABELS.map((label, i) => {
          const isCompleted = i < currentStep || draftStatus === "draft_complete";
          const isCurrent = i === currentStep && draftStatus !== "draft_complete";
          const isDisabled = i >= 3;
          const cls = isDisabled ? "disabled" : isCurrent ? "active" : isCompleted ? "completed" : "";
          return `<div class="factory-step ${cls}">${i + 1}. ${label}${isDisabled ? "（即将推出）" : ""}</div>`;
        }).join("")}
      </div>
      <div class="factory-panel" id="factoryStepPanel"></div>
    </section>
  `;
  container.querySelector("[data-factory-back]").addEventListener("click", () => {
    state.factoryEmployeeId = null;
    renderDigitalEmployeeFactory(container);
  });
  const stepPanel = document.getElementById("factoryStepPanel");
  if (currentStep === 0 && draftStatus !== "draft_complete") renderFactoryStep1(stepPanel, selectedEmployee);
  else if (currentStep === 1) renderFactoryStep2(stepPanel, selectedEmployee);
  else if (currentStep === 2) renderFactoryStep3(stepPanel, selectedEmployee);
  else if (draftStatus === "draft_complete") {
    stepPanel.innerHTML = `
      <div class="factory-form">
        <p>草稿已完成，等待后续步骤（工具配置、试运行、正式上岗）。</p>
        <p>当前草稿状态：<strong>draft_complete</strong></p>
        <div class="factory-actions">
          <button class="button" type="button" data-factory-back>返回列表</button>
        </div>
      </div>
    `;
  }
}

function renderFactoryStep1(panel, employee) {
  const roles = state.orgData.roles || [];
  const skills = state.orgData.skills || [];
  const draft = employee.digitalEmployeeDraft || {};
  const targetRole = draft.targetRoleId ? roles.find((r) => r.id === draft.targetRoleId) : null;
  const targetSkillIds = targetRole ? (targetRole.skillIds || []) : [];
  const targetSkills = targetSkillIds.map((sid) => skills.find((s) => s.id === sid)).filter(Boolean);
  const existingMatching = draft.skillMatching || {};

  panel.innerHTML = `
    <div class="factory-form">
      <div class="form-field">
        <span>目标岗位</span>
        <select id="factoryTargetRole">
          <option value="">请选择岗位</option>
          ${roles.map((r) => `<option value="${escapeHtml(r.id)}"${r.id === draft.targetRoleId ? " selected" : ""}>${escapeHtml(r.name)} (${escapeHtml(r.family || "")})</option>`).join("")}
        </select>
      </div>
      <div id="factorySkillTable">
        ${targetSkills.length > 0 ? `
        <div class="form-field">
          <span>Skill 等级要求</span>
          ${targetSkills.map((sk) => {
            const override = (existingMatching.skillLevelRequirements || {})[sk.id] || sk.level;
            return `
              <div class="factory-skill-row">
                <span style="flex:1;">${escapeHtml(sk.name)} (${escapeHtml(sk.category)})</span>
                <select data-skill-level="${escapeHtml(sk.id)}">
                  ${[1, 2, 3, 4].map((l) => `<option value="${l}"${l === override ? " selected" : ""}>L${l}</option>`).join("")}
                </select>
              </div>`;
          }).join("")}
        </div>` : ""}
      </div>
      <div class="form-field">
        <span>验收标准</span>
        <textarea id="factoryAcceptance" placeholder="默认取岗位验收标准">${escapeHtml(existingMatching.acceptanceCriteria || targetRole?.acceptanceCriteria || "")}</textarea>
      </div>
      <div class="form-field">
        <span>职责边界</span>
        <textarea id="factoryBoundary" placeholder="描述数字员工的职责边界">${escapeHtml(existingMatching.responsibilityBoundary || "")}</textarea>
      </div>
      <div class="factory-actions">
        <button class="button" type="button" data-save-draft-step1>保存草稿</button>
        <button class="button primary" type="button" data-next-step1>下一步</button>
      </div>
    </div>
  `;
  const roleSelect = document.getElementById("factoryTargetRole");
  const skillTable = document.getElementById("factorySkillTable");
  roleSelect.addEventListener("change", () => {
    const roleId = roleSelect.value;
    const role = roles.find((r) => r.id === roleId);
    if (!role) { skillTable.innerHTML = ""; return; }
    const roleSkills = (role.skillIds || []).map((sid) => skills.find((s) => s.id === sid)).filter(Boolean);
    skillTable.innerHTML = roleSkills.length === 0 ? "" : `
      <div class="form-field">
        <span>Skill 等级要求</span>
        ${roleSkills.map((sk) => `
          <div class="factory-skill-row">
            <span style="flex:1;">${escapeHtml(sk.name)} (${escapeHtml(sk.category)})</span>
            <select data-skill-level="${escapeHtml(sk.id)}">
              ${[1, 2, 3, 4].map((l) => `<option value="${l}"${l === sk.level ? " selected" : ""}>L${l}</option>`).join("")}
            </select>
          </div>`).join("")}
      </div>`;
    const acceptanceEl = document.getElementById("factoryAcceptance");
    if (acceptanceEl && role.acceptanceCriteria && !acceptanceEl.value.trim()) {
      acceptanceEl.value = role.acceptanceCriteria;
    }
  });
  function collectStep1Data() {
    const targetRoleId = roleSelect.value || null;
    const skillLevelRequirements = {};
    panel.querySelectorAll("[data-skill-level]").forEach((sel) => {
      skillLevelRequirements[sel.dataset.skillLevel] = Number(sel.value);
    });
    const inputOutputDefs = [];
    const tRole = targetRoleId ? roles.find((r) => r.id === targetRoleId) : null;
    if (tRole) {
      (tRole.skillIds || []).forEach((sid) => {
        inputOutputDefs.push({ skillId: sid, input: "", output: "" });
      });
    }
    return {
      targetRoleId,
      skillMatching: {
        skillLevelRequirements,
        inputOutputDefs,
        responsibilityBoundary: document.getElementById("factoryBoundary")?.value || "",
        acceptanceCriteria: document.getElementById("factoryAcceptance")?.value || "",
        completedAt: null,
      },
    };
  }
  panel.querySelector("[data-save-draft-step1]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep1Data();
      try {
        await api.updateEmployee(employee.id, {
          digitalEmployeeDraft: {
            targetRoleId: data.targetRoleId,
            skillMatching: data.skillMatching,
          },
        });
        await loadOrgData();
        showToast("草稿已保存");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  panel.querySelector("[data-next-step1]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep1Data();
      if (!data.targetRoleId) { showToast("请先选择目标岗位", "error"); return; }
      try {
        const nextStatus = draft.status === "empty" ? "skill_matching" : draft.status;
        await api.updateEmployee(employee.id, {
          digitalEmployeeDraft: {
            status: nextStatus === "empty" ? "skill_matching" : nextStatus,
            targetRoleId: data.targetRoleId,
            skillMatching: data.skillMatching,
          },
        });
        await api.updateEmployee(employee.id, {
          digitalEmployeeDraft: { status: "onboarding" },
        });
        await loadOrgData();
        renderOrganizationPage();
        showToast("已进入入职培训步骤");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
}

function renderFactoryStep2(panel, employee) {
  const draft = employee.digitalEmployeeDraft || {};
  const existing = draft.onboarding || {};
  panel.innerHTML = `
    <div class="factory-form">
      <div class="form-field">
        <span>知识库引用</span>
        <div id="factoryKnowledgeList">
          ${(existing.knowledgeBaseRefs || []).map((ref, i) => `
            <div class="factory-list-item" data-kb-index="${i}">
              <input placeholder="标题" value="${escapeHtml(ref.title || "")}" data-kb-title />
              <input placeholder="URL" value="${escapeHtml(ref.url || "")}" data-kb-url />
              <button class="button danger" type="button" data-remove-kb>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-kb>添加知识库引用</button>
      </div>
      <div class="form-field">
        <span>业务语料</span>
        <div id="factoryCorpusList">
          ${(existing.businessCorpus || []).map((item, i) => `
            <div class="factory-list-item" data-corpus-index="${i}">
              <input placeholder="标题" value="${escapeHtml(item.title || "")}" data-corpus-title />
              <textarea placeholder="内容" data-corpus-content>${escapeHtml(item.content || "")}</textarea>
              <button class="button danger" type="button" data-remove-corpus>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-corpus>添加业务语料</button>
      </div>
      <div class="form-field">
        <span>行业规则</span>
        <div id="factoryRulesList">
          ${(existing.industryRules || []).map((item, i) => `
            <div class="factory-list-item" data-rules-index="${i}">
              <input placeholder="标题" value="${escapeHtml(item.title || "")}" data-rules-title />
              <textarea placeholder="内容" data-rules-content>${escapeHtml(item.content || "")}</textarea>
              <button class="button danger" type="button" data-remove-rules>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-rules>添加行业规则</button>
      </div>
      <div class="form-field">
        <span>历史案例</span>
        <div id="factoryCasesList">
          ${(existing.historicalCases || []).map((item, i) => `
            <div class="factory-list-item" data-cases-index="${i}">
              <input placeholder="标题" value="${escapeHtml(item.title || "")}" data-cases-title />
              <input placeholder="摘要" value="${escapeHtml(item.summary || "")}" data-cases-summary />
              <button class="button danger" type="button" data-remove-cases>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-cases>添加历史案例</button>
      </div>
      <div class="factory-actions">
        <button class="button" type="button" data-save-draft-step2>保存草稿</button>
        <button class="button primary" type="button" data-next-step2>下一步</button>
      </div>
    </div>
  `;

  function addListItem(listId, fields) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;
    const div = document.createElement("div");
    div.className = "factory-list-item";
    div.innerHTML = fields + `<button class="button danger" type="button" data-remove-self>删除</button>`;
    div.querySelector("[data-remove-self]").addEventListener("click", () => div.remove());
    listEl.appendChild(div);
  }
  panel.querySelector("[data-add-kb]").addEventListener("click", () => {
    addListItem("factoryKnowledgeList", `<input placeholder="标题" data-kb-title /><input placeholder="URL" data-kb-url />`);
  });
  panel.querySelector("[data-add-corpus]").addEventListener("click", () => {
    addListItem("factoryCorpusList", `<input placeholder="标题" data-corpus-title /><textarea placeholder="内容" data-corpus-content></textarea>`);
  });
  panel.querySelector("[data-add-rules]").addEventListener("click", () => {
    addListItem("factoryRulesList", `<input placeholder="标题" data-rules-title /><textarea placeholder="内容" data-rules-content></textarea>`);
  });
  panel.querySelector("[data-add-cases]").addEventListener("click", () => {
    addListItem("factoryCasesList", `<input placeholder="标题" data-cases-title /><input placeholder="摘要" data-cases-summary />`);
  });
  panel.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove-kb],[data-remove-corpus],[data-remove-rules],[data-remove-cases]");
    if (removeBtn) removeBtn.closest(".factory-list-item").remove();
  });

  function collectStep2Data() {
    const knowledgeBaseRefs = [];
    document.querySelectorAll("#factoryKnowledgeList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-kb-title]")?.value?.trim() || "";
      const url = item.querySelector("[data-kb-url]")?.value?.trim() || "";
      if (title || url) knowledgeBaseRefs.push({ title, url });
    });
    const businessCorpus = [];
    document.querySelectorAll("#factoryCorpusList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-corpus-title]")?.value?.trim() || "";
      const content = item.querySelector("[data-corpus-content]")?.value?.trim() || "";
      if (title || content) businessCorpus.push({ title, content });
    });
    const industryRules = [];
    document.querySelectorAll("#factoryRulesList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-rules-title]")?.value?.trim() || "";
      const content = item.querySelector("[data-rules-content]")?.value?.trim() || "";
      if (title || content) industryRules.push({ title, content });
    });
    const historicalCases = [];
    document.querySelectorAll("#factoryCasesList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-cases-title]")?.value?.trim() || "";
      const summary = item.querySelector("[data-cases-summary]")?.value?.trim() || "";
      if (title || summary) historicalCases.push({ title, summary });
    });
    return {
      onboarding: { knowledgeBaseRefs, businessCorpus, industryRules, historicalCases, completedAt: null },
    };
  }

  panel.querySelector("[data-save-draft-step2]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep2Data();
      try {
        await api.updateEmployee(employee.id, { digitalEmployeeDraft: { onboarding: data.onboarding } });
        await loadOrgData();
        showToast("草稿已保存");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  panel.querySelector("[data-next-step2]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep2Data();
      try {
        await api.updateEmployee(employee.id, {
          digitalEmployeeDraft: { status: "mentorship", onboarding: { ...data.onboarding, completedAt: new Date().toISOString() } },
        });
        await loadOrgData();
        renderOrganizationPage();
        showToast("已进入师父带教步骤");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
}

function renderFactoryStep3(panel, employee) {
  const employees = state.orgData.employees || [];
  const draft = employee.digitalEmployeeDraft || {};
  const existing = draft.mentorship || {};
  const carbonEmployees = employees.filter((e) => e.type === "carbon" && e.status === "active");

  panel.innerHTML = `
    <div class="factory-form">
      <div class="form-field">
        <span>SOP 列表</span>
        <div id="factorySopList">
          ${(existing.sops || []).map((sop, i) => `
            <div class="factory-list-item" data-sop-index="${i}">
              <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                <input placeholder="SOP 标题" value="${escapeHtml(sop.title || "")}" data-sop-title />
                <textarea placeholder="步骤（每行一步）" data-sop-steps>${escapeHtml((sop.steps || []).join("\n"))}</textarea>
              </div>
              <button class="button danger" type="button" data-remove-sop>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-sop>添加 SOP</button>
      </div>
      <div class="form-field">
        <span>示范样例</span>
        <div id="factoryExampleList">
          ${(existing.examples || []).map((ex, i) => `
            <div class="factory-list-item" data-example-index="${i}">
              <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                <input placeholder="样例标题" value="${escapeHtml(ex.title || "")}" data-example-title />
                <input placeholder="输入描述" value="${escapeHtml(ex.inputDesc || "")}" data-example-input />
                <input placeholder="输出描述" value="${escapeHtml(ex.outputDesc || "")}" data-example-output />
                <textarea placeholder="备注" data-example-notes>${escapeHtml(ex.notes || "")}</textarea>
              </div>
              <button class="button danger" type="button" data-remove-example>删除</button>
            </div>`).join("")}
        </div>
        <button class="button" type="button" data-add-example>添加示范样例</button>
      </div>
      <div class="form-field">
        <span>师父（碳基员工）</span>
        <select id="factoryMentor">
          <option value="">不选择师父</option>
          ${carbonEmployees.map((e) => `<option value="${escapeHtml(e.id)}"${e.id === existing.mentorEmployeeId ? " selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}
        </select>
      </div>
      <div class="factory-actions">
        <button class="button" type="button" data-save-draft-step3>保存草稿</button>
        <button class="button primary" type="button" data-complete-draft>完成草稿</button>
      </div>
    </div>
  `;

  function addSop() {
    const listEl = document.getElementById("factorySopList");
    if (!listEl) return;
    const div = document.createElement("div");
    div.className = "factory-list-item";
    div.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
        <input placeholder="SOP 标题" data-sop-title />
        <textarea placeholder="步骤（每行一步）" data-sop-steps></textarea>
      </div>
      <button class="button danger" type="button" data-remove-sop>删除</button>
    `;
    div.querySelector("[data-remove-sop]").addEventListener("click", () => div.remove());
    listEl.appendChild(div);
  }
  function addExample() {
    const listEl = document.getElementById("factoryExampleList");
    if (!listEl) return;
    const div = document.createElement("div");
    div.className = "factory-list-item";
    div.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
        <input placeholder="样例标题" data-example-title />
        <input placeholder="输入描述" data-example-input />
        <input placeholder="输出描述" data-example-output />
        <textarea placeholder="备注" data-example-notes></textarea>
      </div>
      <button class="button danger" type="button" data-remove-example>删除</button>
    `;
    div.querySelector("[data-remove-example]").addEventListener("click", () => div.remove());
    listEl.appendChild(div);
  }
  panel.querySelector("[data-add-sop]").addEventListener("click", addSop);
  panel.querySelector("[data-add-example]").addEventListener("click", addExample);
  panel.addEventListener("click", (event) => {
    const sopBtn = event.target.closest("[data-remove-sop]");
    const exBtn = event.target.closest("[data-remove-example]");
    if (sopBtn) sopBtn.closest(".factory-list-item").remove();
    if (exBtn) exBtn.closest(".factory-list-item").remove();
  });

  function collectStep3Data() {
    const sops = [];
    document.querySelectorAll("#factorySopList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-sop-title]")?.value?.trim() || "";
      const stepsText = item.querySelector("[data-sop-steps]")?.value || "";
      const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
      if (title || steps.length > 0) sops.push({ title, steps });
    });
    const examples = [];
    document.querySelectorAll("#factoryExampleList .factory-list-item").forEach((item) => {
      const title = item.querySelector("[data-example-title]")?.value?.trim() || "";
      const inputDesc = item.querySelector("[data-example-input]")?.value?.trim() || "";
      const outputDesc = item.querySelector("[data-example-output]")?.value?.trim() || "";
      const notes = item.querySelector("[data-example-notes]")?.value?.trim() || "";
      if (title || inputDesc || outputDesc) examples.push({ title, inputDesc, outputDesc, notes });
    });
    const mentorEmployeeId = document.getElementById("factoryMentor")?.value || null;
    return {
      mentorship: { sops, examples, mentorEmployeeId, completedAt: null },
    };
  }

  panel.querySelector("[data-save-draft-step3]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep3Data();
      try {
        await api.updateEmployee(employee.id, { digitalEmployeeDraft: { mentorship: data.mentorship } });
        await loadOrgData();
        showToast("草稿已保存");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  panel.querySelector("[data-complete-draft]").addEventListener("click", () => {
    run(async () => {
      const data = collectStep3Data();
      try {
        await api.updateEmployee(employee.id, {
          digitalEmployeeDraft: { status: "draft_complete", mentorship: { ...data.mentorship, completedAt: new Date().toISOString() } },
        });
        await loadOrgData();
        state.factoryEmployeeId = null;
        renderOrganizationPage();
        showToast("草稿已完成！等待后续分配工具。");
      } catch (error) { showToast(error.message, "error"); }
    });
  });
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
  const approvedWorkspaces = state.workspace?.bridge?.allowedWorkspaces || [];
  const tools = state.workspace?.localTools || [];
  const backups = state.backups || [];
  const projectSettings = state.project
    ? `
      <form class="manage-card settings-grid" data-settings-form>
        <label class="form-field"><span>项目名称</span><input name="title" value="${escapeHtml(state.project.title)}" required /></label>
        <label class="form-field"><span>所属团队</span><input name="team" value="${escapeHtml(state.project.team)}" /></label>
        <label class="form-field full"><span>状态说明</span><input name="subtitle" value="${escapeHtml(state.project.subtitle)}" /></label>
        <label class="form-field full"><span>本轮目标</span><textarea name="goal" rows="3">${escapeHtml(state.project.goal)}</textarea></label>
        <label class="form-field"><span>验收时间</span><input name="dueLabel" value="${escapeHtml(state.project.dueLabel)}" /></label>
        <div class="form-actions full"><button class="button primary" type="submit">保存项目设置</button></div>
      </form>
    `
    : `
      <section class="page-section">
        <div class="section-head"><h3>项目设置</h3><span class="section-hint">等待项目创建</span></div>
        <p class="empty-copy">创建第一个项目后，这里会显示项目名称、目标、验收时间等配置。</p>
      </section>
    `;
  const dangerZone = state.project
    ? `
      <section class="page-section danger-zone">
        <div><h3>删除项目</h3><p>删除后会同时移除项目消息、资料和执行历史入口。</p></div>
        <button class="button danger" type="button" data-delete-project>删除当前项目</button>
      </section>
    `
    : "";
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Rules & Permissions</div>
        <h2>规则与权限</h2>
        <p>调整外观、维护项目资料、检查本地工具，并收回不再使用的目录授权。</p>
      </div>
    </div>
    <section class="page-section">
      <div class="section-head"><h3>外观</h3><span class="section-hint">选择界面风格</span></div>
      <div class="appearance-grid">
        ${designThemes
          .map(
            (theme) => `
              <button class="appearance-option ${document.body.dataset.designTheme === theme.id ? "active" : ""}" type="button" data-appearance-theme="${escapeHtml(theme.id)}" style="--swatch:${escapeHtml(theme.swatch)}">
                <span class="appearance-swatch"></span>
                <span class="appearance-copy">
                  <strong>${escapeHtml(theme.name)}</strong>
                  <span>${escapeHtml(theme.copy)}</span>
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    </section>
    ${projectSettings}
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
    ${dangerZone}
  `;
}

function renderActiveTab() {
  const isOverview = state.activeTab === "overview";
  overviewPanel.style.display = isOverview ? "block" : "none";
  emptyPanel.style.display = isOverview ? "none" : "block";
  if (isOverview) return;
  if (state.activeTab === "topics") {
    renderTopicsPage();
    return;
  }
  if (state.activeTab === "workflow") {
    renderWorkflowHomePage();
    return;
  }
  if (state.activeTab === "organization") {
    renderOrganizationPage();
    return;
  }
  if (state.activeTab === "settings") {
    renderSettingsPage();
    return;
  }
  if (!state.project) return;
  if (state.activeTab === "messages") renderMessagesPage();
  if (state.activeTab === "assets") renderAssetsPage();
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
  renderOperatingSystemArchitecture();
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

function renderStaticDesignPreview() {
  const now = new Date().toISOString();
  state.workspace = {
    projects: [
      {
        id: "static-digital-employee-preview",
        title: "数字员工生成预览",
        subtitle: "组织模块 · 六步生成数字员工",
        team: "组织设计团队",
        unread: 0,
      },
    ],
    agents: [
      {
        id: "chief-of-staff",
        name: "企业总管",
        alias: "总管",
        status: "online",
        capabilities: ["coordination", "workflow", "governance"],
        employee: { employmentType: "hybrid", skills: ["组织设计", "流程治理", "验收管理"] },
        architecture: { adapterId: "alice", runtimeScope: "local" },
      },
      {
        id: "digital-employee-trainee",
        name: "数字员工候选人",
        alias: "候选",
        status: "online",
        capabilities: ["knowledge", "workflow", "tools"],
        employee: { employmentType: "silicon", skills: ["岗位匹配", "入职培训", "工具调用"] },
        architecture: { adapterId: "codex-cli", runtimeScope: "local" },
      },
      {
        id: "human-mentor",
        name: "师父带教",
        alias: "师父",
        status: "online",
        capabilities: ["sop", "review", "coaching"],
        employee: { employmentType: "carbon", skills: ["SOP 沉淀", "人工验收", "风险判断"] },
        architecture: { adapterId: "manual", runtimeScope: "human" },
      },
    ],
    localTools: [],
    technicalAdapters: [
      {
        id: "alice",
        name: "Alice",
        provider: "Alice",
        scope: "local",
        connectorType: "MCP",
        connectionStatus: "connected",
        capabilities: ["coordination", "memory", "receipt-sync"],
      },
      {
        id: "codex-cli",
        name: "Codex CLI",
        provider: "OpenAI",
        scope: "local",
        connectorType: "CLI",
        connectionStatus: "connected",
        capabilities: ["code", "terminal", "repo-analysis"],
      },
    ],
    bridge: { allowedWorkspaces: [] },
  };
  state.project = {
    id: "static-digital-employee-preview",
    title: "数字员工生成预览",
    subtitle: "静态设计预览 · 启动本地客户端后将读取真实项目数据",
    goal: "展示组织模块右侧整栏的六步数字员工生成工厂：点击上方 Tab，下方配置区同步切换。",
    dueLabel: "静态预览",
    team: "组织设计团队",
    stages: [
      {
        id: "role-match-preview",
        key: "role-match",
        title: "岗位匹配",
        description: "配置目标技能，明确岗位职责、Skill 等级和验收标准。",
        ownerId: "chief-of-staff",
        ownerName: "组织管理员",
        ownerType: "cloud",
        status: "in_progress",
        progress: 35,
        attempt: 1,
        deliverableIds: [],
      },
      {
        id: "onboarding-preview",
        key: "onboarding",
        title: "入职培训",
        description: "绑定知识库、业务语料和行业规则。",
        ownerId: "digital-employee-trainee",
        ownerName: "数字员工候选人",
        ownerType: "local",
        status: "waiting",
        progress: 0,
        attempt: 1,
        deliverableIds: [],
      },
    ],
    messages: [
      {
        id: "static-message",
        authorId: "system",
        authorName: "Nomos",
        authorType: "system",
        text: "当前为静态设计预览：用于查看首页信息架构与数字员工生成 Tab 交互。",
        createdAt: now,
      },
    ],
    checkpoints: [],
    assets: [],
    handoffs: [],
    taskReceipts: [],
    workflowTasks: [],
  };
  state.executions = [];
  state.agentRoute = null;
  state.selectedStageId = state.project.stages[0].id;
  renderProject();
  showToast("静态设计预览：启动本地客户端后将读取真实数据");
}

async function bootWorkspace() {
  try {
    await loadWorkspace();
  } catch (error) {
    const isStaticPreviewContext =
      window.location.protocol === "file:" ||
      /failed to fetch|unexpected token|not found|404/i.test(error.message || "");
    if (isStaticPreviewContext) {
      console.warn("Falling back to static design preview.", error);
      renderStaticDesignPreview();
      return;
    }
    throw error;
  }
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
    showToast("\u5458\u5de5\u522b\u540d\u548c\u672c\u5730\u914d\u5bf9\u4fe1\u606f\u5df2\u4fdd\u5b58");
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
  const projectTabName = tabName === "topics" ? "messages" : tabName;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === projectTabName));
  document.querySelectorAll("[data-rail-action]").forEach((button) => {
    button.classList.toggle("active", button.dataset.railAction === tabName);
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

osArchitecture.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-digital-step]");
  if (!tab) return;
  state.digitalEmployeeStep = Number(tab.dataset.digitalStep || 0);
  renderOperatingSystemArchitecture();
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
    const templatesRes = await api.flowTemplates();
    const templates = templatesRes.data || [];
    const templateOptions = [{ value: "", label: "不绑定流程模板（使用默认五阶段）" }];
    for (const t of templates) {
      templateOptions.push({ value: t.id, label: `${t.name}（${t.stages?.length || 0} 阶段）` });
    }
    const values = await openActionModal({
      title: "创建新项目",
      description: "先写清楚目标，选择流程模板后 nomos 会按模板阶段运行。",
      fields: [
        { name: "title", label: "项目名称", placeholder: "例如：个人官网首版" },
        { name: "goal", label: "本轮目标", type: "textarea", placeholder: "说明希望 Agent 团队交付的结果" },
        { name: "templateId", label: "流程模板", type: "select", options: templateOptions, required: false },
      ],
      confirmLabel: "创建项目",
    });
    if (!values) return;
    const payload = { title: values.title, goal: values.goal };
    if (values.templateId) payload.templateId = values.templateId;
    const project = await api.createProject(payload);
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
      if (!state.project) return;
      await api.updateProject(state.project.id, payload);
      await loadWorkspace(state.project.id);
      showToast("项目设置已经保存");
    }
  });
});

emptyPanel.addEventListener("click", (event) => {
  const appearanceButton = event.target.closest("[data-appearance-theme]");
  if (appearanceButton) {
    applyDesignTheme(appearanceButton.dataset.appearanceTheme);
    showToast("界面风格已更新");
    return;
  }

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
      await loadWorkspace(state.project?.id);
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
      await loadWorkspace(state.project?.id);
    showToast("\u5458\u5de5\u522b\u540d\u548c\u672c\u5730\u914d\u5bf9\u4fe1\u606f\u5df2\u4fdd\u5b58");
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
      await loadWorkspace(state.project?.id);
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
  const agents = bridge.agents || [];
  const adapters = bridge.technicalAdapters || [];
  const onlineEmployees = agents.filter((agent) => agent.status === "online").length;
  const readyAdapters = adapters.filter((adapter) => ["connected", "configured"].includes(adapter.connectionStatus)).length;
  container.innerHTML = `
    <div class="modal-note">
      <span><i class="status-dot"></i>${onlineEmployees} / ${agents.length} \u4f4d\u78b3\u7845\u5458\u5de5\u53ef\u7528 ? ${readyAdapters} / ${adapters.length} \u4e2a\u6280\u672f\u67b6\u6784\u5df2\u63a5\u5165</span>
      <button class="button" type="button" data-refresh-bridge>\u91cd\u65b0\u68c0\u6d4b</button>
    </div>
    <div class="modal-split">
      <section>
        <div class="section-label">\u5458\u5de5\u8eab\u4efd</div>
        ${agents.map((agent) => `
          <div class="detected-agent">
            <span class="check ${agent.status === "online" ? "" : "pending-check"}">${agent.status === "online" ? "&check;" : "?"}</span>
            <span class="connection-icon ${agent.architecture?.runtimeScope === "local" ? "blue" : ""}">${iconFor(agent.alias || agent.name)}</span>
            <span class="connection-copy">
              <span class="connection-name">${escapeHtml(agent.name)} <small>${escapeHtml(employeeTypeLabel(agent))}</small></span>
              <span class="connection-desc">${escapeHtml(agent.employee?.department || "\u672a\u5206\u7ec4")} ? ${escapeHtml(agent.employee?.title || agent.role || "")}</span>
              <span class="connection-desc">${escapeHtml(agent.architecture?.provider || "-")} / ${escapeHtml(agent.architecture?.model || "-")} ? ${escapeHtml(agent.connection?.statusLabel || "\u5f85\u63a5\u5165")}</span>
            </span>
            <input data-alias-agent="${escapeHtml(agent.id)}" value="${escapeHtml(agent.alias || "")}" aria-label="${escapeHtml(agent.name)} alias" />
          </div>
        `).join("")}
      </section>
      <section>
        <div class="section-label">\u5e95\u5c42\u6280\u672f\u67b6\u6784</div>
        ${adapters.map((adapter) => `
          <div class="detected-agent">
            <span class="check ${["connected", "configured"].includes(adapter.connectionStatus) ? "" : "pending-check"}">${["connected", "configured"].includes(adapter.connectionStatus) ? "&check;" : "?"}</span>
            <span class="connection-icon ${adapter.scope === "local" ? "blue" : ""}">${iconFor(adapter.name)}</span>
            <span class="connection-copy">
              <span class="connection-name">${escapeHtml(adapter.name)} <small>${escapeHtml(adapter.scope === "local" ? "\u672c\u673a" : "\u4e91\u7aef")}</small></span>
              <span class="connection-desc">${escapeHtml(adapter.provider)} ? ${escapeHtml(adapter.connectorType)} ? ${escapeHtml(adapterStatusLabel(adapter))}</span>
              <span class="connection-desc">${escapeHtml(adapter.detail || "")}</span>
              ${adapter.id === "openclaw" && adapter.connectionStatus !== "connected" ? '<button class="bridge-inline-action" type="button" data-start-openclaw>\u521d\u59cb\u5316\u5e76\u542f\u52a8\u7f51\u5173</button>' : ""}
              ${adapter.scope === "cloud" ? `<button class="bridge-inline-action" type="button" data-configure-cloud-adapter="${escapeHtml(adapter.id)}" data-adapter-name="${escapeHtml(adapter.name)}" data-endpoint="${escapeHtml(adapter.config?.endpoint || "")}" data-workspace="${escapeHtml(adapter.config?.workspace || "")}">\u914d\u7f6e\u4e91\u7aef\u63a5\u5165</button>` : ""}
            </span>
          </div>
        `).join("")}
      </section>
    </div>
  `;
  document.getElementById("confirmBridge").textContent = `\u4fdd\u5b58 ${agents.length} \u4f4d\u5458\u5de5`;
}
document.querySelector(".modal-content").addEventListener("click", (event) => {
  const refreshButton = event.target.closest("[data-refresh-bridge]");
  const startOpenClawButton = event.target.closest("[data-start-openclaw]");
  const configureCloudButton = event.target.closest("[data-configure-cloud-adapter]");
  if (!refreshButton && !startOpenClawButton && !configureCloudButton) return;
  run(async () => {
    if (configureCloudButton) {
      const values = await openActionModal({
        title: "\u914d\u7f6e\u4e91\u7aef\u667a\u80fd\u4f53",
        description: configureCloudButton.dataset.adapterName || configureCloudButton.dataset.configureCloudAdapter,
        fields: [
          { name: "endpoint", label: "API Endpoint", value: configureCloudButton.dataset.endpoint || "", required: false },
          { name: "workspace", label: "Workspace / Bot ID", value: configureCloudButton.dataset.workspace || "", required: false },
          { name: "tokenConfigured", label: "Token status", value: "configured", required: false },
        ],
        confirmLabel: "\u4fdd\u5b58\u63a5\u5165",
      });
      if (!values) return;
      await api.configureCloudAdapter(configureCloudButton.dataset.configureCloudAdapter, {
        endpoint: values.endpoint,
        workspace: values.workspace,
        tokenConfigured: Boolean(String(values.tokenConfigured || "").trim()),
      });
      await renderBridge(await api.refreshBridge());
    } else if (startOpenClawButton) {
      if (!(await askConfirm(
        "OpenClaw Agent \u53ef\u80fd\u83b7\u5f97\u8f83\u9ad8\u7cfb\u7edf\u6743\u9650\u3002\n\nnomos \u4ec5\u7ed1\u5b9a 127.0.0.1\uff0c\u4f7f\u7528\u968f\u673a\u4ee4\u724c\uff0c\u4e0d\u5b89\u88c5\u5f00\u673a\u5e38\u9a7b\u670d\u52a1\u3002",
        { title: "\u542f\u52a8 OpenClaw \u7f51\u5173", danger: true, confirmLabel: "\u63a5\u53d7\u98ce\u9669\u5e76\u542f\u52a8" },
      ))) return;
      const result = await api.startOpenClawGateway(true);
      await renderBridge(result.bridge);
    } else {
      await renderBridge(await api.refreshBridge());
    }
    await loadWorkspace(state.project?.id);
    showToast("\u667a\u80fd\u5458\u5de5\u548c\u6280\u672f\u67b6\u6784\u72b6\u6001\u5df2\u5237\u65b0");
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
    showToast("\u5458\u5de5\u522b\u540d\u548c\u672c\u5730\u914d\u5bf9\u4fe1\u606f\u5df2\u4fdd\u5b58");
  });
});

run(() => bootWorkspace());
