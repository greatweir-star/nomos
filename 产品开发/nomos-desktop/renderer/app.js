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
  flows(params = "") {
    return this.request(`/api/flows${params ? "?" + params : ""}`);
  },
  flow(id) {
    return this.request(`/api/flows/${id}`);
  },
  createFlow(payload) {
    return this.request("/api/flows", { method: "POST", body: JSON.stringify(payload) });
  },
  updateFlow(id, payload) {
    return this.request(`/api/flows/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteFlow(id) {
    return this.request(`/api/flows/${id}`, { method: "DELETE" });
  },
  initFlowPresets() {
    return this.request("/api/flows/init-presets", { method: "POST" });
  },
  bindProjectFlow(projectId, flowTemplateId) {
    return this.request(`/api/projects/${projectId}/flow`, {
      method: "POST",
      body: JSON.stringify({ flowTemplateId }),
    });
  },
  unbindProjectFlow(projectId) {
    return this.request(`/api/projects/${projectId}/flow`, { method: "DELETE" });
  },
  projectFlowProgress(projectId) {
    return this.request(`/api/projects/${projectId}/flow/progress`);
  },
  reviewGate(projectId, flowStageId, payload) {
    return this.request(`/api/projects/${projectId}/flow/stages/${flowStageId}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Work item and dashboard API
  workItems(params = "") {
    return this.request(`/api/work-items${params ? "?" + params : ""}`);
  },
  createWorkItem(payload) {
    return this.request("/api/work-items", { method: "POST", body: JSON.stringify(payload) });
  },
  updateWorkItem(id, payload) {
    return this.request(`/api/work-items/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  cancelWorkItem(id) {
    return this.request(`/api/work-items/${id}/cancel`, { method: "POST" });
  },
  workItemAgentRoute(id, agentId = "") {
    return this.request(`/api/work-items/${id}/agent-route?agentId=${encodeURIComponent(agentId)}`);
  },
  previewWorkItemDispatch(id, payload) {
    return this.request(`/api/work-items/${id}/dispatch/preview`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  syncLegacyWorkItems(projectId = "") {
    return this.request("/api/work-items/sync-legacy", {
      method: "POST",
      body: JSON.stringify(projectId ? { projectId } : {}),
    });
  },
  progressDashboard(params = "") {
    return this.request(`/api/dashboards/progress${params ? "?" + params : ""}`);
  },
  resourceDashboard(params = "") {
    return this.request(`/api/dashboards/resources${params ? "?" + params : ""}`);
  },
};

const state = {
  workspace: null,
  project: null,
  selectedStageId: null,
  executions: [],
  activeTab: "dashboard",
  audit: [],
  agentRoute: null,
  backups: [],
  projectSearch: "",
  digitalEmployeeStep: 0,
  orgData: null,
  orgSubPage: "overview",
  orgSearch: "",
  orgTypeFilter: "all",
  selectedOrgPersonId: null,
  editingSkill: null,
  editingRole: null,
  editingEmployee: null,
  factoryEmployeeId: null,
  factoryStep: 0,
  flowData: null,
  flowSubPage: "canvas",
  selectedFlowId: null,
  selectedFlowNodeKey: null,
  workbenchData: null,
  workbenchSubPage: "items",
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

const designThemeNames = new Set(["apple", "slate", "golden", "garden", "nocturne", "bluepond", "dream", "rose", "custom"]);
const designThemeVersion = "appearance-palette-v2";
const designThemes = [
  { id: "apple", name: "银白", swatch: "#f5f5f7", copy: "Apple 式玻璃质感，干净、安静、聚焦" },
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
  const nextTheme = designThemeNames.has(themeName) ? themeName : "apple";
  document.body.dataset.designTheme = nextTheme;
  localStorage.setItem("nomos.designTheme", nextTheme);
  document.querySelectorAll("[data-appearance-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.designTheme === nextTheme);
  });
}

if (localStorage.getItem("nomos.designThemeVersion") !== designThemeVersion) {
  localStorage.setItem("nomos.designThemeVersion", designThemeVersion);
  applyDesignTheme("apple");
} else {
  applyDesignTheme(localStorage.getItem("nomos.designTheme") || document.body.dataset.designTheme || "apple");
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
  return `${title} · ${scope}/${provider} · ${status}`;
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

function consoleSurfaceActive(tab = state.activeTab) {
  return ["dashboard", "organization", "workflow", "flow"].includes(tab);
}

function scoreFromText(value, min = 32, max = 76) {
  const text = String(value || "nomos");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 9973;
  }
  return min + (hash % (max - min + 1));
}

function workloadForPerson(person) {
  return scoreFromText(`${person.name}-${person.title}`, person.type === "carbon" ? 48 : 33, person.type === "carbon" ? 74 : 72);
}

function onlineForPerson(person) {
  return ["connected", "configured", "active", "online", "manual"].includes(person.connectionStatus) || person.status === "active";
}

function currentFlowForPerson(person, index = 0) {
  const flows = ["年度战略规划", "Q3 产品路线图", "架构评审与优化", "PR 自动化实现", "代码库分析", "竞品研究报告", "设计系统迭代", "单测生成与校验", "用户行为分析", "订单服务优化", "回归测试"];
  return flows[index % flows.length] || person.title || "流程协作";
}

function lastReceiptForPerson(person, index = 0) {
  const times = ["2 分钟前", "5 分钟前", "8 分钟前", "3 分钟前", "1 分钟前", "4 分钟前", "6 分钟前", "10 分钟前", "7 分钟前", "20 分钟前", "9 分钟前"];
  return onlineForPerson(person) ? times[index % times.length] : "离开";
}

function surfaceModeForTab(tab = state.activeTab) {
  if (tab === "dashboard") return "dashboard";
  if (tab === "organization") return "organization";
  if (tab === "workflow" || tab === "flow") return "workflow";
  return "project";
}

function renderWorkspace() {
  const labels = document.querySelectorAll(".workspace .section-label");
  const workspaceTitle = document.querySelector(".workspace-name");
  const workspaceEyebrow = document.querySelector(".workspace .eyebrow");
  const workspaceBottom = document.querySelector(".workspace-bottom");
  const mode = surfaceModeForTab();
  document.querySelector(".workspace").dataset.sidebarMode = mode;
  projectList.style.display = "";
  agentList.style.display = "";
  projectSearch.style.display = "";
  labels.forEach((label) => {
    label.style.display = "";
    label.textContent = "";
  });
  newProjectButton.style.display = "";
  newProjectButton.textContent = "+";

  if (mode === "dashboard") {
    const items = state.workbenchData?.items || [];
    const pendingDispatch = items.filter((item) => !["done", "cancelled"].includes(item.status)).length || 12;
    const reviewCount = items.filter((item) => ["review_pending", "blocked"].includes(item.status)).length || 7;
    workspaceEyebrow.textContent = "Nomos";
    workspaceTitle.textContent = "碳硅组织";
    newProjectButton.textContent = "‹";
    projectSearch.style.display = "none";
    labels[0].style.display = "none";
    projectList.innerHTML = `
      <button class="side-command active" type="button" data-sidebar-tab="dashboard">今日任务</button>
      <button class="side-command" type="button" data-sidebar-tab="organization">组织通讯录</button>
      <button class="side-command" type="button" data-sidebar-tab="workflow">工作流编排</button>
      <button class="side-command with-count" type="button" data-sidebar-tab="workbench"><span>派发队列</span><b>${pendingDispatch}</b></button>
      <button class="side-command with-count" type="button" data-sidebar-tab="workbench"><span>回执验收</span><b>${reviewCount}</b></button>
    `;
    labels[1].style.display = "none";
    agentList.style.display = "none";
    workspaceBottom.innerHTML = `
      <div class="side-health">
        <div><strong>系统状态</strong><span><i class="status-dot"></i>全部系统运行正常</span></div>
        <hr />
        ${["Llama Adapter", "Claude Adapter", "Codex Adapter", "Vector Store", "Workflow Engine"].map((name) => `
          <p><span>${name}</span><b><i class="status-dot"></i>正常</b></p>
        `).join("")}
      </div>
    `;
    return;
  }

  if (mode === "organization") {
    const people = buildPeopleDirectory();
    const carbon = people.filter((person) => person.type === "carbon").length;
    const silicon = people.filter((person) => person.type === "silicon").length;
    const hybrid = people.filter((person) => person.type === "hybrid").length;
    const totalWorkload = Math.round(people.reduce((sum, person) => sum + workloadForPerson(person), 0) / Math.max(people.length, 1));
    workspaceEyebrow.textContent = "Workspace";
    workspaceTitle.textContent = "Nomos";
    projectSearch.placeholder = "搜索组织或人员";
    projectSearch.value = state.orgSearch || "";
    labels[0].textContent = "组织架构";
    projectList.innerHTML = `
      <div class="org-tree">
        <button class="tree-line active" type="button" data-sidebar-filter="all"><span>Nomos 企业大脑</span><b>${people.length}</b></button>
        <button class="tree-line" type="button" data-sidebar-filter="carbon"><span>高管层</span><b>${carbon}</b></button>
        <button class="tree-line expanded" type="button" data-sidebar-filter="all"><span>产品与设计</span><b>${Math.max(6, hybrid + 2)}</b></button>
        <div class="tree-children">
          <button type="button" data-sidebar-filter="carbon">产品管理 <b>3</b></button>
          <button type="button" data-sidebar-filter="hybrid">设计 <b>${Math.max(3, hybrid)}</b></button>
        </div>
        <button class="tree-line expanded" type="button" data-sidebar-filter="silicon"><span>工程研发</span><b>${Math.max(9, silicon)}</b></button>
        <div class="tree-children">
          <button type="button" data-sidebar-filter="silicon">后端 <b>4</b></button>
          <button type="button" data-sidebar-filter="silicon">前端 <b>3</b></button>
          <button type="button" data-sidebar-filter="silicon">平台与工具 <b>2</b></button>
        </div>
        <button class="tree-line" type="button" data-sidebar-filter="silicon"><span>测试质量</span><b>4</b></button>
        <button class="tree-line" type="button" data-sidebar-filter="hybrid"><span>运维与平台</span><b>3</b></button>
      </div>
    `;
    labels[1].style.display = "none";
    agentList.style.display = "none";
    workspaceBottom.innerHTML = `
      <div class="side-health workload-card">
        <div><strong>适配器与负载</strong><span><i class="status-dot"></i>全部正常</span></div>
        <hr />
        <p><span>总适配器</span><b>${people.length}</b></p>
        <p><span>在线</span><b>${people.filter(onlineForPerson).length}</b></p>
        <p><span>异常</span><b class="danger">0</b></p>
        <hr />
        ${[
          ["碳基", carbon ? Math.round(totalWorkload + 7) : 0],
          ["硅基", silicon ? Math.round(totalWorkload - 7) : 0],
          ["总体", totalWorkload],
        ].map(([label, value]) => `
          <div class="side-meter"><span>${label}</span><b>${value}%</b><i style="width:${value}%"></i></div>
        `).join("")}
      </div>
    `;
    return;
  }

  if (mode === "workflow") {
    const templates = state.flowData?.templates || [];
    const selectedTemplate = selectedOrchestrationTemplate();
    workspaceEyebrow.textContent = "Nomos";
    workspaceTitle.textContent = "流程模板";
    projectSearch.placeholder = "搜索流程模板";
    projectSearch.value = state.projectSearch || "";
    labels[0].style.display = "none";
    projectList.innerHTML = `
      <button class="button side-create" type="button" data-sidebar-flow-create>+ 新建模板</button>
      <div class="side-segment">
        <button class="active" type="button">全部模板</button>
        <button type="button">最近使用</button>
      </div>
      <div class="flow-template-stack">
        ${
          templates.length
            ? templates.map((template, index) => `
                <button class="flow-template-card ${selectedTemplate?.id === template.id || (!state.selectedFlowId && index === 0) ? "active" : ""}" type="button" data-sidebar-template="${escapeHtml(template.id)}">
                  <strong>${escapeHtml(template.name)}</strong>
                  <span>${escapeHtml(template.description || "从需求到交付的端到端流程")}</span>
                  <small>v${index + 1}.${template.stageCount ?? template.stages.length} · 2024-05-${String(20 - index * 5).padStart(2, "0")} · ${index === 0 ? "Alice" : index === 1 ? "Bob" : "Carol"}</small>
                </button>
              `).join("")
            : [
                ["产品研发流", "从需求到发布的端到端研发流程", "v2.3 · 2024-05-20 · Alice"],
                ["客户交付流", "从商机到交付验收的标准流程", "v1.8 · 2024-05-15 · Bob"],
                ["运营支持流", "日常运营与支持请求处理流程", "v1.6 · 2024-05-10 · Carol"],
                ["投融资流程", "投融资项目全生命周期管理流程", "v1.2 · 2024-04-28 · David"],
              ].map(([name, desc, meta], index) => `
                <button class="flow-template-card ${index === 0 ? "active" : ""}" type="button" data-sidebar-flow-presets>
                  <strong>${name}</strong>
                  <span>${desc}</span>
                  <small>${meta}</small>
                </button>
              `).join("")
        }
      </div>
    `;
    labels[1].style.display = "none";
    agentList.style.display = "none";
    workspaceBottom.innerHTML = `
      <div class="side-health">
        <div><strong>流程健康</strong><span><i class="status-dot"></i>已保存</span></div>
        <hr />
        <p><span>模板</span><b>${templates.length}</b></p>
        <p><span>人工确认点</span><b>${selectedTemplate?.stages?.length ? Math.max(2, Math.round(selectedTemplate.stages.length / 3)) : 2}</b></p>
        <button class="button" type="button" data-sidebar-flow-presets>${templates.length ? "补充预设" : "导入预设模板"}</button>
      </div>
    `;
    return;
  }

  const query = state.projectSearch.trim().toLowerCase();
  const projects = state.workspace.projects.filter((project) =>
    [project.title, project.team, project.subtitle].some((value) => String(value || "").toLowerCase().includes(query)),
  );
  workspaceEyebrow.textContent = "Workspace";
  workspaceTitle.textContent = "Nomos 企业大脑";
  projectSearch.placeholder = "搜索项目";
  projectSearch.value = state.projectSearch || "";
  labels[0].textContent = "进行中的项目";
  labels[1].textContent = "碳硅员工";
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
            <span class="project-copy">${escapeHtml(employeeTypeLabel(agent))}\u5458\u5de5 · ${escapeHtml(agentRole(agent))}</span>
          </span>
          <span class="${agent.status === "online" ? "online" : "pending"}"></span>
        </article>
      `,
    )
    .join("");

  const adapters = state.workspace.technicalAdapters || state.workspace.localTools || [];
  const availableAdapters = adapters.filter((adapter) => ["connected", "configured"].includes(adapter.connectionStatus));
  workspaceBottom.innerHTML = `
    <div class="local-status">
      <div class="local-status-head">
        <span><i class="status-dot"></i>架构接入态</span>
        <span>${availableAdapters.length} / ${adapters.length}</span>
      </div>
      <div class="local-row">
        <span>员工与技术架构</span>
        <button class="button" id="openBridge">管理</button>
      </div>
    </div>
  `;
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
  if (!document.getElementById("taskTitle")) {
    document.querySelector(".inspector-head h2").textContent = "执行详情";
    document.querySelector(".inspector-body").innerHTML = `
      <section class="inspector-section">
        <div class="inspector-label">当前任务</div>
        <article class="active-task">
          <h3 id="taskTitle">等待选择阶段</h3>
          <p id="taskDesc">点击交付链路中的阶段查看详情。</p>
          <div class="progress"><div class="progress-bar" id="taskProgress"></div></div>
          <div class="task-meta">
            <span id="taskOwner">暂无执行任务</span>
            <span id="taskPercent">0%</span>
          </div>
        </article>
      </section>
      <section class="inspector-section">
        <div class="inspector-label">碳硅员工</div>
        <div class="connection-list">
          <p class="empty-copy">正在检测本地 Agent...</p>
        </div>
      </section>
      <section class="inspector-section">
        <div class="inspector-label">项目资料</div>
        <div class="file-list">
          <p class="empty-copy">当前项目暂无资料。</p>
        </div>
      </section>
    `;
  }
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

  const inspectorAgentsEl = document.querySelector(".inspector .connection-list");
  const assetListEl = document.querySelector(".inspector .file-list");
  inspectorAgentsEl.innerHTML = state.workspace.agents
    .map(
      (agent) => `
        <div class="connection-row">
          <span class="connection-icon ${agent.id === "claude-code" ? "blue" : ""}">${iconFor(agent.name.replaceAll(" ", ""))}</span>
          <span class="connection-copy">
            <span class="connection-name">${escapeHtml(agent.name)}</span>
            <span class="connection-desc">${escapeHtml(employeeTypeLabel(agent))}\u5458\u5de5 · ${escapeHtml(agentRole(agent))}</span>
          </span>
          <span class="${agent.status === "online" ? "online" : "pending"}"></span>
        </div>
      `,
    )
    .join("");

  assetListEl.innerHTML = state.project.assets.length
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

function flowTemplatesForOrchestration() {
  return state.flowData?.templates || [];
}

function selectedOrchestrationTemplate() {
  const templates = flowTemplatesForOrchestration();
  return templates.find((template) => template.id === state.selectedFlowId) || templates[0] || null;
}

function laneKeyForStage(stage, index) {
  const reviewMode = stage.gate?.reviewMode || stage.reviewMode;
  if (["carbon", "silicon", "hybrid"].includes(reviewMode)) return reviewMode;
  const key = `${stage.key || ""} ${stage.name || ""} ${stage.title || ""}`.toLowerCase();
  if (/develop|code|研发|开发|执行|实现/.test(key)) return "silicon";
  if (/test|deploy|review|验收|测试|发布|复核/.test(key)) return "hybrid";
  return index % 3 === 1 ? "silicon" : index % 3 === 2 ? "hybrid" : "carbon";
}

function orchestrationNodesFromTemplate(template, project = state.project) {
  if (template?.stages?.length) {
    return template.stages.map((stage, index) => ({
      id: stage.id,
      title: stage.name,
      description: stage.description || stage.gate?.exitCriteria || "定义输入、输出、责任岗位和验收口径。",
      lane: laneKeyForStage(stage, index),
      order: index,
      status: "template",
      owner: (stage.gate?.requiredRoles || []).join("、") || FLOW_REVIEW_LABELS[stage.gate?.reviewMode] || "流程负责人",
      inputs: stage.inputMaterials || [],
      outputs: stage.expectedOutputs || [],
      templateStage: stage,
    }));
  }
  const stages = project?.stages || [];
  return stages.map((stage, index) => ({
    id: stage.id,
    title: stage.title,
    description: stage.description,
    lane: laneKeyForStage(stage, index),
    order: index,
    status: stage.status,
    owner: stage.ownerName,
    inputs: [],
    outputs: stage.deliverableIds || [],
    projectStage: stage,
  }));
}

function renderOrchestrationSurface(container, options = {}) {
  const templates = flowTemplatesForOrchestration();
  const template = selectedOrchestrationTemplate();
  let nodes = orchestrationNodesFromTemplate(template);
  if (nodes.length < 6) {
    nodes = [
      { id: "flow-seed-01", title: "需求评审", owner: "产品负责人", lane: "carbon", order: 0, type: "碳基", description: "确认需求背景、目标和业务边界。", inputs: ["需求池", "目标"], outputs: ["评审结论"] },
      { id: "flow-seed-02", title: "范围确认", owner: "产品负责人", lane: "carbon", order: 1, type: "碳基", description: "确定本轮交付范围和人工确认点。", inputs: ["需求评审"], outputs: ["范围说明"] },
      { id: "flow-seed-03", title: "竞品调研", owner: "Kimi", lane: "silicon", order: 2, type: "硅基", description: "收集并分析竞品信息，输出竞品分析报告与机会点建议。", inputs: ["范围确认", "需求评审"], outputs: ["竞品报告", "机会点"] },
      { id: "flow-seed-04", title: "方案评审", owner: "Claude", lane: "silicon", order: 3, type: "硅基", description: "对方案可行性、风险和回执要求进行分析。", inputs: ["竞品报告"], outputs: ["评审意见"] },
      { id: "flow-seed-05", title: "方案实现", owner: "Codex", lane: "silicon", order: 4, type: "硅基", description: "执行代码、文档或自动化实现任务。", inputs: ["评审意见"], outputs: ["实现回执"] },
      { id: "flow-seed-06", title: "任务编排", owner: "Alice", lane: "silicon", order: 5, type: "硅基", description: "拆解后续任务、派发到合适员工并追踪回执。", inputs: ["实现回执"], outputs: ["派发计划"] },
      { id: "flow-seed-07", title: "验收测试", owner: "Claude", lane: "hybrid", order: 6, type: "硅基", description: "执行测试并生成验收证据。", inputs: ["实现回执"], outputs: ["测试报告"] },
      { id: "flow-seed-08", title: "上线评审", owner: "产品负责人", lane: "hybrid", order: 7, type: "混合", description: "碳基负责人确认上线风险和发布口径。", inputs: ["测试报告"], outputs: ["上线许可"] },
      { id: "flow-seed-09", title: "发布上线", owner: "Codex", lane: "hybrid", order: 8, type: "硅基", description: "执行发布动作并回传最终证据。", inputs: ["上线许可"], outputs: ["发布回执"] },
    ];
  }
  const selectedNode =
    nodes.find((node) => node.id === state.selectedFlowNodeKey) ||
    nodes.find((node) => node.title.includes("竞品")) ||
    nodes[2] ||
    nodes[0] ||
    null;
  if (selectedNode) state.selectedFlowNodeKey = selectedNode.id;
  const lanes = [
    { key: "carbon", title: "碳基决策", pill: "碳基", desc: "由人类负责决策与策略方向" },
    { key: "silicon", title: "硅基执行", pill: "硅基", desc: "由智能体执行具体任务" },
    { key: "hybrid", title: "混合验收", pill: "混合", desc: "人机协同校验与验收" },
  ];
  const agents = state.workspace?.agents || [];
  const localAgents = agents.filter((agent) => agent.architecture?.runtimeScope === "local").slice(0, 5);
  const recommended =
    selectedNode?.lane === "silicon"
      ? localAgents.find((agent) => agent.id === "codex-cli") || localAgents[0]
      : selectedNode?.lane === "hybrid"
        ? localAgents.find((agent) => agent.id === "claude-code") || localAgents[0]
        : agents.find((agent) => agent.id === "alice") || agents[0];
  renderFlowInspector(selectedNode, template, recommended);
  container.innerHTML = `
    <section class="flow-designer">
      <div class="designer-toolbar">
        <button class="tool active" type="button">⌖</button>
        <button class="tool" type="button">☷</button>
        <button class="tool" type="button">▱</button>
        <button class="tool" type="button">◫</button>
        <span></span>
        <button class="tool" type="button">−</button>
        <b>100%</b>
        <button class="tool" type="button">＋</button>
        <button class="tool" type="button">⛶</button>
      </div>
      <div class="workflow-canvas-board">
        ${lanes.map((lane) => {
          const laneNodes = nodes.filter((node) => node.lane === lane.key);
          return `
            <section class="flow-lane-row ${lane.key}">
              <aside>
                <h3>${lane.title}</h3>
                <em class="${lane.key}">${lane.pill}</em>
                <p>${lane.desc}</p>
              </aside>
              <div class="lane-node-track">
                ${
                  laneNodes.map((node) => {
                    const nodeType = node.type || personTypeMeta(node.lane === "carbon" ? "carbon" : node.lane === "hybrid" ? "hybrid" : "silicon").label;
                    return `
                      <button class="graph-node ${state.selectedFlowNodeKey === node.id ? "active" : ""}" type="button" data-orchestration-node="${escapeHtml(node.id)}">
                        <strong>${String(node.order + 1).padStart(2, "0")} ${escapeHtml(node.title)}</strong>
                        <span>Owner&nbsp;&nbsp;${escapeHtml(node.owner || "未指定")}</span>
                        <em class="${node.lane}">${escapeHtml(nodeType)}</em>
                      </button>
                    `;
                  }).join("")
                }
              </div>
            </section>
          `;
        }).join("")}
      </div>
      <section class="validation-panel">
        <div class="validation-head">
          <strong>验证与检查</strong>
          <span><b>3</b> 策略告警</span>
          <span><b>1</b> 未连接节点</span>
          <span><b>2</b> 人工确认点</span>
          <button class="button" type="button">重新校验</button>
        </div>
        <div class="validation-line" aria-hidden="true">
          ${nodes.map((node, index) => `<i class="${index === 2 || index === 5 ? "warn" : index === 6 ? "muted" : ""}"></i>`).join("")}
        </div>
        <div class="validation-table">
          <p><span>策略告警</span><b>05 方案实现</b><em>该节点未设置回执要求，可能导致结果无法校验。</em><a>去处理</a></p>
          <p><span>未连接节点</span><b>流程末端</b><em>存在未连接的节点或孤立节点，可能影响流程执行。</em><a>查看</a></p>
          <p><span>人工确认点</span><b>02 范围确认</b><em>建议补充确认点说明，明确人工决策要点。</em><a>编辑</a></p>
        </div>
      </section>
    </section>
  `;
  container.querySelectorAll("[data-orchestration-node]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFlowNodeKey = button.dataset.orchestrationNode;
      renderOrchestrationSurface(container, options);
    });
  });
  container.querySelector("[data-orchestration-presets]")?.addEventListener("click", initFlowPresets);
  container.querySelector("[data-orchestration-bind]")?.addEventListener("click", (event) => {
    run(async () => {
      if (!state.project) return;
      await api.bindProjectFlow(state.project.id, event.target.dataset.orchestrationBind);
      await loadFlowData();
      await loadWorkspace(state.project.id);
      showToast("流程已绑定当前项目");
    });
  });
  container.querySelector("[data-orchestration-workitem]")?.addEventListener("click", openWorkItemCreateModal);
}

function renderFlowInspector(node, template, recommended) {
  document.querySelector(".inspector-head h2").textContent = node ? `${String((node.order || 0) + 1).padStart(2, "0")} ${node.title}` : "节点设置";
  document.querySelector(".inspector-body").innerHTML = node
    ? `
      <section class="flow-node-inspector">
        <div class="node-title-row">
          <div>
            <strong>${String((node.order || 0) + 1).padStart(2, "0")} ${escapeHtml(node.title)}</strong>
            <span class="type-pill ${node.lane === "carbon" ? "carbon" : node.lane === "hybrid" ? "hybrid" : "silicon"}">${node.lane === "carbon" ? "碳基" : node.lane === "hybrid" ? "混合" : "硅基"}</span>
          </div>
          <button class="icon-button" type="button">×</button>
        </div>
        <p>Owner <b>${escapeHtml(node.owner || recommended?.name || "未指定")}</b></p>
        <nav class="detail-tabs">
          <button class="active" type="button">节点设置</button>
          <button type="button">派发策略</button>
          <button type="button">回执要求</button>
          <button type="button">风险边界</button>
        </nav>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">基本信息</div>
        <label class="form-field"><span>节点名称</span><input value="${escapeHtml(node.title)}" readonly /></label>
        <label class="form-field"><span>节点描述</span><textarea readonly>${escapeHtml(node.description || "收集并分析信息，输出结构化报告与建议。")}</textarea></label>
        <label class="form-field"><span>Owner 类型</span><input value="${node.lane === "carbon" ? "碳基负责人" : node.lane === "hybrid" ? "混合验收" : "硅基智能体"}" readonly /></label>
        <label class="form-field"><span>执行智能体</span><input value="${escapeHtml(node.owner || recommended?.name || "Kimi")}" readonly /></label>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">所需技能</div>
        <div class="profile-tags">${(node.inputs?.length ? node.inputs : ["信息检索", "数据分析", "行业研究"]).slice(0, 4).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">准入条件</div>
        <ul class="node-rules">
          <li>范围确认 <b>已完成</b></li>
          <li>需求评审 <b>已通过</b></li>
        </ul>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">准出标准</div>
        <ul class="node-rules">
          <li>输出核心分析不少于 5 个</li>
          <li>形成 SWOT 分析</li>
          <li>输出机会点建议 ≥ 3 条</li>
        </ul>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">依赖关系</div>
        <div class="policy-grid">
          <span>前置节点</span><b>${escapeHtml((node.inputs || [])[0] || "范围确认")}</b>
          <span>后置节点</span><b>${escapeHtml((node.outputs || [])[0] || "方案评审")}</b>
          <span>模板</span><b>${escapeHtml(template?.name || "产品研发流")}</b>
        </div>
      </section>
    `
    : '<p class="empty-copy">选择一个流程节点查看设置。</p>';
}

function renderWorkflowHomePage() {
  if (!state.flowData) {
    emptyPanel.innerHTML = `<div class="page-head"><div><div class="eyebrow">Workflow</div><h2>工作流编排</h2><p>正在加载流程模板和项目实例...</p></div></div>`;
    run(async () => { await loadFlowData(); renderWorkspace(); renderWorkflowHomePage(); });
    return;
  }
  const template = selectedOrchestrationTemplate();
  emptyPanel.innerHTML = `
    <div class="console-topbar workflow-topbar">
      <div>
        <span class="breadcrumb">流程编排 /</span>
        <h2>${escapeHtml(template?.name || "产品研发流")}</h2>
      </div>
      <div class="topbar-status">
        <span>版本 <b>v2.3</b></span>
        <span><i class="status-dot"></i>已保存 10:42</span>
      </div>
      <div class="topbar-actions">
        <button class="button" type="button" data-orchestration-workitem>模拟运行</button>
        <button class="button primary" type="button" data-jump-tab="workbench">发布流程</button>
      </div>
    </div>
    <div id="workflowOrchestration"></div>
  `;
  const container = document.getElementById("workflowOrchestration");
  renderOrchestrationSurface(container, { source: "workflow" });
  emptyPanel.querySelector("[data-orchestration-workitem]")?.addEventListener("click", openWorkItemCreateModal);
  emptyPanel.querySelectorAll("[data-jump-tab]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.jumpTab));
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

function roleNamesForIds(roleIds = []) {
  const roles = state.orgData?.roles || [];
  return (roleIds || []).map((roleId) => roles.find((role) => role.id === roleId)?.name).filter(Boolean);
}

function skillsForRoleIds(roleIds = []) {
  const roles = state.orgData?.roles || [];
  const skills = state.orgData?.skills || [];
  const skillIds = new Set();
  for (const roleId of roleIds || []) {
    const role = roles.find((item) => item.id === roleId);
    for (const skillId of role?.skillIds || []) skillIds.add(skillId);
  }
  return [...skillIds].map((skillId) => skills.find((skill) => skill.id === skillId)?.name).filter(Boolean);
}

function personTypeMeta(type) {
  if (type === "carbon") return { label: "碳基", className: "carbon" };
  if (type === "hybrid") return { label: "混编", className: "hybrid" };
  return { label: "硅基", className: "silicon" };
}

function buildPeopleDirectory() {
  const employees = (state.orgData?.employees || []).filter((employee) => employee.status !== "inactive");
  const agents = state.workspace?.agents || [];
  const adapters = state.orgData?.adapters || state.workspace?.technicalAdapters || [];
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  const usedAgentIds = new Set();
  const people = [];

  for (const employee of employees) {
    const agent = employee.agentId ? agentById.get(employee.agentId) : null;
    if (employee.agentId) usedAgentIds.add(employee.agentId);
    const roleNames = roleNamesForIds(employee.roleIds);
    const skills = skillsForRoleIds(employee.roleIds);
    const adapter = agent ? adapterById.get(agent.architecture?.adapterId || agent.id) : null;
    people.push({
      id: `employee:${employee.id}`,
      employeeId: employee.id,
      agentId: employee.agentId || null,
      source: "employee",
      name: employee.name,
      type: employee.type || agent?.employee?.employmentType || "carbon",
      title: roleNames[0] || agent?.employee?.title || (employee.type === "carbon" ? "碳基员工" : "硅基员工"),
      department: agent?.employee?.department || "组织通讯录",
      status: employee.status || "active",
      statusLabel: ORG_STATUS_LABELS[employee.status] || employee.status || "在职",
      roles: roleNames,
      skills,
      responsibility: agent?.employee?.responsibility || roleNames.join("、") || "等待补充职责边界",
      agentName: agent?.name || "",
      connectionStatus: agent?.connection?.connectionStatus || adapter?.connectionStatus || (agent ? agent.status : "manual"),
      connectionLabel: agent?.connection?.statusLabel || adapter?.statusLabel || (agent ? (agent.status === "online" ? "已接入" : "待接入") : "人工处理"),
      connectorType: agent?.connection?.connectorType || adapter?.connectorType || "Human",
      capabilities: [...new Set([...(agent?.capabilities || []), ...skills])].slice(0, 8),
      draftStatus: employee.digitalEmployeeDraft?.status || null,
    });
  }

  for (const agent of agents) {
    if (usedAgentIds.has(agent.id)) continue;
    const type = agent.employee?.employmentType || (agent.type === "human" ? "carbon" : "silicon");
    const adapter = adapterById.get(agent.architecture?.adapterId || agent.id);
    people.push({
      id: `agent:${agent.id}`,
      agentId: agent.id,
      source: "agent",
      name: agent.name,
      type,
      title: agent.employee?.title || agent.role || "智能体员工",
      department: agent.employee?.department || (agent.architecture?.runtimeScope === "local" ? "本机智能体" : "云端智能体"),
      status: agent.status === "online" ? "active" : "pending",
      statusLabel: agent.status === "online" ? "可调度" : "待接入",
      roles: agent.role ? [agent.role] : [],
      skills: agent.employee?.skills || [],
      responsibility: agent.employee?.responsibility || agent.role || "等待补充职责边界",
      agentName: agent.name,
      connectionStatus: agent.connection?.connectionStatus || adapter?.connectionStatus || agent.status,
      connectionLabel: agent.connection?.statusLabel || adapter?.statusLabel || (agent.status === "online" ? "已接入" : "待接入"),
      connectorType: agent.connection?.connectorType || adapter?.connectorType || agent.architecture?.provider || "Agent",
      capabilities: [...new Set([...(agent.capabilities || []), ...(agent.employee?.skills || [])])].slice(0, 8),
    });
  }

  if (!people.some((person) => person.type === "carbon")) {
    people.unshift({
      id: "synthetic:owner",
      source: "synthetic",
      name: "本机负责人",
      type: "carbon",
      title: "Owner / 最终验收人",
      department: "经营层",
      status: "active",
      statusLabel: "在位",
      roles: ["目标确认", "权限授权", "最终验收"],
      skills: ["优先级判断", "风险确认"],
      responsibility: "为硅基员工授权目录、确认关键决策，并对最终交付负责。",
      agentName: "",
      connectionStatus: "manual",
      connectionLabel: "人工决策",
      connectorType: "Human",
      capabilities: ["approval", "governance", "risk-control"],
    });
  }

  const order = { carbon: 0, hybrid: 1, silicon: 2 };
  return people.sort((left, right) => (order[left.type] ?? 9) - (order[right.type] ?? 9) || left.name.localeCompare(right.name, "zh-CN"));
}

async function openEmployeeCreateModal(defaultType = "carbon") {
  const agents = state.workspace?.agents || [];
  const roles = state.orgData?.roles || [];
  const values = await openActionModal({
    title: defaultType === "carbon" ? "新建碳基员工" : "新建硅基员工",
    fields: [
      { name: "name", label: "姓名", required: true, placeholder: defaultType === "carbon" ? "例如：张三" : "例如：Kimi 研究员" },
      { name: "type", label: "类型", value: defaultType, type: "select", options: [
        { value: "carbon", label: "碳基" },
        { value: "silicon", label: "硅基" },
        { value: "hybrid", label: "混编" },
      ]},
      { name: "agentId", label: "关联 Agent", value: "", type: "select", required: false, options: [
        { value: "", label: "无" },
        ...agents.map((agent) => ({ value: agent.id, label: `${agent.name} / ${agent.architecture?.provider || agent.type}` })),
      ]},
      { name: "roleIds", label: "关联岗位", type: "checkbox", value: [], options: roles.map((role) => ({ value: role.id, label: role.name })) },
    ],
    confirmLabel: "创建员工",
  });
  if (!values) return;
  const roleIds = Array.isArray(values.roleIds) ? values.roleIds : [];
  await api.createEmployee({
    name: values.name,
    type: values.type || defaultType,
    agentId: values.agentId || undefined,
    roleIds,
  });
  await loadOrgData();
  renderOrganizationPage();
  showToast("员工已创建");
}

async function openEmployeeEditModal(employeeId) {
  const employee = state.orgData?.employees?.find((item) => item.id === employeeId);
  if (!employee) return;
  const roles = state.orgData?.roles || [];
  const values = await openActionModal({
    title: "编辑员工",
    fields: [
      { name: "name", label: "姓名", value: employee.name, required: true },
      { name: "status", label: "状态", value: employee.status || "active", type: "select", options: [
        { value: "active", label: "在职" },
        { value: "vacation", label: "休假" },
        { value: "inactive", label: "离职" },
      ]},
      { name: "roleIds", label: "关联岗位", type: "checkbox", value: employee.roleIds || [], options: roles.map((role) => ({ value: role.id, label: role.name })) },
    ],
    confirmLabel: "保存",
  });
  if (!values) return;
  await api.updateEmployee(employeeId, {
    name: values.name,
    status: values.status,
    roleIds: Array.isArray(values.roleIds) ? values.roleIds : [],
  });
  await loadOrgData();
  renderOrganizationPage();
  showToast("员工已更新");
}

async function archiveEmployee(employeeId) {
  const employee = state.orgData?.employees?.find((item) => item.id === employeeId);
  if (!employee) return;
  if (!(await askConfirm(`确认将「${employee.name}」标记为离职吗？`, { title: "移除员工", danger: true, confirmLabel: "标记离职" }))) return;
  await api.deleteEmployee(employeeId);
  state.selectedOrgPersonId = null;
  await loadOrgData();
  renderOrganizationPage();
  showToast("员工已移出通讯录");
}

function renderDirectoryInspector(person, people = []) {
  const meta = personTypeMeta(person?.type);
  const workload = person ? workloadForPerson(person) : 0;
  const capabilities = person?.capabilities?.length ? person.capabilities : person?.skills || [];
  const adapters = state.orgData?.adapters || state.workspace?.technicalAdapters || [];
  const adapter = adapters.find((item) => item.id === person?.agentId || item.name === person?.agentName) || adapters[0];
  document.querySelector(".inspector-head h2").textContent = person?.name || "员工详情";
  document.querySelector(".inspector-body").innerHTML = person
    ? `
      <section class="directory-profile-panel">
        <div class="profile-topline">
          <span class="person-avatar large ${meta.className}">${iconFor(person.name)}</span>
          <div>
            <h3>${escapeHtml(person.name)}</h3>
            <p>${escapeHtml(person.title)}</p>
            <small>${escapeHtml(person.agentName ? `${person.agentName}@nomos.ai` : `${person.name.toLowerCase().replaceAll(" ", ".")}@nomos.ai`)}</small>
          </div>
          <span class="status-online"><i class="status-dot"></i>${onlineForPerson(person) ? "在线" : "离开"}</span>
        </div>
        <nav class="detail-tabs">
          <button class="active" type="button">概览</button>
          <button type="button">权限</button>
          <button type="button">日志</button>
          <button type="button">设置</button>
        </nav>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">适配器绑定</div>
        <article class="adapter-card">
          <div>
            <strong>${escapeHtml(person.connectorType || adapter?.name || "Human Adapter")}</strong>
            <span><i class="status-dot"></i>${escapeHtml(person.connectionLabel || "健康")}</span>
          </div>
          <small>v2.1.0</small>
          <p>最后心跳：${onlineForPerson(person) ? "1 分钟前" : "离线"}</p>
        </article>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">权限与策略</div>
        <div class="policy-grid">
          <span>角色</span><b>${escapeHtml(person.title)}</b>
          <span>数据范围</span><b>${person.type === "carbon" ? "全局" : "项目内"}</b>
          <span>审批权限</span><b>${person.type === "carbon" ? "所有流程" : "指定节点"}</b>
          <span>派发策略</span><b>高优先级优先</b>
        </div>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">技能</div>
        <div class="profile-tags">${(capabilities.length ? capabilities : ["流程协作", "资料研读", "回执生成"]).slice(0, 7).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}<b>+${Math.max(0, capabilities.length - 7)}</b></div>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">当前工作项</div>
        <div class="mini-work-list">
          ${[
            ["年度战略规划", "进行中", workload],
            ["组织效能提升计划", "进行中", Math.max(20, workload - 25)],
            ["投资组合评估", "待启动", Math.max(15, workload - 40)],
          ].map(([title, status, progress]) => `
            <article>
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(status)} · 进度 ${progress}%</span>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="inspector-section tight">
        <div class="inspector-label">最近派发与接收</div>
        <div class="receipt-list">
          ${["年度战略规划更新", "市场分析报告", "战略重点拆解任务", "投资组合周报", "组织效能调研任务"].map((title, index) => `
            <p><b>${index === 2 || index === 4 ? "派发" : "接收"}</b><span>${escapeHtml(title)}</span><time>${index < 2 ? `${2 + index * 13} 分钟前` : `${index} 小时前`}</time></p>
          `).join("")}
        </div>
      </section>
    `
    : '<p class="empty-copy">选择一位员工查看详情。</p>';
}

function renderOrganizationPage() {
  if (!state.orgData) {
    emptyPanel.innerHTML = `<div class="page-head"><div><div class="eyebrow">Organization</div><h2>组织</h2><p>正在加载组织数据...</p></div></div>`;
    run(async () => { await loadOrgData(); renderWorkspace(); renderOrganizationPage(); });
    return;
  }
  emptyPanel.innerHTML = `
    <div class="console-topbar directory-topbar">
      <div>
        <h2>组织通讯录 <small> ${buildPeopleDirectory().length} 人</small></h2>
      </div>
      <div class="topbar-actions">
        <input class="top-search" type="search" value="${escapeHtml(state.orgSearch)}" placeholder="搜索姓名、角色或技能" data-directory-search-main />
        <button class="button" type="button" data-directory-filter-button>筛选</button>
        <button class="button primary" type="button" data-create-silicon>新增员工</button>
      </div>
    </div>
    <div id="orgSubContent" class="directory-table-host"></div>
  `;
  emptyPanel.querySelector("[data-directory-search-main]")?.addEventListener("input", (event) => {
    state.orgSearch = event.target.value;
    projectSearch.value = state.orgSearch;
    renderOrganizationPage();
  });
  emptyPanel.querySelector("[data-directory-filter-button]")?.addEventListener("click", () => {
    state.orgTypeFilter = state.orgTypeFilter === "all" ? "silicon" : "all";
    renderWorkspace();
    renderOrganizationPage();
  });
  emptyPanel.querySelector("[data-create-silicon]")?.addEventListener("click", () => run(() => openEmployeeCreateModal("silicon")));
  const container = document.getElementById("orgSubContent");
  renderOrgOverview(container);
}

function renderOrgOverview(container) {
  const people = buildPeopleDirectory();
  const query = state.orgSearch.trim().toLowerCase();
  const typeFilter = state.orgTypeFilter || "all";
  const filteredPeople = people.filter((person) => {
    const matchesType = typeFilter === "all" || person.type === typeFilter;
    const haystack = [person.name, person.title, person.department, person.agentName, ...(person.roles || []), ...(person.capabilities || [])]
      .join(" ")
      .toLowerCase();
    return matchesType && (!query || haystack.includes(query));
  });
  const selected =
    filteredPeople.find((person) => person.id === state.selectedOrgPersonId) ||
    filteredPeople[0] ||
    people[0];
  if (selected) state.selectedOrgPersonId = selected.id;
  renderDirectoryInspector(selected, people);
  container.innerHTML = `
    <div class="directory-type-strip">
      ${[
        ["all", "全部"],
        ["carbon", "碳基"],
        ["silicon", "硅基"],
        ["hybrid", "混编"],
      ].map(([key, label]) => `<button class="${typeFilter === key ? "active" : ""}" type="button" data-directory-filter="${key}">${label}</button>`).join("")}
    </div>
    <div class="people-table">
      <div class="people-table-head">
        <span>姓名</span>
        <span>类型</span>
        <span>角色</span>
        <span>技能</span>
        <span>工作负载</span>
        <span>在线</span>
        <span>当前流程</span>
        <span>最近接收</span>
      </div>
      <div class="people-table-body">
        ${
          filteredPeople.length
            ? filteredPeople.map((person, index) => {
                const meta = personTypeMeta(person.type);
                const workload = workloadForPerson(person);
                const online = onlineForPerson(person);
                const skills = (person.capabilities?.length ? person.capabilities : person.skills || []).slice(0, 3).join("、") || person.responsibility;
                return `
                  <button class="people-row ${state.selectedOrgPersonId === person.id ? "active" : ""}" type="button" data-directory-person="${escapeHtml(person.id)}">
                    <span class="identity-cell">
                      <i class="person-avatar ${meta.className}">${iconFor(person.name)}</i>
                      <b>${escapeHtml(person.name)}<small>${escapeHtml(person.agentName || person.name.toLowerCase().replaceAll(" ", "."))}</small></b>
                    </span>
                    <span><em class="type-pill ${meta.className}">${meta.label}</em></span>
                    <span>${escapeHtml(person.title)}</span>
                    <span class="truncate">${escapeHtml(skills)}</span>
                    <span class="load-cell"><b>${workload}%</b><i><u style="width:${workload}%"></u></i></span>
                    <span class="${online ? "online-text" : "muted-text"}"><i class="status-dot ${online ? "" : "off"}"></i>${online ? "在线" : "离开"}</span>
                    <span>${escapeHtml(currentFlowForPerson(person, index))}</span>
                    <span>${escapeHtml(lastReceiptForPerson(person, index))}</span>
                  </button>
                `;
              }).join("")
            : '<p class="empty-copy">没有匹配的员工。</p>'
        }
      </div>
      <div class="table-footer"><span>共 ${people.length} 人</span><div><button class="pager muted" type="button">‹</button><button class="pager active" type="button">1</button><button class="pager" type="button">2</button><button class="pager muted" type="button">›</button></div></div>
    </div>
  `;
  container.querySelectorAll("[data-directory-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.orgTypeFilter = button.dataset.directoryFilter;
      state.selectedOrgPersonId = null;
      renderOrgOverview(container);
    });
  });
  container.querySelectorAll("[data-directory-person]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrgPersonId = button.dataset.directoryPerson;
      renderOrgOverview(container);
    });
  });
  container.querySelectorAll("[data-directory-edit]").forEach((button) => {
    button.addEventListener("click", () => run(() => openEmployeeEditModal(button.dataset.directoryEdit)));
  });
  container.querySelectorAll("[data-directory-delete]").forEach((button) => {
    button.addEventListener("click", () => run(() => archiveEmployee(button.dataset.directoryDelete)));
  });
  container.querySelectorAll("[data-directory-factory]").forEach((button) => {
    button.addEventListener("click", () => {
      state.factoryEmployeeId = button.dataset.directoryFactory;
      state.orgSubPage = "factory";
      renderOrganizationPage();
    });
  });
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

const WORKBENCH_SUBPAGES = [
  { key: "items", label: "工作项" },
  { key: "progress", label: "进度看板" },
  { key: "resources", label: "资源看板" },
];
const WORK_ITEM_STATUS_LABELS = {
  todo: "待开始",
  ready: "就绪",
  in_progress: "进行中",
  waiting_dependency: "等依赖",
  review_pending: "待验收",
  blocked: "阻塞",
  done: "完成",
  cancelled: "取消",
};
const WORK_ITEM_STATUS_CLASS = {
  todo: "neutral",
  ready: "info",
  in_progress: "primary",
  waiting_dependency: "warn",
  review_pending: "info",
  blocked: "danger",
  done: "success",
  cancelled: "neutral",
};

async function loadWorkbenchData(params = "") {
  try {
    const [itemsRes, progressRes, resourcesRes] = await Promise.all([
      api.workItems(params),
      api.progressDashboard(params),
      api.resourceDashboard(params),
    ]);
    state.workbenchData = {
      items: itemsRes.data || [],
      progress: progressRes.data || {},
      resources: resourcesRes.data || {},
    };
  } catch (error) {
    console.error("加载工作台失败:", error);
    state.workbenchData = { items: [], progress: {}, resources: {}, error: error.message };
  }
}

function percent(value) {
  if (value === null || value === undefined) return "未知";
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatHours(value) {
  const number = Number(value || 0);
  return `${Math.round(number * 10) / 10}h`;
}

function formatDue(value) {
  if (!value) return "未设截止";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function workItemAssignee(item) {
  if (!item.assignee || item.assignee.type === "unassigned") return "未分配";
  return item.assignee.name || item.assignee.id || "未分配";
}

function workItemStage(item) {
  return item.flowStageName || item.legacyStageKey || "项目临时";
}

function renderWorkbenchPage() {
  if (!state.workbenchData) {
    emptyPanel.innerHTML = `<div class="page-head"><div><div class="eyebrow">Workbench</div><h2>工作台</h2><p>正在加载工作项...</p></div></div>`;
    run(async () => { await loadWorkbenchData(); renderWorkbenchPage(); });
    return;
  }
  const progress = state.workbenchData.progress || {};
  emptyPanel.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Workbench</div>
        <h2>工作台</h2>
        <p>${progress.total || 0} 个工作项 · 完成率 ${percent(progress.completionRate)}</p>
      </div>
      <div class="page-actions">
        <button class="button" type="button" data-workitem-sync>同步旧任务</button>
        <button class="button primary" type="button" data-workitem-create>新建工作项</button>
      </div>
    </div>
    <nav class="org-nav">
      ${WORKBENCH_SUBPAGES.map((sp) => `<button class="org-nav-item${state.workbenchSubPage === sp.key ? " active" : ""}" data-workbench-sub="${sp.key}">${sp.label}</button>`).join("")}
    </nav>
    <div id="workbenchSubContent"></div>
  `;
  emptyPanel.querySelector(".org-nav").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-workbench-sub]");
    if (!btn) return;
    state.workbenchSubPage = btn.dataset.workbenchSub;
    renderWorkbenchPage();
  });
  emptyPanel.querySelector("[data-workitem-create]").addEventListener("click", openWorkItemCreateModal);
  emptyPanel.querySelector("[data-workitem-sync]").addEventListener("click", () =>
    run(async () => {
      await api.syncLegacyWorkItems();
      await loadWorkbenchData();
      renderWorkbenchPage();
      showToast("旧任务已同步到工作项");
    }),
  );
  const container = document.getElementById("workbenchSubContent");
  if (state.workbenchSubPage === "progress") renderProgressDashboard(container);
  else if (state.workbenchSubPage === "resources") renderResourceDashboard(container);
  else renderWorkItemList(container);
}

function renderMetricGrid(metrics) {
  return `
    <div class="workbench-metrics">
      ${metrics.map((metric) => `
        <article class="workbench-metric">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(String(metric.value))}</strong>
        </article>
      `).join("")}
    </div>`;
}

function renderWorkItemList(container) {
  const items = state.workbenchData.items || [];
  const progress = state.workbenchData.progress || {};
  container.innerHTML = `
    ${renderMetricGrid([
      { label: "总数", value: progress.total || 0 },
      { label: "完成", value: progress.done || 0 },
      { label: "阻塞", value: progress.blocked || 0 },
      { label: "逾期", value: progress.overdue || 0 },
      { label: "本周到期", value: progress.dueThisWeek || 0 },
    ])}
    <section class="page-section">
      <div class="manage-list workitem-list">
        ${items.length === 0 ? `<p class="empty-copy">暂无工作项。</p>` : items.map(renderWorkItemRow).join("")}
      </div>
    </section>
  `;
  bindWorkItemActions(container);
}

function renderWorkItemRow(item) {
  const statusClass = WORK_ITEM_STATUS_CLASS[item.status] || "neutral";
  const unmet = item.unmetDependencies || [];
  return `
    <article class="manage-row workitem-row">
      <div class="manage-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.projectTitle || item.projectId)} · ${escapeHtml(workItemStage(item))} · ${escapeHtml(workItemAssignee(item))} · ${formatDue(item.dueAt)}</p>
        ${unmet.length ? `<small>未完成依赖：${unmet.map((dep) => escapeHtml(dep.title)).join("、")}</small>` : ""}
      </div>
      <span class="workitem-status ${statusClass}">${WORK_ITEM_STATUS_LABELS[item.status] || item.status}</span>
      <div class="workitem-actions">
        ${!["done", "cancelled", "review_pending"].includes(item.status) ? `<button class="button tiny primary" type="button" data-workitem-dispatch="${escapeHtml(item.id)}">派发</button>` : ""}
        ${item.status !== "in_progress" && item.status !== "done" && item.status !== "cancelled" ? `<button class="button tiny" type="button" data-workitem-status="${escapeHtml(item.id)}|in_progress">开始</button>` : ""}
        ${item.status !== "done" && item.status !== "cancelled" ? `<button class="button tiny primary" type="button" data-workitem-status="${escapeHtml(item.id)}|done">完成</button>` : ""}
        ${item.status !== "blocked" && item.status !== "done" && item.status !== "cancelled" ? `<button class="button tiny" type="button" data-workitem-status="${escapeHtml(item.id)}|blocked">阻塞</button>` : ""}
        ${item.status !== "cancelled" ? `<button class="button tiny ghost" type="button" data-workitem-cancel="${escapeHtml(item.id)}">取消</button>` : ""}
      </div>
    </article>`;
}

function bindWorkItemActions(container) {
  container.querySelectorAll("[data-workitem-dispatch]").forEach((button) =>
    button.addEventListener("click", () => run(() => dispatchWorkItem(button.dataset.workitemDispatch))),
  );
  container.querySelectorAll("[data-workitem-status]").forEach((button) =>
    button.addEventListener("click", () =>
      run(async () => {
        const [id, status] = button.dataset.workitemStatus.split("|");
        const payload = { status };
        if (status === "blocked") {
          const reason = await askText("标记阻塞", "阻塞原因", "", { type: "textarea", confirmLabel: "保存" });
          if (reason === null) return;
          payload.blockedReason = reason.trim();
        }
        await api.updateWorkItem(id, payload);
        await loadWorkbenchData();
        renderWorkbenchPage();
        showToast("工作项已更新");
      }),
    ),
  );
  container.querySelectorAll("[data-workitem-cancel]").forEach((button) =>
    button.addEventListener("click", () =>
      run(async () => {
        if (!(await askConfirm("确认取消这个工作项吗？", { title: "取消工作项", danger: true, confirmLabel: "取消工作项" }))) return;
        await api.cancelWorkItem(button.dataset.workitemCancel);
        await loadWorkbenchData();
        renderWorkbenchPage();
        showToast("工作项已取消");
      }),
    ),
  );
}

function defaultDispatchWorkspace() {
  return state.project?.workspaceDir || state.workspace?.bridge?.allowedWorkspaces?.[0] || "";
}

async function dispatchWorkItem(workItemId) {
  const item = (state.workbenchData?.items || []).find((record) => record.id === workItemId);
  const route = await api.workItemAgentRoute(workItemId);
  const candidateOptions = (route.candidates || [route.selectedAgent]).map((agent) => ({
    value: agent.id,
    label: `${agent.name} / ${agent.connectorType} / ${agent.supportsExecution ? "本地执行" : "协作派发"}`,
  }));
  const values = await openActionModal({
    title: "派发工作项",
    description: item ? `${item.title}\n${route.reason}` : route.reason,
    fields: [
      { name: "agentId", label: "目标 Agent", type: "select", value: route.selectedAgent.id, options: candidateOptions },
      { name: "mode", label: "权限模式", type: "select", value: "read-only", options: [
        { value: "read-only", label: "只读分析" },
        { value: "workspace-write", label: "允许写入工作目录" },
      ] },
      { name: "workspaceDir", label: "本地工作目录", value: defaultDispatchWorkspace(), required: false },
      { name: "note", label: "补充说明", type: "textarea", required: false },
    ],
    confirmLabel: "生成预览",
  });
  if (!values) return;
  const payload = {
    agentId: values.agentId,
    mode: values.mode || "read-only",
    workspaceDir: values.workspaceDir,
    note: values.note,
  };
  let preview;
  try {
    preview = await api.previewWorkItemDispatch(workItemId, payload);
  } catch (error) {
    if (error.message !== "工作目录不在允许范围内") throw error;
    const approved = await askConfirm(`该目录尚未授权：\n${payload.workspaceDir}\n\n确认允许本地 Agent 访问这个目录吗？`, {
      title: "授权本地目录",
      confirmLabel: "允许访问",
    });
    if (!approved) return;
    await api.allowWorkspace(payload.workspaceDir);
    preview = await api.previewWorkItemDispatch(workItemId, payload);
  }

  if (preview.kind === "alice-dispatch") {
    if (!(await askConfirm(`即将把以下内容发送给本机 Alice MCP：\n\n${preview.dispatch.message}`, {
      title: "确认派发给 Alice",
      confirmLabel: "确认派发",
    }))) return;
    await api.confirmAliceDispatch(preview.dispatch.id, preview.confirmationToken);
    await loadWorkspace(state.project.id);
    await loadWorkbenchData();
    renderWorkbenchPage();
    showToast("工作项已派发给 Alice");
    return;
  }

  await confirmExecutionPreview(preview);
  await loadWorkbenchData();
  renderWorkbenchPage();
}

function renderProgressDashboard(container) {
  const data = state.workbenchData.progress || {};
  container.innerHTML = `
    ${renderMetricGrid([
      { label: "完成率", value: percent(data.completionRate) },
      { label: "工时完成率", value: percent(data.hourCompletionRate) },
      { label: "有效工时", value: formatHours(data.activeEstimateHours) },
      { label: "阻塞链路", value: (data.blockingLinks || []).length },
    ])}
    <section class="page-section workbench-grid">
      <div class="workbench-panel">
        <div class="section-head"><h3>阶段进度</h3></div>
        ${(data.stageGroups || []).length === 0 ? `<p class="empty-copy">暂无阶段数据。</p>` : (data.stageGroups || []).map((group) => `
          <div class="workbench-bar-row">
            <span>${escapeHtml(group.label)}</span>
            <div class="progress"><div class="progress-bar" style="width:${Math.round((group.completionRate || 0) * 100)}%"></div></div>
            <b>${percent(group.completionRate)}</b>
          </div>
        `).join("")}
      </div>
      <div class="workbench-panel">
        <div class="section-head"><h3>阻塞链路</h3></div>
        ${(data.blockingLinks || []).length === 0 ? `<p class="empty-copy">暂无阻塞项。</p>` : (data.blockingLinks || []).map((item) => `
          <div class="workbench-blocker">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.blockedReason || item.unmetDependencies?.map((dep) => dep.title).join("、") || "等待处理")}</p>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="page-section">
      <div class="section-head"><h3>最近事件</h3></div>
      <div class="manage-list">
        ${(data.recentEvents || []).length === 0 ? `<p class="empty-copy">暂无事件。</p>` : (data.recentEvents || []).map((event) => `
          <div class="audit-row">
            <span>${escapeHtml(event.workItemTitle)} · ${escapeHtml(event.type)}</span>
            <time>${escapeHtml(formatDue(event.createdAt))}</time>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderResourceDashboard(container) {
  const data = state.workbenchData.resources || {};
  container.innerHTML = `
    ${renderMetricGrid([
      { label: "执行者", value: data.totalResources || 0 },
      { label: "工作项", value: data.totalItems || 0 },
      { label: "关注对象", value: data.overloaded || 0 },
      { label: "未分配", value: data.unassigned?.total || 0 },
    ])}
    <section class="page-section">
      <div class="manage-list">
        ${(data.resources || []).length === 0 ? `<p class="empty-copy">暂无资源负载。</p>` : (data.resources || []).map((group) => `
          <article class="manage-row resource-row">
            <div class="manage-copy">
              <strong>${escapeHtml(group.assignee.name)}</strong>
              <p>${escapeHtml(group.assignee.type)} · 进行中 ${group.inProgress} · 就绪 ${group.ready} · 阻塞 ${group.blocked} · 逾期 ${group.overdue}</p>
            </div>
            <span class="workitem-status ${group.blocked || group.overdue ? "danger" : group.inProgress ? "primary" : "success"}">${formatHours(group.remainingHours)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function openWorkItemCreateModal() {
  run(async () => {
    const projects = state.workspace?.projects || [];
    const agents = state.workspace?.agents || [];
    const employees = state.workspace?.employees || [];
    const roles = state.workspace?.roles || [];
    const stageOptions = [
      { value: "", label: "不绑定流程阶段" },
      ...((state.project?.flowStages || []).map((stage) => ({
        value: `${state.project.id}|${stage.id}`,
        label: `${state.project.title} / ${stage.name}`,
      }))),
    ];
    const assigneeOptions = [
      { value: "unassigned|", label: "未分配" },
      ...employees.map((employee) => ({ value: `employee|${employee.id}|${employee.name}`, label: `员工 / ${employee.name}` })),
      ...agents.map((agent) => ({ value: `agent|${agent.id}|${agent.name}`, label: `Agent / ${agent.name}` })),
      ...roles.map((role) => ({ value: `role|${role.id}|${role.name}`, label: `岗位 / ${role.name}` })),
    ];
    const values = await openActionModal({
      title: "新建工作项",
      fields: [
        { name: "title", label: "标题", placeholder: "例如：竞品分析" },
        { name: "projectId", label: "项目", type: "select", value: state.project?.id || projects[0]?.id || "", options: projects.map((project) => ({ value: project.id, label: project.title })) },
        { name: "flowStageRef", label: "流程阶段", type: "select", required: false, options: stageOptions },
        { name: "assigneeRef", label: "负责人", type: "select", required: false, options: assigneeOptions },
        { name: "status", label: "状态", type: "select", value: "todo", options: [
          { value: "todo", label: "待开始" },
          { value: "ready", label: "就绪" },
          { value: "in_progress", label: "进行中" },
        ] },
        { name: "estimateHours", label: "预计工时", type: "number", required: false, placeholder: "例如：2" },
        { name: "dueAt", label: "截止日期", type: "date", required: false },
        { name: "description", label: "描述", type: "textarea", required: false },
      ],
      confirmLabel: "创建",
    });
    if (!values) return;
    const payload = {
      projectId: values.projectId,
      sourceType: "manual",
      title: values.title,
      status: values.status || "todo",
      description: values.description || "",
      estimateHours: values.estimateHours ? Number(values.estimateHours) : null,
      dueAt: values.dueAt || null,
    };
    if (values.flowStageRef) {
      const [projectId, flowStageId] = values.flowStageRef.split("|");
      payload.projectId = projectId;
      payload.sourceType = "flow_stage";
      payload.flowInstanceId = projectId;
      payload.flowStageId = flowStageId;
    }
    if (values.assigneeRef) {
      const [type, id, name] = values.assigneeRef.split("|");
      payload.assignee = { type, id: id || null, name: name || null };
    }
    await api.createWorkItem(payload);
    await loadWorkbenchData();
    renderWorkbenchPage();
    showToast("工作项已创建");
  });
}

function riskLabelForWorkItem(item) {
  if (item.isOverdue) return ["逾期", "danger"];
  if (item.status === "blocked") return ["阻塞", "danger"];
  if (item.status === "waiting_dependency") return ["等依赖", "warn"];
  if (item.status === "review_pending") return ["待验收", "info"];
  return [WORK_ITEM_STATUS_LABELS[item.status] || item.status, WORK_ITEM_STATUS_CLASS[item.status] || "neutral"];
}

function renderLeadershipDashboardPage() {
  if (!state.workbenchData || !state.flowData) {
    emptyPanel.innerHTML = `<div class="page-head"><div><div class="eyebrow">Command</div><h2>领导驾驶舱</h2><p>正在汇总项目、员工、流程和工作项状态...</p></div></div>`;
    run(async () => {
      await Promise.all([loadWorkbenchData(), loadFlowData()]);
      renderWorkspace();
      renderLeadershipDashboardPage();
    });
    return;
  }
  const workspace = state.workspace || {};
  const agents = workspace.agents || [];
  const people = state.orgData ? buildPeopleDirectory() : (agents || []).map((agent) => ({
    id: agent.id,
    name: agent.name,
    title: agent.employee?.title || agent.role || "智能体员工",
    type: agent.employee?.employmentType || "silicon",
    status: agent.status,
    connectionStatus: agent.status,
  }));
  const items = (state.workbenchData.items || []).length
    ? state.workbenchData.items
    : [
        { title: "PRD 文档撰写", assignee: { name: "Claude" }, status: "ready", priority: "high" },
        { title: "接口方案设计", assignee: { name: "Codex" }, status: "ready", priority: "high" },
        { title: "数据模型设计", assignee: { name: "Codex" }, status: "todo", priority: "medium" },
        { title: "安全评估报告", assignee: { name: "Claude" }, status: "todo", priority: "medium" },
        { title: "用户故事拆解", assignee: { name: "Kimi" }, status: "todo", priority: "medium" },
      ];
  const receipts = [
    ["竞品功能对比分析", "Kimi", "需要人工确认"],
    ["PRD 文档初稿", "Claude", "需要人工确认"],
    ["接口实现方案", "Codex", "待确认"],
    ["数据模型设计", "Codex", "已通过"],
    ["用户调研分析报告", "Kimi", "已通过"],
  ];
  const onlineCount = people.filter(onlineForPerson).length;
  const runningItems = items.filter((item) => item.status === "in_progress" || item.status === "ready" || item.status === "todo").length || 18;
  const reviewPending = items.filter((item) => item.status === "review_pending" || item.status === "ready").length || 12;
  emptyPanel.innerHTML = `
    <div class="console-topbar cockpit-topbar">
      <div>
        <h2>Nomos 控制台</h2>
        <p>统一编排碳硅组织的人机协同工作</p>
      </div>
      <div class="topbar-status"><span>更新时间：09:41:23</span><button class="icon-button" type="button">↻</button></div>
    </div>
    <section class="metric-strip">
      ${[
        ["在线员工", `${onlineCount} / ${Math.max(people.length, 6)}`, "在线", "green"],
        ["进行中工作项", runningItems || 18, "运行中", "green"],
        ["待确认派发", reviewPending || 12, "待确认", "orange"],
        ["待验收回执", receipts.length + 2, "需要人工确认", "red"],
      ].map(([title, value, label, tone]) => `
        <article class="metric-card ${tone}">
          <i></i>
          <div><span>${title}</span><strong>${value}</strong><small>${label}</small></div>
        </article>
      `).join("")}
    </section>
    <section class="control-grid">
      <article class="control-panel org-snapshot">
        <div class="panel-head">
          <h3>组织通讯录</h3>
          <div class="panel-tools"><button class="button tiny" type="button">全部类型</button><input class="panel-search" placeholder="搜索成员或角色" /></div>
        </div>
        <div class="member-list">
          <h4>碳基成员（人类）</h4>
          ${people.filter((person) => person.type === "carbon").slice(0, 1).map((person) => `
            <button class="member-row" type="button" data-dashboard-tab="organization">
              <span class="person-avatar carbon">${iconFor(person.name)}</span>
              <b>${escapeHtml(person.name)}<small>${escapeHtml(person.title)}</small></b>
              <em>在线</em><i>负载 ${workloadForPerson(person)}%</i>
            </button>
          `).join("") || `<button class="member-row" type="button" data-dashboard-tab="organization"><span class="person-avatar carbon">AL</span><b>Alice<small>产品负责人</small></b><em>在线</em><i>负载 62%</i></button>`}
          <h4>硅基成员（Agent）</h4>
          ${people.filter((person) => person.type !== "carbon").slice(0, 4).map((person) => `
            <button class="member-row" type="button" data-dashboard-tab="organization">
              <span class="person-avatar silicon">${iconFor(person.name)}</span>
              <b>${escapeHtml(person.name)}<small>${escapeHtml(person.title)}</small></b>
              <em>${onlineForPerson(person) ? "在线" : "离线"}</em><i>负载 ${workloadForPerson(person)}%</i>
            </button>
          `).join("")}
        </div>
      </article>
      <article class="control-panel workflow-snapshot">
        <div class="panel-head">
          <h3>工作流编排</h3>
          <div><button class="button" type="button" data-dashboard-tab="workflow">编辑流程</button><button class="button" type="button">更多</button></div>
        </div>
        <p class="flow-current">当前流程：产品需求分析到交付 v2.3 <span>运行中</span> 开始于 08:57</p>
        <div class="mini-flow">
          ${[
            ["需求收集", "Alice", "完成"],
            ["市场调研", "Kimi", "运行中"],
            ["方案评审", "Claude", "等待中"],
            ["实现开发", "Codex", "等待中"],
            ["验收发布", "Alice", "等待中"],
          ].map(([title, owner, status], index) => `
            <button class="${index === 1 ? "active" : ""}" type="button" data-dashboard-tab="workflow"><i></i><b>${title}</b><span>${owner}</span><small>${status}</small></button>
          `).join("")}
        </div>
        <div class="node-detail">
          <strong>节点详情：市场调研（Kimi）</strong>
          <p>进度 68% <i><u style="width:68%"></u></i> 预计完成 15 分钟后</p>
        </div>
        <div class="current-work-list">
          ${["竞品功能对比分析", "用户访谈摘要整理", "市场规模与趋势分析"].map((title, index) => `
            <article><span>▤</span><b>${title}<small>${index === 0 ? "分析 5 个竞品在核心功能、定价、用户体验的差异" : index === 1 ? "整理 12 份用户访谈，提炼关键词和痛点" : "2023-2025 年市场规模、增长率与趋势预测"}</small></b><em>${index < 2 ? "进行中" : "已完成"}</em></article>
          `).join("")}
        </div>
      </article>
      <div class="right-stack">
        <article class="control-panel queue-panel">
          <div class="panel-head"><h3>派发队列 <small>${items.length}</small></h3><button class="button tiny" type="button" data-dashboard-action="new-workitem">批量派发</button></div>
          <div class="compact-table">
            <p><b>工作项</b><b>接收人</b><b>优先级</b><b>操作</b></p>
            ${items.slice(0, 5).map((item, index) => `
              <p><span>${escapeHtml(item.title)}</span><span>${escapeHtml(workItemAssignee(item))}</span><em class="${index < 2 ? "high" : "mid"}">${index < 2 ? "高" : "中"}</em><button type="button">派发</button></p>
            `).join("")}
          </div>
          <button class="panel-link" type="button" data-dashboard-tab="workbench">查看全部（${items.length}）→</button>
        </article>
        <article class="control-panel receipt-panel">
          <div class="panel-head"><h3>回执验收 <small>${receipts.length + 2}</small></h3><button class="button tiny" type="button">全部标为已读</button></div>
          <div class="compact-table receipts">
            <p><b>工作项</b><b>提交人</b><b>状态</b><b>操作</b></p>
            ${receipts.map(([title, owner, status], index) => `
              <p><span>${escapeHtml(title)}</span><span>${escapeHtml(owner)}</span><em class="${status === "已通过" ? "pass" : "wait"}">${escapeHtml(status)}</em><button type="button">查看回执</button></p>
            `).join("")}
          </div>
          <button class="panel-link" type="button" data-dashboard-tab="workbench">查看全部（7）→</button>
        </article>
      </div>
    </section>
  `;
  emptyPanel.querySelectorAll("[data-dashboard-tab]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.dashboardTab));
  });
  emptyPanel.querySelectorAll("[data-dashboard-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.dashboardAction;
      if (action === "new-workitem") openWorkItemCreateModal();
      if (action === "bridge") {
        toggleBridgeModal(true);
        run(renderBridge);
      }
    });
  });
}
const FLOW_CATEGORY_LABELS = { value: "价值流", enabling: "使能流", supporting: "支撑流" };
const FLOW_REVIEW_LABELS = { carbon: "碳评审", silicon: "硅评审", hybrid: "碳硅评审" };
const GATE_STATUS_META = {
  pending: ["待评审", "gate-pending"],
  passed: ["已通过", "gate-passed"],
  failed: ["不通过", "gate-failed"],
  returned: ["需返工", "gate-returned"],
};

async function loadFlowData() {
  try {
    const [flowsRes, workspace] = await Promise.all([api.flows(), api.workspace()]);
    const templates = flowsRes.data || [];
    const boundProjects = (workspace.projects || []).filter((p) => p.flowTemplateId);
    const progress = await Promise.all(
      boundProjects.map((p) => api.projectFlowProgress(p.id).then((r) => ({ project: p, ...r.data })).catch(() => null)),
    );
    state.flowData = { templates, instances: progress.filter(Boolean) };
  } catch (error) {
    console.error("加载流程数据失败:", error);
    state.flowData = { templates: [], instances: [] };
  }
}

function renderFlowPage() {
  renderWorkflowHomePage();
}

function renderFlowLibrary(container) {
  const templates = state.flowData.templates;
  if (templates.length === 0) {
    container.innerHTML = `
      <section class="page-section">
        <div class="section-head"><h3>快速开始</h3></div>
        <p class="empty-copy">流程库还是空的。一键导入 LTC / IPD / ITR 三个开箱即用的轻量版流程模板，或自己新建一条。</p>
        <button class="button primary" type="button" data-flow-presets>导入预设模板</button>
      </section>`;
    container.querySelector("[data-flow-presets]").addEventListener("click", initFlowPresets);
    return;
  }
  const grouped = { value: [], enabling: [], supporting: [] };
  for (const t of templates) (grouped[t.category] || (grouped[t.category] = [])).push(t);
  container.innerHTML = `
    <div class="flow-grid">
      ${templates
        .map(
          (t) => `
        <article class="flow-card" data-flow-open="${t.id}">
          <div class="flow-card-head">
            <span class="flow-badge cat-${t.category}">${FLOW_CATEGORY_LABELS[t.category] || t.category}</span>
            ${t.isPreset ? '<span class="flow-badge preset">预设</span>' : ""}
          </div>
          <strong class="flow-card-title">${escapeHtml(t.name)}</strong>
          <p class="flow-card-desc">${escapeHtml(t.description || "暂无描述")}</p>
          <div class="flow-card-meta">
            <span>${t.stageCount ?? t.stages.length} 个阶段</span>
            <span>${t.usageCount || 0} 个项目使用</span>
          </div>
        </article>`,
        )
        .join("")}
    </div>`;
  container.querySelectorAll("[data-flow-open]").forEach((card) =>
    card.addEventListener("click", () => {
      state.selectedFlowId = card.dataset.flowOpen;
      renderFlowPage();
    }),
  );
}

function renderFlowDetail(container, template) {
  container.innerHTML = `
    <div class="flow-detail-head">
      <button class="button ghost" type="button" data-flow-back>← 返回流程库</button>
      <div class="flow-detail-actions">
        ${template.isPreset ? "" : `<button class="button" type="button" data-flow-rename>重命名</button>`}
        <button class="button danger" type="button" data-flow-delete>删除</button>
      </div>
    </div>
    <section class="page-section">
      <div class="section-head">
        <h3>${escapeHtml(template.name)} <span class="flow-badge cat-${template.category}">${FLOW_CATEGORY_LABELS[template.category] || template.category}</span></h3>
      </div>
      <p class="empty-copy">${escapeHtml(template.description || "暂无描述")}</p>
      <ol class="flow-stage-list">
        ${template.stages
          .map(
            (stage, index) => `
          <li class="flow-stage-item">
            <div class="flow-stage-index">${String(index + 1).padStart(2, "0")}</div>
            <div class="flow-stage-body">
              <strong>${escapeHtml(stage.name)}</strong>
              ${stage.description ? `<p>${escapeHtml(stage.description)}</p>` : ""}
              <div class="flow-gate">
                <span class="flow-gate-mode">${FLOW_REVIEW_LABELS[stage.gate.reviewMode] || stage.gate.reviewMode}</span>
                ${stage.gate.entryConditions ? `<span><b>准入</b>：${escapeHtml(stage.gate.entryConditions)}</span>` : ""}
                ${stage.gate.exitCriteria ? `<span><b>准出</b>：${escapeHtml(stage.gate.exitCriteria)}</span>` : ""}
              </div>
              ${
                (stage.inputMaterials || []).length || (stage.expectedOutputs || []).length
                  ? `<div class="flow-io">
                      ${(stage.inputMaterials || []).length ? `<span>输入：${stage.inputMaterials.map(escapeHtml).join("、")}</span>` : ""}
                      ${(stage.expectedOutputs || []).length ? `<span>输出：${stage.expectedOutputs.map(escapeHtml).join("、")}</span>` : ""}
                    </div>`
                  : ""
              }
            </div>
          </li>`,
          )
          .join("")}
      </ol>
    </section>`;
  container.querySelector("[data-flow-back]").addEventListener("click", () => {
    state.selectedFlowId = null;
    renderFlowPage();
  });
  const renameBtn = container.querySelector("[data-flow-rename]");
  if (renameBtn)
    renameBtn.addEventListener("click", () =>
      run(async () => {
        const name = await askText("重命名流程", "流程名称", template.name, { confirmLabel: "保存" });
        if (!name?.trim()) return;
        await api.updateFlow(template.id, { name: name.trim() });
        await loadFlowData();
        renderFlowPage();
        showToast("流程模板已更新");
      }),
    );
  container.querySelector("[data-flow-delete]").addEventListener("click", () =>
    run(async () => {
      if (!(await askConfirm(`确认删除流程模板「${template.name}」吗？`, { title: "删除流程模板", danger: true, confirmLabel: "删除" }))) return;
      try {
        await api.deleteFlow(template.id);
      } catch (error) {
        showToast(error.message, "error");
        return;
      }
      state.selectedFlowId = null;
      await loadFlowData();
      renderFlowPage();
      showToast("流程模板已删除");
    }),
  );
}

function renderFlowInstances(container) {
  const instances = state.flowData.instances;
  if (instances.length === 0) {
    container.innerHTML = `<p class="empty-copy">还没有项目绑定流程模板。在创建项目时选择一个流程模板，或在这里查看实例进度。</p>`;
    return;
  }
  container.innerHTML = instances
    .map((inst) => {
      const template = state.flowData.templates.find((t) => t.id === inst.flowTemplateId);
      const currentId = inst.currentFlowStageId;
      return `
      <section class="page-section flow-instance">
        <div class="section-head">
          <h3>${escapeHtml(inst.project.title)}</h3>
          <span class="section-hint">${template ? escapeHtml(template.name) : "未知流程"} · ${inst.passed}/${inst.total} 关口通过${inst.completed ? " · 已完成" : ""}</span>
        </div>
        <div class="flow-track">
          ${(inst.flowStages || [])
            .map((s) => {
              const [label, cls] = GATE_STATUS_META[s.gateStatus] || ["待评审", "gate-pending"];
              const isCurrent = s.id === currentId;
              return `
              <div class="flow-track-node ${cls}${isCurrent ? " current" : ""}">
                <span class="flow-track-name">${escapeHtml(s.name)}</span>
                <span class="flow-track-status">${label}</span>
                ${isCurrent && !inst.completed ? `
                  <div class="flow-track-actions">
                    <button class="button tiny primary" data-gate-pass="${inst.project.id}|${s.id}">通过</button>
                    <button class="button tiny" data-gate-fail="${inst.project.id}|${s.id}">不通过</button>
                    <button class="button tiny ghost" data-gate-rework="${inst.project.id}|${s.id}">返工</button>
                  </div>` : ""}
              </div>`;
            })
            .join("")}
        </div>
      </section>`;
    })
    .join("");

  const onReview = (attr, action) =>
    container.querySelectorAll(`[data-gate-${attr}]`).forEach((btn) =>
      btn.addEventListener("click", () =>
        run(async () => {
          const [projectId, stageId] = btn.dataset[`gate${attr.charAt(0).toUpperCase()}${attr.slice(1)}`].split("|");
          let payload = { action };
          if (action === "fail" || action === "rework") {
            const comment = await askText(action === "fail" ? "不通过原因" : "返工原因", "说明", "", { type: "textarea", confirmLabel: "提交" });
            if (comment === null) return;
            payload.comment = comment.trim();
          }
          await api.reviewGate(projectId, stageId, payload);
          await loadFlowData();
          renderFlowPage();
          showToast(action === "pass" ? "关口已通过，进入下一阶段" : action === "fail" ? "已标记不通过" : "已返工到当前阶段");
        }),
      ),
    );
  onReview("pass", "pass");
  onReview("fail", "fail");
  onReview("rework", "rework");
}

function initFlowPresets() {
  run(async () => {
    try {
      const result = await api.initFlowPresets();
      await loadFlowData();
      renderWorkspace();
      if (state.activeTab === "workflow") renderWorkflowHomePage();
      else renderFlowPage();
      showToast(`已导入 ${result.data.created} 个预设流程模板`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function openFlowCreateModal() {
  run(async () => {
    const values = await openActionModal({
      title: "新建流程模板",
      description: "先填写流程基本信息，保存后可在详情中查看阶段。阶段用英文逗号或换行分隔。",
      fields: [
        { name: "name", label: "流程名称", placeholder: "例如：客户成功流程" },
        { name: "category", label: "分类", type: "select", options: [
          { value: "value", label: "价值流" },
          { value: "enabling", label: "使能流" },
          { value: "supporting", label: "支撑流" },
        ] },
        { name: "description", label: "描述", type: "textarea", placeholder: "这条流程解决什么问题", required: false },
        { name: "stages", label: "阶段列表", type: "textarea", placeholder: "每行一个阶段名，例如：\n受理\n处理\n验收" },
      ],
      confirmLabel: "创建流程",
    });
    if (!values) return;
    const stageNames = String(values.stages || "")
      .split(/[\n,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    await api.createFlow({
      name: values.name,
      category: values.category || "value",
      description: values.description || "",
      stages: stageNames.map((name) => ({ name })),
    });
    await loadFlowData();
    renderWorkspace();
    state.flowSubPage = "library";
    renderFlowPage();
    showToast("流程模板已创建");
  });
}

function renderActiveTab() {
  appShell.classList.toggle("surface-app", consoleSurfaceActive());
  appShell.classList.toggle("surface-dashboard", state.activeTab === "dashboard");
  appShell.classList.toggle("surface-directory", state.activeTab === "organization");
  appShell.classList.toggle("surface-workflow", state.activeTab === "workflow" || state.activeTab === "flow");
  appShell.classList.toggle("inspector-collapsed", state.activeTab === "dashboard");
  if (consoleSurfaceActive()) appShell.classList.remove("workspace-empty");
  else if (!state.project) appShell.classList.add("workspace-empty");
  renderWorkspace();
  const isOverview = state.activeTab === "overview";
  overviewPanel.style.display = isOverview ? "block" : "none";
  emptyPanel.style.display = isOverview ? "none" : "block";
  if (isOverview) {
    appShell.classList.remove("surface-app", "surface-dashboard", "surface-directory", "surface-workflow");
    appShell.classList.remove("inspector-collapsed");
    renderInspector();
    return;
  }
  if (state.activeTab === "dashboard") {
    renderLeadershipDashboardPage();
    return;
  }
  if (state.activeTab === "topics") {
    renderTopicsPage();
    return;
  }
  if (state.activeTab === "workflow") {
    renderWorkflowHomePage();
    return;
  }
  if (state.activeTab === "workbench") {
    renderWorkbenchPage();
    return;
  }
  if (state.activeTab === "organization") {
    renderOrganizationPage();
    return;
  }
  if (state.activeTab === "flow") {
    renderFlowPage();
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
  showToast("本地任务已开始执行");
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

document.querySelector(".workspace").addEventListener("input", (event) => {
  if (!event.target.matches(".project-search")) return;
  if (state.activeTab === "organization") {
    state.orgSearch = event.target.value;
    renderOrganizationPage();
    renderWorkspace();
    return;
  }
  state.projectSearch = event.target.value;
  renderWorkspace();
});

document.querySelector(".workspace").addEventListener("click", (event) => {
  const sidebarTab = event.target.closest("[data-sidebar-tab]");
  if (sidebarTab) {
    activateTab(sidebarTab.dataset.sidebarTab);
    return;
  }
  const filterButton = event.target.closest("[data-sidebar-filter]");
  if (filterButton) {
    state.orgTypeFilter = filterButton.dataset.sidebarFilter;
    renderWorkspace();
    renderOrganizationPage();
    return;
  }
  const templateButton = event.target.closest("[data-sidebar-template]");
  if (templateButton) {
    state.selectedFlowId = templateButton.dataset.sidebarTemplate;
    state.selectedFlowNodeKey = null;
    renderWorkspace();
    if (state.activeTab === "flow") renderFlowPage();
    else renderWorkflowHomePage();
    return;
  }
  if (event.target.closest("[data-sidebar-flow-create]")) {
    openFlowCreateModal();
    return;
  }
  if (event.target.closest("[data-sidebar-flow-presets]")) {
    initFlowPresets();
    return;
  }
  if (event.target.closest("#openBridge")) {
    toggleBridgeModal(true);
    run(renderBridge);
  }
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
    let templates = [];
    try {
      templates = (await api.flows()).data || [];
    } catch {
      templates = [];
    }
    const flowField = templates.length
      ? [{
          name: "flowTemplateId",
          label: "流程模板（可选）",
          type: "select",
          required: false,
          options: [{ value: "", label: "不绑定流程（自由模式）" }, ...templates.map((t) => ({ value: t.id, label: `${t.name}（${FLOW_CATEGORY_LABELS[t.category] || t.category}）` }))],
        }]
      : [];
    const values = await openActionModal({
      title: "创建新项目",
      description: "先写清楚目标，nomos 会为项目建立五阶段交付链路。可选择一个流程模板，按关口推进。",
      fields: [
        { name: "title", label: "项目名称", placeholder: "例如：个人官网首版" },
        { name: "goal", label: "本轮目标", type: "textarea", placeholder: "说明希望 Agent 团队交付的结果" },
        ...flowField,
      ],
      confirmLabel: "创建项目",
    });
    if (!values) return;
    if (!values.flowTemplateId) delete values.flowTemplateId;
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
      <span><i class="status-dot"></i>${onlineEmployees} / ${agents.length} \u4f4d\u78b3\u7845\u5458\u5de5\u53ef\u7528 · ${readyAdapters} / ${adapters.length} \u4e2a\u6280\u672f\u67b6\u6784\u5df2\u63a5\u5165</span>
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
              <span class="connection-desc">${escapeHtml(agent.employee?.department || "\u672a\u5206\u7ec4")} · ${escapeHtml(agent.employee?.title || agent.role || "")}</span>
              <span class="connection-desc">${escapeHtml(agent.architecture?.provider || "-")} / ${escapeHtml(agent.architecture?.model || "-")} · ${escapeHtml(agent.connection?.statusLabel || "\u5f85\u63a5\u5165")}</span>
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
              <span class="connection-desc">${escapeHtml(adapter.provider)} · ${escapeHtml(adapter.connectorType)} · ${escapeHtml(adapterStatusLabel(adapter))}</span>
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
