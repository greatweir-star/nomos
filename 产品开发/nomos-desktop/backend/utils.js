const { randomUUID } = require("crypto");
const path = require("path");
const fs = require("fs");
const { manuallyAdvanceActiveStage } = require("./workflow");
const { enrichAgents } = require("./agent-registry");
const { createAdapterDirectory } = require("./agent-registry");

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("请求内容过大"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("请求内容不是有效 JSON"));
      }
    });
    request.on("error", reject);
  });
}

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function findProject(data, projectId) {
  return data.projects.find((project) => project.id === projectId);
}

function findSkill(data, skillId) {
  return data.skills.find((skill) => skill.id === skillId);
}

function findRole(data, roleId) {
  return data.roles.find((role) => role.id === roleId);
}

function findEmployee(data, employeeId) {
  return data.employees.find((employee) => employee.id === employeeId);
}

const DRAFT_STATUS_ORDER = ["empty", "skill_matching", "onboarding", "mentorship", "draft_complete"];

function validateDraftTransition(current, next) {
  const ci = DRAFT_STATUS_ORDER.indexOf(current);
  const ni = DRAFT_STATUS_ORDER.indexOf(next);
  if (ni < 0) return "无效的草稿状态";
  if (ni <= ci) return "草稿状态只能向前推进，不可回退";
  if (ni > ci + 1) return `草稿状态只能从 ${current} 推进到 ${DRAFT_STATUS_ORDER[ci + 1]}`;
  return null;
}

function skillsReferencingRoles(data, skillId) {
  return data.roles
    .filter((role) => (role.skillIds || []).includes(skillId))
    .map((role) => ({ id: role.id, name: role.name }));
}

function rolesReferencingEmployees(data, roleId) {
  return data.employees
    .filter((employee) => (employee.roleIds || []).includes(roleId) && employee.status !== "inactive")
    .map((employee) => ({ id: employee.id, name: employee.name }));
}

function summarizeProject(project) {
  const activeStage = project.stages.find((stage) => ["in_progress", "review_pending", "blocked"].includes(stage.status));
  return {
    id: project.id,
    title: project.title,
    subtitle: project.subtitle,
    goal: project.goal,
    dueLabel: project.dueLabel,
    team: project.team,
    unread: project.unread,
    activeStageKey: activeStage?.key ?? null,
    workflowStatus: project.workflow?.status || "active",
    flowInstanceId: project.flowInstanceId || null,
    updatedAt: project.updatedAt,
  };
}

function addMessage(project, { authorId, authorName, authorType, text }) {
  const message = {
    id: randomUUID(),
    authorId,
    authorName,
    authorType,
    text,
    createdAt: new Date().toISOString(),
  };
  project.messages.push(message);
  project.updatedAt = message.createdAt;
  return message;
}

function mergeAgentConnections(agents, tools, adapterConfigs = {}) {
  return enrichAgents({ agents, localTools: tools, adapterConfigs });
}

function createBridgePayload(data, tools) {
  const technicalAdapters = createAdapterDirectory({
    localTools: tools,
    adapterConfigs: data.agentAdapters,
  });
  return {
    ...data.bridge,
    tools,
    technicalAdapters,
    agents: mergeAgentConnections(data.agents, tools, data.agentAdapters),
    localAgents: mergeAgentConnections(
      data.agents.filter((agent) => agent.architecture?.runtimeScope === "local" || agent.type === "local"),
      tools,
      data.agentAdapters,
    ),
    cloudAgents: mergeAgentConnections(
      data.agents.filter((agent) => agent.architecture?.runtimeScope === "cloud" || agent.type === "cloud"),
      tools,
      data.agentAdapters,
    ),
  };
}

function advanceProject(project) {
  return manuallyAdvanceActiveStage(project);
}

function serveStatic(response, rendererDir, pathname) {
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolvedPath = path.resolve(rendererDir, requestedPath);
  const rendererRoot = path.resolve(rendererDir);
  if (!resolvedPath.startsWith(`${rendererRoot}${path.sep}`) && resolvedPath !== rendererRoot) {
    sendError(response, 403, "禁止访问");
    return;
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    sendError(response, 404, "文件不存在");
    return;
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  };
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(resolvedPath).pipe(response);
}

module.exports = {
  sendJson,
  sendError,
  readJson,
  escapeHtml,
  formatDate,
  findProject,
  findSkill,
  findRole,
  findEmployee,
  DRAFT_STATUS_ORDER,
  validateDraftTransition,
  skillsReferencingRoles,
  rolesReferencingEmployees,
  summarizeProject,
  addMessage,
  mergeAgentConnections,
  createBridgePayload,
  advanceProject,
  serveStatic,
};
