"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { URL } = require("node:url");
const { JsonStore } = require("./store");
const { createProject, createDefaultOrgData, ROLE_FAMILY_DEFAULTS } = require("./default-data");
const { ExecutionManager } = require("./executor");
const { DeploymentManager } = require("./deployment");
const { AliceCoordinator } = require("./alice");
const { resolveAgentRoute, resolveWorkItemRoute } = require("./agent-router");
const { createAdapterDirectory, enrichAgents } = require("./agent-registry");
const {
  addStageDeliverable,
  manuallyAdvanceActiveStage,
  resolveCheckpoint,
  returnStageForRevision,
  submitStageReceipt,
  workflowPayload,
} = require("./workflow");
const {
  createFlowTemplate,
  applyFlowTemplatePatch,
  bindProjectFlow,
  unbindProjectFlow,
  reviewGate,
  flowProgress,
  presetFlowTemplates,
} = require("./flow");
const {
  WorkItemError,
  createWorkItem,
  updateWorkItem,
  cancelWorkItem,
  addDependency,
  removeDependency,
  addComment,
  filterWorkItems,
  decorateWorkItem,
  buildProgressDashboard,
  buildResourceDashboard,
  syncLegacyWorkItems,
  needsLegacySync,
} = require("./work-items");

const MAX_BODY_BYTES = 1024 * 1024;
const FETCH_BLOCKED_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103,
  104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513,
  514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

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

function sendDomainError(response, error) {
  if (error instanceof WorkItemError || error.statusCode) {
    const payload = { error: error.message };
    if (error.details) payload.details = error.details;
    sendJson(response, error.statusCode || 400, payload);
    return;
  }
  sendError(response, 400, error.message);
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

function findFlowTemplate(data, flowId) {
  return (data.flowTemplates || []).find((template) => template.id === flowId);
}

function snapshotWithLegacyWorkItems(store, projectId = null) {
  const data = store.snapshot();
  if (!needsLegacySync(data, projectId)) return data;
  return store.update((draft) => {
    syncLegacyWorkItems(draft, { projectId });
    return draft;
  });
}

function findDecoratedWorkItem(data, workItemId) {
  const item = (data.workItems || []).find((record) => record.id === workItemId);
  return item ? decorateWorkItem(data, item) : null;
}

function buildWorkItemDispatchPrompt(project, workItem, route, note = "") {
  return [
    "Nomos 工作项派发",
    `项目：${project?.title || workItem.projectTitle || workItem.projectId}`,
    project?.goal ? `项目目标：${project.goal}` : "",
    `工作项：${workItem.title}`,
    workItem.description ? `任务描述：${workItem.description}` : "",
    workItem.acceptanceCriteria ? `验收标准：${workItem.acceptanceCriteria}` : "",
    workItem.dueAt ? `截止时间：${workItem.dueAt}` : "",
    `推荐路由：${route.selectedAgent.name}（${route.reason}）`,
    note ? `补充说明：${note}` : "",
    "请完成该工作项，并在输出中包含：完成情况、关键改动或结论、验证结果、遗留风险。",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000);
}

function projectsReferencingFlow(data, flowId) {
  return data.projects
    .filter((project) => project.flowTemplateId === flowId)
    .map((project) => ({ id: project.id, title: project.title }));
}

function validRoleIdSet(data) {
  return new Set(data.roles.map((role) => role.id));
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
    flowTemplateId: project.flowTemplateId || null,
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

function createRequestHandler({ store, rendererDir, executionManager, aliceCoordinator, deploymentManager }) {
  return async function handleRequest(request, response) {
    const url = new URL(request.url, "http://127.0.0.1");
    const segments = url.pathname.split("/").filter(Boolean);
    const host = request.headers.host || "";
    const origin = request.headers.origin;

    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
        sendError(response, 403, "仅允许本机访问");
        return;
      }

      if (segments[0] === "api" && origin) {
        const originUrl = new URL(origin);
        const isLocalOrigin = /^(127\.0\.0\.1|localhost)$/.test(originUrl.hostname);
        if (!isLocalOrigin || originUrl.host !== host) {
          sendError(response, 403, "请求来源不受信任");
          return;
        }
      }

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
        });
        return;
      }

      if (url.pathname === "/api/dashboards/progress" && request.method === "GET") {
        const projectId = url.searchParams.get("projectId");
        const data = snapshotWithLegacyWorkItems(store, projectId);
        sendJson(response, 200, { data: buildProgressDashboard(data, url.searchParams) });
        return;
      }

      if (url.pathname === "/api/dashboards/resources" && request.method === "GET") {
        const projectId = url.searchParams.get("projectId");
        const data = snapshotWithLegacyWorkItems(store, projectId);
        sendJson(response, 200, { data: buildResourceDashboard(data, url.searchParams) });
        return;
      }

      if (url.pathname === "/api/work-items" && request.method === "GET") {
        const projectId = url.searchParams.get("projectId");
        const data = snapshotWithLegacyWorkItems(store, projectId);
        sendJson(response, 200, { data: filterWorkItems(data, url.searchParams).map((item) => decorateWorkItem(data, item)) });
        return;
      }

      if (url.pathname === "/api/work-items" && request.method === "POST") {
        const body = await readJson(request);
        try {
          const item = store.update((data) => {
            const created = createWorkItem(data, body, { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.create", `创建工作项：${created.title}`, {
              workItemId: created.id,
              projectId: created.projectId,
              sourceType: created.sourceType,
            });
            return created;
          });
          sendJson(response, 201, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (url.pathname === "/api/work-items/sync-legacy" && request.method === "POST") {
        const body = await readJson(request);
        const projectId = body.projectId || url.searchParams.get("projectId") || null;
        const snapshot = store.snapshot();
        if (projectId && !findProject(snapshot, projectId)) {
          sendError(response, 404, "项目不存在");
          return;
        }
        const result = store.update((data) => {
          const synced = syncLegacyWorkItems(data, { projectId });
          store.audit("workitem.sync-legacy", projectId ? `同步旧任务工作项：${projectId}` : "同步全部旧任务工作项", {
            projectId,
            ...synced,
          });
          return synced;
        });
        sendJson(response, 200, { data: result });
        return;
      }

      if (segments[1] === "work-items" && segments[2] && request.method === "GET" && segments.length === 3) {
        const data = snapshotWithLegacyWorkItems(store);
        const item = findDecoratedWorkItem(data, segments[2]);
        if (!item) {
          sendError(response, 404, "工作项不存在");
          return;
        }
        sendJson(response, 200, { data: item });
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "agent-route" && request.method === "GET") {
        const data = snapshotWithLegacyWorkItems(store);
        const item = findDecoratedWorkItem(data, segments[2]);
        if (!item) {
          sendError(response, 404, "工作项不存在");
          return;
        }
        try {
          const tools = createAdapterDirectory({
            localTools: await executionManager.listTools(),
            adapterConfigs: data.agentAdapters,
          });
          sendJson(response, 200, resolveWorkItemRoute({
            workItem: item,
            project: findProject(data, item.projectId),
            tools,
            requestedAgentId: url.searchParams.get("agentId"),
          }));
        } catch (error) {
          sendError(response, 400, error.message);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "dispatch" && segments[4] === "preview" && request.method === "POST") {
        const body = await readJson(request);
        const data = snapshotWithLegacyWorkItems(store);
        const item = findDecoratedWorkItem(data, segments[2]);
        if (!item) {
          sendError(response, 404, "工作项不存在");
          return;
        }
        const project = findProject(data, item.projectId);
        try {
          const tools = createAdapterDirectory({
            localTools: await executionManager.listTools(),
            adapterConfigs: data.agentAdapters,
          });
          const route = resolveWorkItemRoute({
            workItem: item,
            project,
            tools,
            requestedAgentId: body.agentId,
          });
          if (route.selectedAgent.id === "alice") {
            const preview = aliceCoordinator.previewWorkItem({
              workItem: item,
              project,
              note: body.note,
            });
            sendJson(response, 201, { kind: "alice-dispatch", route, ...preview });
            return;
          }
          if (!route.selectedAgent.supportsExecution) {
            sendError(response, 400, `${route.selectedAgent.name} 暂不支持工作项自动派发`);
            return;
          }
          const preview = executionManager.preview({
            projectId: item.projectId,
            workItemId: item.id,
            workItemTitle: item.title,
            agentId: route.selectedAgent.id,
            mode: body.mode || "read-only",
            workspaceDir: body.workspaceDir || project?.workspaceDir,
            prompt: body.prompt || buildWorkItemDispatchPrompt(project, item, route, body.note),
            agentRoute: route,
          });
          sendJson(response, 201, { kind: "execution", route, ...preview });
        } catch (error) {
          sendError(response, 400, error.message);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && request.method === "PATCH" && segments.length === 3) {
        const body = await readJson(request);
        try {
          const item = store.update((data) => {
            const updated = updateWorkItem(data, segments[2], body, { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.update", `更新工作项：${updated.title}`, {
              workItemId: updated.id,
              projectId: updated.projectId,
              status: updated.status,
            });
            return updated;
          });
          sendJson(response, 200, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "cancel" && request.method === "POST") {
        try {
          const item = store.update((data) => {
            const cancelled = cancelWorkItem(data, segments[2], { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.cancel", `取消工作项：${cancelled.title}`, {
              workItemId: cancelled.id,
              projectId: cancelled.projectId,
            });
            return cancelled;
          });
          sendJson(response, 200, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "dependencies" && request.method === "POST") {
        const body = await readJson(request);
        try {
          const item = store.update((data) => {
            const updated = addDependency(data, segments[2], body.dependencyId, { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.dependency.add", `新增工作项依赖：${updated.title}`, {
              workItemId: updated.id,
              dependencyId: body.dependencyId,
            });
            return updated;
          });
          sendJson(response, 200, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "dependencies" && segments[4] && request.method === "DELETE") {
        try {
          const item = store.update((data) => {
            const updated = removeDependency(data, segments[2], segments[4], { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.dependency.remove", `移除工作项依赖：${updated.title}`, {
              workItemId: updated.id,
              dependencyId: segments[4],
            });
            return updated;
          });
          sendJson(response, 200, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "events" && request.method === "GET") {
        const data = snapshotWithLegacyWorkItems(store);
        if (!filterWorkItems(data, {}).some((item) => item.id === segments[2])) {
          sendError(response, 404, "工作项不存在");
          return;
        }
        sendJson(response, 200, {
          data: (data.workItemEvents || []).filter((event) => event.workItemId === segments[2]),
        });
        return;
      }

      if (segments[1] === "work-items" && segments[2] && segments[3] === "comments" && request.method === "POST") {
        const body = await readJson(request);
        try {
          const item = store.update((data) => {
            const updated = addComment(data, segments[2], body.comment || body.text, { actor: { type: "user", name: "Local User" } });
            store.audit("workitem.comment.add", `新增工作项备注：${updated.title}`, {
              workItemId: updated.id,
              projectId: updated.projectId,
            });
            return updated;
          });
          sendJson(response, 201, { data: item });
        } catch (error) {
          sendDomainError(response, error);
        }
        return;
      }

      if (url.pathname === "/api/projects" && request.method === "GET") {
        sendJson(response, 200, store.snapshot().projects.map(summarizeProject));
        return;
      }

      if (url.pathname === "/api/projects" && request.method === "POST") {
        const body = await readJson(request);
        if (!body.title || !body.goal) {
          sendError(response, 400, "项目名称和目标不能为空");
          return;
        }
        const project = createProject({
          title: String(body.title).trim(),
          goal: String(body.goal).trim(),
          subtitle: body.subtitle || "总管正在分析目标并准备拆解任务。",
          dueLabel: body.dueLabel || "等待排期",
          team: body.team || "开发团队",
          activeIndex: 0,
        });
        if (body.flowTemplateId) {
          const data = store.snapshot();
          const template = findFlowTemplate(data, body.flowTemplateId);
          if (!template) {
            sendError(response, 400, "指定的流程模板不存在");
            return;
          }
          bindProjectFlow(project, template);
        }
        store.update((data) => {
          data.projects.unshift(project);
          store.audit("project.create", `创建项目：${project.title}`, {
            projectId: project.id,
            flowTemplateId: project.flowTemplateId || null,
          });
          return project;
        });
        sendJson(response, 201, project);
        return;
      }

      if (segments[1] === "projects" && segments[2]) {
        const projectId = segments[2];

        if (segments.length === 3 && request.method === "GET") {
          const project = findProject(store.snapshot(), projectId);
          if (!project) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, project);
          return;
        }

        if (segments[3] === "work-items" && segments.length === 4 && request.method === "GET") {
          if (!findProject(store.snapshot(), projectId)) {
            sendError(response, 404, "项目不存在");
            return;
          }
          const data = snapshotWithLegacyWorkItems(store, projectId);
          sendJson(response, 200, {
            data: filterWorkItems(data, { ...Object.fromEntries(url.searchParams), projectId }).map((item) => decorateWorkItem(data, item)),
          });
          return;
        }

        if (segments[3] === "work-items" && segments.length === 4 && request.method === "POST") {
          const body = await readJson(request);
          try {
            const item = store.update((data) => {
              const created = createWorkItem(data, { ...body, projectId }, { actor: { type: "user", name: "Local User" } });
              store.audit("workitem.create", `创建项目工作项：${created.title}`, {
                workItemId: created.id,
                projectId: created.projectId,
                sourceType: created.sourceType,
              });
              return created;
            });
            sendJson(response, 201, { data: item });
          } catch (error) {
            sendDomainError(response, error);
          }
          return;
        }

        if (segments[3] === "board-summary" && segments.length === 4 && request.method === "GET") {
          if (!findProject(store.snapshot(), projectId)) {
            sendError(response, 404, "项目不存在");
            return;
          }
          const data = snapshotWithLegacyWorkItems(store, projectId);
          sendJson(response, 200, { data: buildProgressDashboard(data, { projectId }) });
          return;
        }

        if (segments[3] === "workflow" && segments.length === 4 && request.method === "GET") {
          const project = findProject(store.snapshot(), projectId);
          if (!project) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, workflowPayload(project));
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "agent-route" && request.method === "GET") {
          const project = findProject(store.snapshot(), projectId);
          if (!project) {
            sendError(response, 404, "项目不存在");
            return;
          }
          try {
            const data = store.snapshot();
            const tools = createAdapterDirectory({
              localTools: await executionManager.listTools(),
              adapterConfigs: data.agentAdapters,
            });
            sendJson(response, 200, resolveAgentRoute({
              project,
              stageKey: segments[4],
              tools,
              requestedAgentId: url.searchParams.get("agentId"),
            }));
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "receipts" && request.method === "POST") {
          const body = await readJson(request);
          try {
            const result = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const receiptResult = submitStageReceipt(project, { ...body, stageKey: segments[4] });
              store.audit("workflow.receipt", `阶段回执：${receiptResult.stage.title}`, {
                projectId,
                stageKey: receiptResult.stage.key,
                receiptId: receiptResult.receipt.id,
                status: receiptResult.receipt.status,
              });
              return receiptResult;
            });
            if (!result) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 201, result);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "alice" && segments[6] === "preview" && request.method === "POST") {
          const body = await readJson(request);
          try {
            sendJson(response, 201, aliceCoordinator.preview({ projectId, stageKey: segments[4], note: body.note }));
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] && segments[7] === "receipts" && request.method === "POST") {
          const body = await readJson(request);
          try {
            const result = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const agent = data.agents.find((item) => item.id === segments[6]);
              const receiptResult = submitStageReceipt(project, {
                ...body,
                stageKey: segments[4],
                agentId: segments[6],
                agentName: body.agentName || agent?.name || segments[6],
                agentType: body.agentType || agent?.type || "local",
                source: body.source || segments[6],
              });
              store.audit("agent.receipt", `Agent 回执：${receiptResult.stage.title}`, {
                projectId,
                stageKey: receiptResult.stage.key,
                agentId: segments[6],
                receiptId: receiptResult.receipt.id,
              });
              return receiptResult;
            });
            if (!result) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 201, result);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] === "alice" && segments[7] === "sync" && request.method === "POST") {
          const body = await readJson(request);
          try {
            sendJson(response, 201, await aliceCoordinator.sync({
              projectId,
              stageKey: segments[4],
              sessionId: body.sessionId,
              confirm: body.confirm,
            }));
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "agents" && segments[6] === "alice" && segments[7] === "sessions" && request.method === "GET") {
          try {
            sendJson(response, 200, await aliceCoordinator.sessions({
              projectId,
              stageKey: segments[4],
            }));
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "deliverables" && request.method === "POST") {
          const body = await readJson(request);
          try {
            const asset = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const created = addStageDeliverable(project, { ...body, stageKey: segments[4] });
              store.audit("workflow.deliverable.create", `添加阶段交付物：${created.name}`, {
                projectId,
                stageKey: segments[4],
                assetId: created.id,
              });
              return created;
            });
            if (!asset) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 201, asset);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "stages" && segments[4] && segments[5] === "return" && request.method === "POST") {
          const body = await readJson(request);
          if (body.confirm !== true) {
            sendError(response, 400, "退回返工需要明确确认");
            return;
          }
          try {
            const result = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const returned = returnStageForRevision(project, {
                fromStageKey: segments[4],
                targetStageKey: body.targetStageKey,
                reason: body.reason,
              });
              store.audit("workflow.return", `退回返工：${returned.targetStage.title}`, {
                projectId,
                fromStageKey: segments[4],
                targetStageKey: returned.targetStage.key,
              });
              return returned;
            });
            if (!result) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 200, result);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments.length === 3 && request.method === "PATCH") {
          const body = await readJson(request);
          const project = store.update((data) => {
            const target = findProject(data, projectId);
            if (!target) return null;
            for (const field of ["title", "subtitle", "goal", "dueLabel", "team"]) {
              if (typeof body[field] === "string") target[field] = body[field].trim();
            }
            target.updatedAt = new Date().toISOString();
            store.audit("project.update", `更新项目：${target.title}`, { projectId });
            return target;
          });
          if (!project) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, project);
          return;
        }

        if (segments.length === 3 && request.method === "DELETE") {
          const body = await readJson(request);
          if (body.confirm !== true) {
            sendError(response, 400, "删除项目需要明确确认");
            return;
          }
          const project = store.update((data) => {
            if (data.projects.length <= 1) return { lastProject: true };
            const index = data.projects.findIndex((item) => item.id === projectId);
            if (index === -1) return null;
            const [deleted] = data.projects.splice(index, 1);
            store.audit("project.delete", `删除项目：${deleted.title}`, { projectId });
            return deleted;
          });
          if (!project) {
            sendError(response, 404, "项目不存在");
            return;
          }
          if (project.lastProject) {
            sendError(response, 400, "至少保留一个项目");
            return;
          }
          sendJson(response, 200, project);
          return;
        }

        if (segments[3] === "assets" && segments.length === 4 && request.method === "POST") {
          const body = await readJson(request);
          const name = String(body.name || "").trim();
          if (!name) {
            sendError(response, 400, "资料名称不能为空");
            return;
          }
          try {
            const asset = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const stageKey = String(body.stageKey || "").trim();
              const created = stageKey
                ? addStageDeliverable(project, { ...body, stageKey })
                : {
                    id: randomUUID(),
                    stageKey: null,
                    type: String(body.type || "FILE").trim().slice(0, 12).toUpperCase() || "FILE",
                    name: name.slice(0, 160),
                    url: String(body.url || "").trim().slice(0, 1000),
                    createdAt: new Date().toISOString(),
                  };
              if (!stageKey) {
                project.assets = project.assets || [];
                project.assets.push(created);
              }
              project.updatedAt = created.createdAt;
              store.audit("asset.create", `添加项目资料：${created.name}`, { projectId, assetId: created.id });
              return created;
            });
            if (!asset) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 201, asset);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        if (segments[3] === "assets" && segments[4] && request.method === "DELETE") {
          const asset = store.update((data) => {
            const project = findProject(data, projectId);
            if (!project) return null;
            const index = (project.assets || []).findIndex((item) => item.id === segments[4]);
            if (index === -1) return { missingAsset: true };
            const [deleted] = project.assets.splice(index, 1);
            for (const stage of project.stages) {
              stage.deliverableIds = (stage.deliverableIds || []).filter((assetId) => assetId !== deleted.id);
            }
            project.updatedAt = new Date().toISOString();
            store.audit("asset.delete", `删除项目资料：${deleted.name}`, { projectId, assetId: deleted.id });
            return deleted;
          });
          if (!asset) {
            sendError(response, 404, "项目不存在");
            return;
          }
          if (asset.missingAsset) {
            sendError(response, 404, "项目资料不存在");
            return;
          }
          sendJson(response, 200, asset);
          return;
        }

        if (segments[3] === "messages" && request.method === "POST") {
          const body = await readJson(request);
          if (!String(body.text || "").trim()) {
            sendError(response, 400, "消息不能为空");
            return;
          }
          const message = store.update((data) => {
            const project = findProject(data, projectId);
            if (!project) return null;
            const created = addMessage(project, {
              authorId: "local-user",
              authorName: "你",
              authorType: "user",
              text: String(body.text).trim(),
            });
            store.audit("message.create", `项目消息：${project.title}`, { projectId });
            return created;
          });
          if (!message) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 201, message);
          return;
        }

        if (segments[3] === "advance" && request.method === "POST") {
          const result = store.update((data) => {
            const project = findProject(data, projectId);
            if (!project) return null;
            const advanced = advanceProject(project);
            store.audit("project.advance", `推进项目：${project.title}`, { projectId });
            return advanced;
          });
          if (!result) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, result);
          return;
        }

        if (segments[3] === "checkpoints" && segments[4] && request.method === "POST") {
          const body = await readJson(request);
          try {
            const result = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const resolved = resolveCheckpoint(project, {
                checkpointId: segments[4],
                action: body.action,
                note: body.note,
              });
              if (resolved.missingCheckpoint) return resolved;
              store.audit("checkpoint.resolve", `处理验收点：${project.title}`, {
                projectId,
                checkpointId: resolved.checkpoint.id,
                status: resolved.checkpoint.status,
              });
              return resolved;
            });
            if (!result) {
              sendError(response, 404, "项目不存在");
              return;
            }
            if (result.missingCheckpoint) {
              sendError(response, 404, "验收点不存在");
              return;
            }
            sendJson(response, 200, result);
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }

        // POST /api/projects/:id/flow  绑定/更换流程模板
        if (segments[3] === "flow" && segments.length === 4 && request.method === "POST") {
          const body = await readJson(request);
          const data = store.snapshot();
          const template = findFlowTemplate(data, body.flowTemplateId);
          if (!template) {
            sendError(response, 400, "指定的流程模板不存在");
            return;
          }
          const result = store.update((data) => {
            const project = findProject(data, projectId);
            if (!project) return null;
            const rebind = Boolean(project.flowTemplateId);
            bindProjectFlow(project, findFlowTemplate(data, body.flowTemplateId));
            store.audit(rebind ? "project.flow.rebind" : "project.flow.bind", `项目绑定流程：${project.title} → ${template.name}`, {
              projectId,
              flowTemplateId: template.id,
            });
            return project;
          });
          if (!result) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, result);
          return;
        }

        // DELETE /api/projects/:id/flow  解绑流程模板
        if (segments[3] === "flow" && segments.length === 4 && request.method === "DELETE") {
          const result = store.update((data) => {
            const project = findProject(data, projectId);
            if (!project) return null;
            unbindProjectFlow(project);
            store.audit("project.flow.unbind", `项目解绑流程：${project.title}`, { projectId });
            return project;
          });
          if (!result) {
            sendError(response, 404, "项目不存在");
            return;
          }
          sendJson(response, 200, result);
          return;
        }

        // POST /api/projects/:id/flow/stages/:stageId/review  关口评审
        if (segments[3] === "flow" && segments[4] === "stages" && segments[5] && segments[6] === "review" && request.method === "POST") {
          const body = await readJson(request);
          try {
            const result = store.update((data) => {
              const project = findProject(data, projectId);
              if (!project) return null;
              const reviewed = reviewGate(project, {
                flowStageId: segments[5],
                action: body.action,
                reviewer: body.reviewer,
                reviewerType: body.reviewerType,
                comment: body.comment,
                targetStageId: body.targetStageId,
              });
              store.audit("project.flow.review", `关口评审：${project.title} / ${reviewed.stage.name} → ${body.action}`, {
                projectId,
                flowStageId: segments[5],
                action: body.action,
              });
              return reviewed;
            });
            if (!result) {
              sendError(response, 404, "项目不存在");
              return;
            }
            sendJson(response, 200, { stage: result.stage, review: result.review, currentFlowStageId: result.currentFlowStageId, completed: result.completed });
          } catch (error) {
            sendError(response, 400, error.message);
          }
          return;
        }
      }

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

      // GET /api/skills
      if (url.pathname === "/api/skills" && request.method === "GET") {
        const data = store.snapshot();
        let result = data.skills;
        const category = url.searchParams.get("category");
        const search = url.searchParams.get("search");
        if (category) result = result.filter((s) => s.category === category);
        if (search) {
          const q = search.toLowerCase();
          result = result.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            (s.tags || []).some((t) => t.toLowerCase().includes(q))
          );
        }
        sendJson(response, 200, { data: result });
        return;
      }

      // POST /api/skills
      if (url.pathname === "/api/skills" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        if (!name) {
          sendError(response, 400, "Skill 名称不能为空");
          return;
        }
        const data = store.snapshot();
        if (data.skills.some((s) => s.name === name)) {
          sendError(response, 409, "同名 Skill 已存在");
          return;
        }
        const now = new Date().toISOString();
        const newSkill = {
          id: randomUUID(),
          name,
          description: String(body.description || "").trim(),
          category: body.category || "general",
          level: Number(body.level) || 1,
          source: body.source || "org_practice",
          tags: Array.isArray(body.tags) ? body.tags : [],
          applicableFlows: Array.isArray(body.applicableFlows) ? body.applicableFlows : [],
          riskBoundary: String(body.riskBoundary || "").trim(),
          evidence: Array.isArray(body.evidence) ? body.evidence : [],
          createdAt: now,
          updatedAt: now,
        };
        store.update((data) => {
          data.skills.push(newSkill);
          store.audit("skill.create", `创建 Skill：${newSkill.name}`, { skillId: newSkill.id });
          return newSkill;
        });
        sendJson(response, 201, { data: newSkill });
        return;
      }

      // GET /api/skills/:id
      if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "GET") {
        const skill = findSkill(store.snapshot(), segments[2]);
        if (!skill) {
          sendError(response, 404, "Skill 不存在");
          return;
        }
        sendJson(response, 200, { data: skill });
        return;
      }

      // PATCH /api/skills/:id
      if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "PATCH") {
        const body = await readJson(request);
        const skillId = segments[2];
        const updated = store.update((data) => {
          const skill = findSkill(data, skillId);
          if (!skill) return null;
          if (body.name !== undefined) {
            const newName = String(body.name).trim();
            if (newName && newName !== skill.name) {
              const referencingRoles = skillsReferencingRoles(data, skill.id);
              if (referencingRoles.length > 0) {
                return { _error: "Skill 被岗位引用，不可修改名称", _statusCode: 409 };
              }
              if (data.skills.some((s) => s.id !== skill.id && s.name === newName)) {
                return { _error: "Skill 名称已被其他 Skill 使用", _statusCode: 409 };
              }
              skill.name = newName;
            }
          }
          if (body.description !== undefined) skill.description = String(body.description).trim();
          if (body.category !== undefined) skill.category = body.category;
          if (body.level !== undefined) skill.level = Number(body.level) || skill.level;
          if (body.source !== undefined) skill.source = body.source;
          if (body.tags !== undefined) skill.tags = Array.isArray(body.tags) ? body.tags : skill.tags;
          if (body.applicableFlows !== undefined) skill.applicableFlows = Array.isArray(body.applicableFlows) ? body.applicableFlows : skill.applicableFlows;
          if (body.riskBoundary !== undefined) skill.riskBoundary = String(body.riskBoundary).trim();
          if (body.evidence !== undefined) skill.evidence = Array.isArray(body.evidence) ? body.evidence : skill.evidence;
          skill.updatedAt = new Date().toISOString();
          store.audit("skill.update", `更新 Skill：${skill.name}`, { skillId: skill.id });
          return skill;
        });
        if (!updated) {
          sendError(response, 404, "Skill 不存在");
          return;
        }
        if (updated._error) {
          sendError(response, updated._statusCode || 409, updated._error);
          return;
        }
        sendJson(response, 200, { data: updated });
        return;
      }

      // DELETE /api/skills/:id
      if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "DELETE") {
        const skillId = segments[2];
        const data = store.snapshot();
        const skill = findSkill(data, skillId);
        if (!skill) {
          sendError(response, 404, "Skill 不存在");
          return;
        }
        const referencingRoles = skillsReferencingRoles(data, skillId);
        if (referencingRoles.length > 0) {
          sendJson(response, 409, { error: "Skill 被以下岗位引用", referencingRoles });
          return;
        }
        store.update((data) => {
          const index = data.skills.findIndex((s) => s.id === skillId);
          if (index !== -1) data.skills.splice(index, 1);
          store.audit("skill.delete", `删除 Skill：${skill.name}`, { skillId });
          return { deleted: true };
        });
        sendJson(response, 200, { data: { deleted: true } });
        return;
      }

      // GET /api/roles
      if (url.pathname === "/api/roles" && request.method === "GET") {
        const data = store.snapshot();
        let result = data.roles;
        const family = url.searchParams.get("family");
        const type = url.searchParams.get("type");
        if (family) result = result.filter((r) => r.family === family);
        if (type) result = result.filter((r) => r.type === type);
        sendJson(response, 200, { data: result });
        return;
      }

      // POST /api/roles
      if (url.pathname === "/api/roles" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        if (!name) {
          sendError(response, 400, "岗位名称不能为空");
          return;
        }
        const data = store.snapshot();
        if (data.roles.some((r) => r.name === name)) {
          sendError(response, 409, "同名岗位已存在");
          return;
        }
        const validSkillIds = Array.isArray(body.skillIds)
          ? body.skillIds.filter((id) => data.skills.some((s) => s.id === id))
          : [];
        const now = new Date().toISOString();
        const newRole = {
          id: randomUUID(),
          name,
          description: String(body.description || "").trim(),
          family: String(body.family || "").trim(),
          type: body.type || "hybrid",
          isDefault: false,
          responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : [],
          skillIds: validSkillIds,
          skillLevelOverrides: body.skillLevelOverrides && typeof body.skillLevelOverrides === "object" ? body.skillLevelOverrides : {},
          permissions: body.permissions && typeof body.permissions === "object" ? body.permissions : {},
          acceptanceCriteria: String(body.acceptanceCriteria || "").trim(),
          flowNotes: String(body.flowNotes || "").trim(),
          flowMatrix: [],
          carbonSiliconRatio: body.carbonSiliconRatio && typeof body.carbonSiliconRatio === "object"
            ? body.carbonSiliconRatio
            : { carbon: 0, silicon: 0, hybrid: 0 },
          createdAt: now,
          updatedAt: now,
        };
        store.update((data) => {
          data.roles.push(newRole);
          store.audit("role.create", `创建岗位：${newRole.name}`, { roleId: newRole.id });
          return newRole;
        });
        sendJson(response, 201, { data: newRole });
        return;
      }

      // GET /api/roles/:id
      if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "GET") {
        const role = findRole(store.snapshot(), segments[2]);
        if (!role) {
          sendError(response, 404, "岗位不存在");
          return;
        }
        sendJson(response, 200, { data: role });
        return;
      }

      // PATCH /api/roles/:id
      if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "PATCH") {
        const body = await readJson(request);
        const roleId = segments[2];
        const updated = store.update((data) => {
          const role = findRole(data, roleId);
          if (!role) return null;
          if (body.name !== undefined) {
            const newName = String(body.name).trim();
            if (newName && newName !== role.name) {
              const referencingEmployees = rolesReferencingEmployees(data, roleId);
              if (referencingEmployees.length > 0) {
                return { _error: "岗位被员工绑定，不可修改名称", _statusCode: 409 };
              }
              if (data.roles.some((r) => r.id !== roleId && r.name === newName)) {
                return { _error: "岗位名称已被其他岗位使用", _statusCode: 409 };
              }
              role.name = newName;
            }
          }
          if (body.description !== undefined) role.description = String(body.description).trim();
          if (body.family !== undefined) role.family = String(body.family).trim();
          if (body.type !== undefined) role.type = body.type;
          if (body.responsibilities !== undefined) role.responsibilities = Array.isArray(body.responsibilities) ? body.responsibilities : role.responsibilities;
          if (body.skillIds !== undefined) {
            const validSkillIds = Array.isArray(body.skillIds)
              ? body.skillIds.filter((id) => data.skills.some((s) => s.id === id))
              : role.skillIds;
            const oldSkillIds = new Set(role.skillIds || []);
            const hasNewSkills = validSkillIds.some((id) => !oldSkillIds.has(id));
            role.skillIds = validSkillIds;
            if (hasNewSkills) {
              for (const emp of data.employees) {
                if ((emp.roleIds || []).includes(roleId) &&
                    (emp.type === "silicon" || emp.type === "hybrid") &&
                    emp.digitalEmployeeDraft) {
                  emp.digitalEmployeeDraft.needsRematch = true;
                  emp.updatedAt = new Date().toISOString();
                }
              }
            }
          }
          if (body.skillLevelOverrides !== undefined) role.skillLevelOverrides = typeof body.skillLevelOverrides === "object" ? body.skillLevelOverrides : role.skillLevelOverrides;
          if (body.permissions !== undefined) role.permissions = typeof body.permissions === "object" ? body.permissions : role.permissions;
          if (body.acceptanceCriteria !== undefined) role.acceptanceCriteria = String(body.acceptanceCriteria).trim();
          if (body.flowNotes !== undefined) role.flowNotes = String(body.flowNotes).trim();
          if (body.carbonSiliconRatio !== undefined) role.carbonSiliconRatio = typeof body.carbonSiliconRatio === "object" ? body.carbonSiliconRatio : role.carbonSiliconRatio;
          role.updatedAt = new Date().toISOString();
          store.audit("role.update", `更新岗位：${role.name}`, { roleId: role.id });
          return role;
        });
        if (!updated) {
          sendError(response, 404, "岗位不存在");
          return;
        }
        if (updated._error) {
          sendError(response, updated._statusCode || 409, updated._error);
          return;
        }
        sendJson(response, 200, { data: updated });
        return;
      }

      // DELETE /api/roles/:id
      if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "DELETE") {
        const roleId = segments[2];
        const data = store.snapshot();
        const role = findRole(data, roleId);
        if (!role) {
          sendError(response, 404, "岗位不存在");
          return;
        }
        if (role.isDefault) {
          sendError(response, 403, "系统预设岗位不可删除，仅可隐藏");
          return;
        }
        const referencingEmployees = rolesReferencingEmployees(data, roleId);
        if (referencingEmployees.length > 0) {
          sendJson(response, 409, { error: "岗位被以下员工绑定", referencingEmployees });
          return;
        }
        store.update((data) => {
          const index = data.roles.findIndex((r) => r.id === roleId);
          if (index !== -1) data.roles.splice(index, 1);
          store.audit("role.delete", `删除岗位：${role.name}`, { roleId });
          return { deleted: true };
        });
        sendJson(response, 200, { data: { deleted: true } });
        return;
      }

      // GET /api/employees
      if (url.pathname === "/api/employees" && request.method === "GET") {
        const data = store.snapshot();
        const statusParam = url.searchParams.get("status");
        const typeParam = url.searchParams.get("type");
        let employees = statusParam
          ? data.employees.filter((e) => e.status === statusParam)
          : data.employees.filter((e) => e.status !== "inactive");
        if (typeParam) employees = employees.filter((e) => e.type === typeParam);
        sendJson(response, 200, { data: employees });
        return;
      }

      // POST /api/employees
      if (url.pathname === "/api/employees" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        if (!name) {
          sendError(response, 400, "员工姓名不能为空");
          return;
        }
        const empType = body.type || "carbon";
        const data = store.snapshot();
        if (empType === "silicon" || empType === "hybrid") {
          if (!body.agentId) {
            sendError(response, 400, "硅基员工必须关联已有 Agent");
            return;
          }
          if (!data.agents.some((a) => a.id === body.agentId)) {
            sendError(response, 400, "硅基员工必须关联已有 Agent");
            return;
          }
        }
        if (empType === "carbon" && body.agentId) {
          sendError(response, 400, "碳基员工不能关联 Agent");
          return;
        }
        if (body.adapterId) {
          if (!Object.prototype.hasOwnProperty.call(data.agentAdapters, body.adapterId)) {
            sendError(response, 400, "指定的适配器不存在");
            return;
          }
        }
        const validRoleIds = Array.isArray(body.roleIds)
          ? body.roleIds.filter((id) => data.roles.some((r) => r.id === id))
          : [];
        const now = new Date().toISOString();
        const newEmployee = {
          id: randomUUID(),
          name,
          type: empType,
          roleIds: validRoleIds,
          status: "active",
          agentId: (empType === "silicon" || empType === "hybrid") ? (body.agentId || null) : null,
          adapterId: (empType === "silicon" || empType === "hybrid") ? (body.adapterId || null) : null,
          digitalEmployeeDraft: (empType === "silicon" || empType === "hybrid")
            ? { status: "empty", targetRoleId: null, skillMatching: null, onboarding: null, mentorship: null }
            : null,
          createdAt: now,
          updatedAt: now,
        };
        store.update((data) => {
          data.employees.push(newEmployee);
          store.audit("employee.create", `创建员工：${newEmployee.name}`, { employeeId: newEmployee.id, type: empType });
          return newEmployee;
        });
        sendJson(response, 201, { data: newEmployee });
        return;
      }

      // GET /api/employees/:id
      if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "GET") {
        const employee = findEmployee(store.snapshot(), segments[2]);
        if (!employee) {
          sendError(response, 404, "员工不存在");
          return;
        }
        sendJson(response, 200, { data: employee });
        return;
      }

      // PATCH /api/employees/:id
      if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "PATCH") {
        const body = await readJson(request);
        const employeeId = segments[2];
        const updated = store.update((data) => {
          const employee = findEmployee(data, employeeId);
          if (!employee) return null;
          if (body.name !== undefined) employee.name = String(body.name).trim();
          if (body.roleIds !== undefined) {
            employee.roleIds = Array.isArray(body.roleIds)
              ? body.roleIds.filter((id) => data.roles.some((r) => r.id === id))
              : employee.roleIds;
          }
          if (body.status !== undefined) employee.status = body.status;
          if (body.digitalEmployeeDraft !== undefined && employee.digitalEmployeeDraft) {
            const newDraft = body.digitalEmployeeDraft;
            if (newDraft.status && newDraft.status !== employee.digitalEmployeeDraft.status) {
              const transitionError = validateDraftTransition(employee.digitalEmployeeDraft.status, newDraft.status);
              if (transitionError) {
                return { _error: transitionError, _statusCode: 400 };
              }
            }
            if (newDraft.status !== undefined) employee.digitalEmployeeDraft.status = newDraft.status;
            if (newDraft.targetRoleId !== undefined) employee.digitalEmployeeDraft.targetRoleId = newDraft.targetRoleId;
            if (newDraft.skillMatching !== undefined) employee.digitalEmployeeDraft.skillMatching = newDraft.skillMatching;
            if (newDraft.onboarding !== undefined) employee.digitalEmployeeDraft.onboarding = newDraft.onboarding;
            if (newDraft.mentorship !== undefined) employee.digitalEmployeeDraft.mentorship = newDraft.mentorship;
            if (newDraft.needsRematch !== undefined) employee.digitalEmployeeDraft.needsRematch = newDraft.needsRematch;
          }
          employee.updatedAt = new Date().toISOString();
          store.audit("employee.update", `更新员工：${employee.name}`, { employeeId: employee.id });
          return employee;
        });
        if (!updated) {
          sendError(response, 404, "员工不存在");
          return;
        }
        if (updated._error) {
          sendError(response, updated._statusCode || 400, updated._error);
          return;
        }
        sendJson(response, 200, { data: updated });
        return;
      }

      // DELETE /api/employees/:id
      if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "DELETE") {
        const employeeId = segments[2];
        const result = store.update((data) => {
          const employee = findEmployee(data, employeeId);
          if (!employee) return null;
          employee.status = "inactive";
          employee.updatedAt = new Date().toISOString();
          store.audit("employee.delete", `软删除员工：${employee.name}`, { employeeId: employee.id });
          return { deleted: true };
        });
        if (!result) {
          sendError(response, 404, "员工不存在");
          return;
        }
        sendJson(response, 200, { data: { deleted: true } });
        return;
      }

      // GET /api/adapters
      if (url.pathname === "/api/adapters" && request.method === "GET") {
        const data = store.snapshot();
        const localTools = await executionManager.listTools();
        const technicalAdapters = createAdapterDirectory({
          localTools,
          adapterConfigs: data.agentAdapters,
        });
        sendJson(response, 200, { data: technicalAdapters });
        return;
      }

      // GET /api/org/health
      if (url.pathname === "/api/org/health" && request.method === "GET") {
        const data = store.snapshot();
        const activeEmployees = data.employees.filter((e) => e.status !== "inactive");
        const carbonCount = activeEmployees.filter((e) => e.type === "carbon").length;
        const siliconCount = activeEmployees.filter((e) => e.type === "silicon").length;
        const hybridCount = activeEmployees.filter((e) => e.type === "hybrid").length;
        const totalEmployees = carbonCount + siliconCount + hybridCount;
        const siliconEmployees = activeEmployees.filter((e) => e.type === "silicon" || e.type === "hybrid");
        const siliconWithAgent = siliconEmployees.filter((e) => e.agentId).length;
        const agentCoverageRate = siliconEmployees.length > 0 ? siliconWithAgent / siliconEmployees.length : 0;
        const familyNames = ROLE_FAMILY_DEFAULTS.map((f) => f.family);
        const existingFamilies = new Set(data.roles.map((r) => r.family));
        const emptyFamilies = familyNames.filter((f) => !existingFamilies.has(f));
        const activeEmployeeRoleIds = new Set(activeEmployees.flatMap((e) => e.roleIds || []));
        const rolesWithoutEmployees = data.roles
          .filter((r) => !activeEmployeeRoleIds.has(r.id))
          .map((r) => ({ id: r.id, name: r.name }));
        const rolesWithoutSkills = data.roles
          .filter((r) => !r.skillIds || r.skillIds.length === 0)
          .map((r) => ({ id: r.id, name: r.name }));
        const draftEmployees = activeEmployees
          .filter((e) => e.digitalEmployeeDraft &&
            e.digitalEmployeeDraft.status !== "empty" &&
            e.digitalEmployeeDraft.status !== "draft_complete")
          .map((e) => ({ id: e.id, name: e.name, draftStatus: e.digitalEmployeeDraft.status }));
        sendJson(response, 200, {
          skillCount: data.skills.length,
          roleCount: data.roles.length,
          employeeCount: { carbon: carbonCount, silicon: siliconCount, hybrid: hybridCount, total: totalEmployees },
          agentCoverageRate,
          emptyFamilies,
          rolesWithoutEmployees,
          rolesWithoutSkills,
          draftEmployees,
        });
        return;
      }

      // POST /api/org/init-defaults
      if (url.pathname === "/api/org/init-defaults" && request.method === "POST") {
        const data = store.snapshot();
        if (data.roles.some((r) => r.isDefault)) {
          sendError(response, 409, "默认模板已初始化");
          return;
        }
        const result = createDefaultOrgData(data.skills, data.roles);
        const skillsCreated = result.skills.length - data.skills.length;
        const rolesCreated = result.roles.length - data.roles.length;
        store.update((data) => {
          data.skills = result.skills;
          data.roles = result.roles;
          store.audit("org.init-defaults", `初始化默认模板：新增 ${skillsCreated} 个 Skill 和 ${rolesCreated} 个岗位`, {
            skillsCreated,
            rolesCreated,
          });
          return { skillsCreated, rolesCreated };
        });
        sendJson(response, 201, { data: { skillsCreated, rolesCreated } });
        return;
      }

      // ─── End Organization Management API ───────────────────────────

      // ─── Flow Management API ───────────────────────────────────────

      // GET /api/flows  流程库（按分类浏览/搜索）
      if (url.pathname === "/api/flows" && request.method === "GET") {
        const data = store.snapshot();
        let result = data.flowTemplates || [];
        const category = url.searchParams.get("category");
        const search = url.searchParams.get("search");
        if (category) result = result.filter((t) => t.category === category);
        if (search) {
          const q = search.toLowerCase();
          result = result.filter((t) =>
            t.name.toLowerCase().includes(q) ||
            (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
          );
        }
        const usage = {};
        for (const project of data.projects) {
          if (project.flowTemplateId) usage[project.flowTemplateId] = (usage[project.flowTemplateId] || 0) + 1;
        }
        sendJson(response, 200, {
          data: result.map((template) => ({
            ...template,
            stageCount: template.stages.length,
            usageCount: usage[template.id] || 0,
          })),
        });
        return;
      }

      // POST /api/flows  新建流程模板
      if (url.pathname === "/api/flows" && request.method === "POST") {
        const body = await readJson(request);
        const data = store.snapshot();
        if (body.name && data.flowTemplates.some((t) => t.name === String(body.name).trim())) {
          sendError(response, 409, "同名流程模板已存在");
          return;
        }
        let template;
        try {
          template = createFlowTemplate(body, { validRoleIds: validRoleIdSet(data) });
        } catch (error) {
          sendError(response, 400, error.message);
          return;
        }
        store.update((data) => {
          data.flowTemplates.push(template);
          store.audit("flow.create", `创建流程模板：${template.name}`, { flowTemplateId: template.id });
          return template;
        });
        sendJson(response, 201, { data: template });
        return;
      }

      // POST /api/flows/init-presets  初始化预设模板（LTC/IPD/ITR 轻量版）
      if (url.pathname === "/api/flows/init-presets" && request.method === "POST") {
        const data = store.snapshot();
        const existingPresetKeys = new Set((data.flowTemplates || []).filter((t) => t.presetKey).map((t) => t.presetKey));
        const presets = presetFlowTemplates().filter((t) => !existingPresetKeys.has(t.presetKey));
        if (presets.length === 0) {
          sendError(response, 409, "预设流程模板已初始化");
          return;
        }
        store.update((data) => {
          data.flowTemplates.push(...presets);
          store.audit("flow.init-presets", `初始化预设流程模板：新增 ${presets.length} 条`, { count: presets.length });
          return presets;
        });
        sendJson(response, 201, { data: { created: presets.length, templates: presets } });
        return;
      }

      // GET /api/flows/:id
      if (segments[1] === "flows" && segments[2] && !segments[3] && request.method === "GET") {
        const template = findFlowTemplate(store.snapshot(), segments[2]);
        if (!template) {
          sendError(response, 404, "流程模板不存在");
          return;
        }
        sendJson(response, 200, { data: template });
        return;
      }

      // PATCH /api/flows/:id
      if (segments[1] === "flows" && segments[2] && !segments[3] && request.method === "PATCH") {
        const body = await readJson(request);
        const flowId = segments[2];
        const data = store.snapshot();
        if (body.name !== undefined) {
          const newName = String(body.name).trim();
          if (newName && data.flowTemplates.some((t) => t.id !== flowId && t.name === newName)) {
            sendError(response, 409, "流程模板名称已被其他模板使用");
            return;
          }
        }
        let updateError = null;
        const updated = store.update((data) => {
          const template = findFlowTemplate(data, flowId);
          if (!template) return null;
          try {
            applyFlowTemplatePatch(template, body, { validRoleIds: validRoleIdSet(data) });
          } catch (error) {
            updateError = error.message;
            return template;
          }
          store.audit("flow.update", `更新流程模板：${template.name}`, { flowTemplateId: template.id });
          return template;
        });
        if (!updated) {
          sendError(response, 404, "流程模板不存在");
          return;
        }
        if (updateError) {
          sendError(response, 400, updateError);
          return;
        }
        sendJson(response, 200, { data: updated });
        return;
      }

      // DELETE /api/flows/:id  删除前检查是否被项目引用
      if (segments[1] === "flows" && segments[2] && !segments[3] && request.method === "DELETE") {
        const flowId = segments[2];
        const data = store.snapshot();
        const template = findFlowTemplate(data, flowId);
        if (!template) {
          sendError(response, 404, "流程模板不存在");
          return;
        }
        const referencingProjects = projectsReferencingFlow(data, flowId);
        if (referencingProjects.length > 0) {
          sendJson(response, 409, { error: "流程模板正在被以下项目使用", referencingProjects });
          return;
        }
        store.update((data) => {
          const index = data.flowTemplates.findIndex((t) => t.id === flowId);
          if (index !== -1) data.flowTemplates.splice(index, 1);
          store.audit("flow.delete", `删除流程模板：${template.name}`, { flowTemplateId: flowId });
          return { deleted: true };
        });
        sendJson(response, 200, { data: { deleted: true } });
        return;
      }

      // GET /api/projects/:id/flow  项目流程进度（实例追踪）
      if (segments[1] === "projects" && segments[2] && segments[3] === "flow" && segments[4] === "progress" && request.method === "GET") {
        const project = findProject(store.snapshot(), segments[2]);
        if (!project) {
          sendError(response, 404, "项目不存在");
          return;
        }
        sendJson(response, 200, { data: { ...flowProgress(project), flowStages: project.flowStages || [] } });
        return;
      }

      // ─── End Flow Management API ────────────────────────────────────

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

      sendError(response, 404, "接口不存在");
    } catch (error) {
      sendError(response, 500, error.message || "服务异常");
    }
  };
}

function createNomosServer({
  dataDir,
  rendererDir = path.join(__dirname, "..", "renderer"),
  host = "127.0.0.1",
  port = 0,
  executionManagerOptions = {},
  aliceCoordinatorOptions = {},
  deploymentManagerOptions = {},
}) {
  const store = new JsonStore({ dataDir });
  store.load();
  const executionManager = new ExecutionManager({ store, ...executionManagerOptions });
  const aliceCoordinator = new AliceCoordinator({ store, ...aliceCoordinatorOptions });
  const deploymentManager = new DeploymentManager({ store, executionManager, ...deploymentManagerOptions });
  const server = http.createServer(createRequestHandler({ store, rendererDir, executionManager, aliceCoordinator, deploymentManager }));

  return {
    store,
    executionManager,
    aliceCoordinator,
    deploymentManager,
    start() {
      return new Promise((resolve, reject) => {
        const listen = () => server.listen(port, host, () => {
          const address = server.address();
          if (port === 0 && FETCH_BLOCKED_PORTS.has(address.port)) {
            server.close(listen);
            return;
          }
          server.removeListener("error", reject);
          resolve({
            host,
            port: address.port,
            url: `http://${host}:${address.port}`,
          });
        });
        server.once("error", reject);
        listen();
      });
    },
    async stop() {
      await executionManager.shutdown();
      return new Promise((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

module.exports = { createNomosServer };
