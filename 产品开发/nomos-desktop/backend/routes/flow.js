const {
  createFlowTemplate,
  findFlowTemplate,
  updateFlowTemplate,
  deleteFlowTemplate,
  cloneFlowTemplate,
  createFlowInstance,
  findFlowInstance,
  findInstanceByProject,
  advanceFlowInstance,
  reviewGate,
  returnStage,
  submitStageReceipt,
} = require("../flow-api");
const { sendJson, sendError, readJson } = require("../utils");

module.exports = async function handleFlow(request, response, url, segments, store) {
  // GET /api/flow-templates
  if (url.pathname === "/api/flow-templates" && request.method === "GET") {
    const data = store.snapshot();
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    let result = data.flowTemplates;
    if (category) result = result.filter((t) => t.category === category);
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(term) || (t.description || "").toLowerCase().includes(term));
    }
    sendJson(response, 200, { data: result });
    return true;
  }

  // POST /api/flow-templates
  if (url.pathname === "/api/flow-templates" && request.method === "POST") {
    const body = await readJson(request);
    try {
      const template = store.update((data) => {
        const result = createFlowTemplate(data, body);
        store.audit("flow-template.create", `创建流程模板：${result.name}`, { templateId: result.id });
        return result;
      });
      sendJson(response, 201, { data: template });
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return true;
  }

  // GET /api/flow-templates/:id
  if (segments[0] === "api" && segments[1] === "flow-templates" && segments.length === 3 && request.method === "GET") {
    const data = store.snapshot();
    const template = findFlowTemplate(data, segments[2]);
    if (!template) { sendError(response, 404, "流程模板不存在"); return true; }
    sendJson(response, 200, { data: template });
    return true;
  }

  // PATCH /api/flow-templates/:id
  if (segments[0] === "api" && segments[1] === "flow-templates" && segments.length === 3 && request.method === "PATCH") {
    const body = await readJson(request);
    try {
      const result = store.update((data) => {
        const template = updateFlowTemplate(data, segments[2], body);
        if (!template) return { _missing: true };
        store.audit("flow-template.update", `更新流程模板：${template.name}`, { templateId: template.id });
        return template;
      });
      if (result?._missing) { sendError(response, 404, "流程模板不存在"); return true; }
      sendJson(response, 200, { data: result });
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return true;
  }

  // DELETE /api/flow-templates/:id
  if (segments[0] === "api" && segments[1] === "flow-templates" && segments.length === 3 && request.method === "DELETE") {
    try {
      const success = store.update((data) => {
        const result = deleteFlowTemplate(data, segments[2]);
        if (result) store.audit("flow-template.delete", `删除流程模板`, { templateId: segments[2] });
        return result;
      });
      if (!success) { sendError(response, 400, "无法删除已绑定项目的流程模板"); return true; }
      sendJson(response, 204, null);
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return true;
  }

  // POST /api/flow-templates/:id/clone
  if (segments[0] === "api" && segments[1] === "flow-templates" && segments.length === 4 && segments[3] === "clone" && request.method === "POST") {
    const cloned = store.update((data) => cloneFlowTemplate(data, segments[2]));
    if (!cloned) { sendError(response, 404, "流程模板不存在"); return true; }
    store.audit("flow-template.clone", `复制流程模板：${cloned.name}`, { templateId: cloned.id });
    sendJson(response, 201, { data: cloned });
    return true;
  }

  // POST /api/flow-instances
  if (url.pathname === "/api/flow-instances" && request.method === "POST") {
    const body = await readJson(request);
    try {
      const instance = store.update((data) => createFlowInstance(data, body.projectId, body.templateId));
      store.audit("flow-instance.create", `创建流程实例`, { instanceId: instance.id });
      sendJson(response, 201, { data: instance });
    } catch (error) {
      sendError(response, 400, error.message);
    }
    return true;
  }

  // GET /api/flow-instances
  if (url.pathname === "/api/flow-instances" && request.method === "GET") {
    const data = store.snapshot();
    const projectId = url.searchParams.get("projectId");
    const status = url.searchParams.get("status");
    let result = data.flowInstances;
    if (projectId) result = result.filter((i) => i.projectId === projectId);
    if (status) result = result.filter((i) => i.status === status);
    sendJson(response, 200, { data: result });
    return true;
  }

  // GET /api/flow-instances/:id
  if (segments[0] === "api" && segments[1] === "flow-instances" && segments.length === 3 && request.method === "GET") {
    const data = store.snapshot();
    const instance = findFlowInstance(data, segments[2]);
    if (!instance) { sendError(response, 404, "流程实例不存在"); return true; }
    sendJson(response, 200, { data: instance });
    return true;
  }

  // POST /api/flow-instances/:id/advance
  if (segments[0] === "api" && segments[1] === "flow-instances" && segments.length === 4 && segments[3] === "advance" && request.method === "POST") {
    const instance = store.update((data) => advanceFlowInstance(data, segments[2]));
    if (!instance) { sendError(response, 404, "流程实例不存在或已完成"); return true; }
    sendJson(response, 200, { data: instance });
    return true;
  }

  // POST /api/flow-instances/:id/review
  if (segments[0] === "api" && segments[1] === "flow-instances" && segments.length === 4 && segments[3] === "review" && request.method === "POST") {
    const body = await readJson(request);
    const instance = store.update((data) => reviewGate(data, segments[2], body));
    if (!instance) { sendError(response, 400, "评审失败"); return true; }
    sendJson(response, 200, { data: instance });
    return true;
  }

  // POST /api/flow-instances/:id/return
  if (segments[0] === "api" && segments[1] === "flow-instances" && segments.length === 4 && segments[3] === "return" && request.method === "POST") {
    const body = await readJson(request);
    const instance = store.update((data) => returnStage(data, segments[2], body));
    if (!instance) { sendError(response, 400, "退回失败"); return true; }
    sendJson(response, 200, { data: instance });
    return true;
  }

  // POST /api/flow-instances/:id/stages/:stageId/receipts
  if (segments[0] === "api" && segments[1] === "flow-instances" && segments.length === 6 && segments[4] === "stages" && request.method === "POST") {
    const body = await readJson(request);
    const instance = store.update((data) => submitStageReceipt(data, segments[2], segments[5], body));
    if (!instance) { sendError(response, 404, "流程实例或阶段不存在"); return true; }
    sendJson(response, 200, { data: instance });
    return true;
  }

  return false;
};
