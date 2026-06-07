"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:2319";
const results = [];
let passCount = 0;
let failCount = 0;

function request(method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const options = new URL(pathname, BASE_URL);
    const req = http.request(
      { hostname: options.hostname, port: options.port, path: options.pathname + options.search, method, headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function record(name, input, expected, actual, ok, notes = "") {
  results.push({ name, input: JSON.stringify(input).slice(0, 200), expected, actual: JSON.stringify(actual).slice(0, 300), ok, notes });
  if (ok) passCount++; else failCount++;
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${notes ? " | " + notes : ""}`);
}

async function runTests() {
  console.log("\n========== Nomos v1.2 流程管理集成测试 ==========\n");

  // ── 前置：初始化默认数据 ──
  console.log("--- 前置：初始化默认组织数据 ---");
  const initRes = await request("POST", "/api/org/init-defaults", {});
  record("初始化默认数据", {}, "201 or 409", initRes.status, initRes.status === 201 || initRes.status === 409, initRes.status === 409 ? "已初始化过" : "");

  const workspace = (await request("GET", "/api/workspace")).body;
  const defaultTemplates = workspace.flowTemplates || [];
  const ltcTemplate = defaultTemplates.find(t => t.name === "LTC 轻量版");
  const deliveryTemplate = defaultTemplates.find(t => t.name === "项目交付");

  // ── 1. 流程模板列表（筛选） ──
  console.log("\n--- 1. 流程模板 API ---");

  const listAll = await request("GET", "/api/flow-templates");
  record("GET /api/flow-templates 列表", {}, "200 + data 数组", listAll.status + " " + (listAll.body.data?.length ?? "?"), listAll.status === 200 && Array.isArray(listAll.body.data));

  const listCategory = await request("GET", "/api/flow-templates?category=value_stream");
  const catOk = listCategory.status === 200 && listCategory.body.data.every(t => t.category === "value_stream");
  record("GET /api/flow-templates?category=value_stream 筛选", {}, "200 + 全为 value_stream", listCategory.status, catOk);

  const listSearch = await request("GET", "/api/flow-templates?search=ltc");
  const searchOk = listSearch.status === 200 && listSearch.body.data.some(t => /ltc/i.test(t.name));
  record("GET /api/flow-templates?search=ltc 搜索", {}, "200 + 包含 LTC", listSearch.status, searchOk);

  // ── 2. 创建模板 ──
  const newTemplateBody = {
    name: "测试模板-" + Date.now(),
    category: "value_stream",
    description: "测试用流程模板",
    stages: [
      { name: "阶段一", order: 1, description: "第一", gate: { enabled: true, entryConditions: ["a"], exitCriteria: ["b"] }, roleResponsibilities: [], inputs: [], outputs: [] },
      { name: "阶段二", order: 2, description: "第二", gate: { enabled: false }, roleResponsibilities: [], inputs: [], outputs: [] },
    ]
  };
  const createRes = await request("POST", "/api/flow-templates", newTemplateBody);
  const createdTemplate = createRes.body.data;
  record("POST /api/flow-templates 创建", newTemplateBody, "201 + data.id", createRes.status + " " + (createdTemplate?.id ?? "无"), createRes.status === 201 && createdTemplate?.id);

  // 边界：同名
  const dupRes = await request("POST", "/api/flow-templates", newTemplateBody);
  record("POST 创建同名模板", newTemplateBody, "400 同名已存在", dupRes.status + " " + dupRes.body.error, dupRes.status === 400);

  // 边界：空阶段名
  const emptyStageRes = await request("POST", "/api/flow-templates", {
    name: "空阶段测试",
    stages: [{ name: "", order: 1 }]
  });
  record("POST 空阶段名", {}, "400 阶段名称不能为空", emptyStageRes.status + " " + emptyStageRes.body.error, emptyStageRes.status === 400);

  // 边界：阶段顺序不连续
  const badOrderRes = await request("POST", "/api/flow-templates", {
    name: "顺序错误",
    stages: [{ name: "A", order: 1 }, { name: "B", order: 3 }]
  });
  record("POST 阶段顺序不连续", {}, "400 顺序错误", badOrderRes.status + " " + badOrderRes.body.error, badOrderRes.status === 400);

  // ── 3. 详情 ──
  const getRes = await request("GET", `/api/flow-templates/${createdTemplate.id}`);
  record("GET /api/flow-templates/:id 详情", {}, "200 + 数据", getRes.status + " " + getRes.body.data?.name, getRes.status === 200 && getRes.body.data?.id === createdTemplate.id);

  const get404 = await request("GET", "/api/flow-templates/non-existent");
  record("GET 不存在的模板", {}, "404", get404.status, get404.status === 404);

  // ── 4. 更新 ──
  const patchRes = await request("PATCH", `/api/flow-templates/${createdTemplate.id}`, { description: "已更新描述" });
  record("PATCH /api/flow-templates/:id 更新", { description: "已更新描述" }, "200 + 新描述", patchRes.status + " " + patchRes.body.data?.description, patchRes.status === 200 && patchRes.body.data?.description === "已更新描述");

  const patch404 = await request("PATCH", "/api/flow-templates/non-existent", { name: "x" });
  record("PATCH 不存在的模板", {}, "404", patch404.status, patch404.status === 404);

  // ── 5. 复制 ──
  const cloneRes = await request("POST", `/api/flow-templates/${createdTemplate.id}/clone`);
  const cloned = cloneRes.body.data;
  record("POST /api/flow-templates/:id/clone 复制", {}, "201 + 副本", cloneRes.status + " " + cloned?.name, cloneRes.status === 201 && cloned?.name.includes("副本"));

  const clone404 = await request("POST", "/api/flow-templates/non-existent/clone");
  record("POST clone 不存在模板", {}, "404", clone404.status, clone404.status === 404);

  // ── 6. 删除（检查绑定） ──
  // 先创建项目绑定默认模板
  const bindProjectRes = await request("POST", "/api/projects", {
    title: "绑定测试项目",
    subtitle: "测试",
    goal: "测试模板绑定",
    dueLabel: "本周",
    templateId: ltcTemplate.id,
  });
  const boundProject = bindProjectRes.body;
  record("POST /api/projects 带 templateId", { templateId: ltcTemplate.id }, "201 + flowInstanceId", bindProjectRes.status + " " + boundProject.flowInstanceId, bindProjectRes.status === 201 && boundProject.flowInstanceId);

  // 尝试删除已绑定模板
  const delBoundRes = await request("DELETE", `/api/flow-templates/${ltcTemplate.id}`);
  record("DELETE 已绑定模板", {}, "409 + _error", delBoundRes.status + " " + delBoundRes.body.error, delBoundRes.status === 409 && delBoundRes.body.error);

  // 删除未绑定的副本
  const delCloneRes = await request("DELETE", `/api/flow-templates/${cloned.id}`);
  record("DELETE 未绑定模板（副本）", {}, "200 deleted", delCloneRes.status + " " + delCloneRes.body.data?.deleted, delCloneRes.status === 200);

  const del404 = await request("DELETE", "/api/flow-templates/non-existent");
  record("DELETE 不存在的模板", {}, "404", del404.status, del404.status === 404);

  // ── 7. 流程实例 ──
  console.log("\n--- 2. 流程实例 API ---");

  // 用另一个模板创建实例（不用已绑定的那个项目）
  const standaloneProjectRes = await request("POST", "/api/projects", {
    title: "独立流程测试项目",
    subtitle: "测试",
    goal: "测试独立流程实例",
    dueLabel: "下周",
  });
  const standaloneProject = standaloneProjectRes.body;
  record("POST /api/projects 无 templateId", {}, "201 + 无 flowInstanceId", standaloneProjectRes.status + " " + (standaloneProject.flowInstanceId ?? "null"), standaloneProjectRes.status === 201 && !standaloneProject.flowInstanceId);

  // 在创建实例前，先验证无绑定项目查询
  const getPlainProjectRes = await request("GET", `/api/projects/${standaloneProject.id}`);
  record("GET 无绑定项目", {}, "200 + 无 _flowInstance", getPlainProjectRes.status + " " + (getPlainProjectRes.body._flowInstance ?? "无"), getPlainProjectRes.status === 200 && !getPlainProjectRes.body._flowInstance);

  // 创建实例
  const instanceRes = await request("POST", "/api/flow-instances", {
    projectId: standaloneProject.id,
    templateId: deliveryTemplate.id,
  });
  const instance = instanceRes.body.data;
  record("POST /api/flow-instances 创建实例", { templateId: deliveryTemplate.id }, "201 + running", instanceRes.status + " " + instance?.status, instanceRes.status === 201 && instance?.status === "running");

  // 边界：不存在的模板
  const badInstanceRes = await request("POST", "/api/flow-instances", {
    projectId: standaloneProject.id,
    templateId: "no-such-template",
  });
  record("POST 实例 不存在的模板", {}, "400", badInstanceRes.status + " " + badInstanceRes.body.error, badInstanceRes.status === 400);

  // 获取详情
  const getInstanceRes = await request("GET", `/api/flow-instances/${instance.id}`);
  record("GET /api/flow-instances/:id", {}, "200 + 数据", getInstanceRes.status + " " + getInstanceRes.body.data?.templateName, getInstanceRes.status === 200);

  const getInst404 = await request("GET", "/api/flow-instances/non-existent");
  record("GET 不存在的实例", {}, "404", getInst404.status, getInst404.status === 404);

  // 阶段回执（completed，带 gate，进入 review_pending）
  const stage1 = instance.stages[0];
  const receiptRes = await request("POST", `/api/flow-instances/${instance.id}/stages/${stage1.id}/receipts`, {
    status: "completed",
    summary: "阶段一完成",
    progress: 100,
  });
  record("POST 阶段回 receipts completed（有 gate）", { status: "completed" }, "200 + review_pending", receiptRes.status + " " + receiptRes.body.data?.stage?.status, receiptRes.status === 200 && receiptRes.body.data?.stage?.status === "review_pending");

  // 推进前状态检查
  const beforeAdvance = (await request("GET", `/api/flow-instances/${instance.id}`)).body.data;
  record("推进前当前阶段状态", {}, "review_pending", beforeAdvance.stages.find(s => s.id === beforeAdvance.currentStageId)?.status, beforeAdvance.stages.find(s => s.id === beforeAdvance.currentStageId)?.status === "review_pending");

  // 关口评审 - reject
  const reviewRejectRes = await request("POST", `/api/flow-instances/${instance.id}/review`, {
    action: "reject",
    comment: "质量不达标",
  });
  record("POST review reject", { action: "reject" }, "200 + blocked", reviewRejectRes.status + " " + reviewRejectRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status, reviewRejectRes.status === 200 && reviewRejectRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status === "blocked");

  // 退回阶段
  const returnRes = await request("POST", `/api/flow-instances/${instance.id}/return`, {
    reason: "需要返工",
  });
  record("POST return 退回", { reason: "需要返工" }, "200 + in_progress", returnRes.status + " " + returnRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status, returnRes.status === 200 && returnRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status === "in_progress");

  // 重新提交回执
  const receipt2Res = await request("POST", `/api/flow-instances/${instance.id}/stages/${stage1.id}/receipts`, {
    status: "completed",
    summary: "阶段一再次完成",
    progress: 100,
  });
  record("POST 再次回执 completed", {}, "200 + review_pending", receipt2Res.status + " " + receipt2Res.body.data?.stage?.status, receipt2Res.status === 200 && receipt2Res.body.data?.stage?.status === "review_pending");

  // 关口评审 - approve
  const reviewApproveRes = await request("POST", `/api/flow-instances/${instance.id}/review`, {
    action: "approve",
    comment: "通过",
  });
  record("POST review approve", { action: "approve" }, "200 + review_pending(ready to advance)", reviewApproveRes.status + " " + reviewApproveRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status, reviewApproveRes.status === 200 && reviewApproveRes.body.data?.stages.find(s => s.id === instance.currentStageId)?.status === "review_pending");

  // 推进到下一阶段
  const advanceRes = await request("POST", `/api/flow-instances/${instance.id}/advance`);
  const advancedInstance = advanceRes.body.data;
  record("POST advance 推进", {}, "200 + stage2 in_progress", advanceRes.status + " " + advancedInstance?.currentStageId + " " + advancedInstance?.stages.find(s => s.id === advancedInstance.currentStageId)?.status, advanceRes.status === 200 && advancedInstance?.stages.find(s => s.id === advancedInstance.currentStageId)?.status === "in_progress" && advancedInstance?.stages.find(s => s.id === stage1.id)?.status === "done");

  // 推进：当前阶段不在 review_pending 状态，应报错
  const advanceFailRes = await request("POST", `/api/flow-instances/${instance.id}/advance`);
  record("POST advance 未评审阶段推进", {}, "400", advanceFailRes.status + " " + advanceFailRes.body.error, advanceFailRes.status === 400);

  // 阶段回执（progress）
  const stage2 = advancedInstance.stages.find(s => s.id === advancedInstance.currentStageId);
  const progressReceiptRes = await request("POST", `/api/flow-instances/${instance.id}/stages/${stage2.id}/receipts`, {
    status: "progress",
    summary: "进行中",
    progress: 50,
  });
  record("POST 回执 progress", { status: "progress" }, "200 + in_progress", progressReceiptRes.status + " " + progressReceiptRes.body.data?.stage?.status, progressReceiptRes.status === 200 && progressReceiptRes.body.data?.stage?.status === "in_progress");

  // 阶段回执（failed）
  const failedReceiptRes = await request("POST", `/api/flow-instances/${instance.id}/stages/${stage2.id}/receipts`, {
    status: "failed",
    summary: "遇到阻塞",
    progress: 0,
  });
  record("POST 回执 failed", { status: "failed" }, "200 + blocked", failedReceiptRes.status + " " + failedReceiptRes.body.data?.stage?.status, failedReceiptRes.status === 200 && failedReceiptRes.body.data?.stage?.status === "blocked");

  // ── 8. 项目 GET 返回 _flowInstance ──
  console.log("\n--- 3. 项目绑定与查询 ---");
  const getProjectRes = await request("GET", `/api/projects/${boundProject.id}`);
  record("GET /api/projects/:id 返回 _flowInstance", {}, "200 + _flowInstance", getProjectRes.status + " " + (getProjectRes.body._flowInstance?.id ?? "无"), getProjectRes.status === 200 && getProjectRes.body._flowInstance?.id === boundProject.flowInstanceId);

  // ── 9. 数据迁移检查 ──
  console.log("\n--- 4. 数据迁移检查 ---");
  const dataFile = path.join(__dirname, ".test-data", "nomos-data.json");
  const dataContent = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  record("数据文件版本检查", {}, "version === 8", dataContent.version, dataContent.version === 8, `version=${dataContent.version}`);
  record("数据文件包含 flowTemplates", {}, "是", Array.isArray(dataContent.flowTemplates), Array.isArray(dataContent.flowTemplates));
  record("数据文件包含 flowInstances", {}, "是", Array.isArray(dataContent.flowInstances), Array.isArray(dataContent.flowInstances));

  // ── 10. 回归测试：普通项目五阶段链路 ──
  console.log("\n--- 5. 回归测试：普通项目五阶段链路 ---");
  const plainProjectRes = await request("POST", "/api/projects", {
    title: "回归测试项目",
    subtitle: "验证旧链路",
    goal: "确保原有五阶段项目正常",
    dueLabel: "本季度",
  });
  const plainProject = plainProjectRes.body;
  record("回归：创建普通项目", {}, "201 + 5 stages", plainProjectRes.status + " " + plainProject.stages?.length, plainProjectRes.status === 201 && plainProject.stages?.length === 5);
  record("回归：项目阶段 keys", {}, "prd,design,develop,test,deploy", plainProject.stages?.map(s => s.key).join(","), plainProject.stages?.map(s => s.key).join(",") === "prd,design,develop,test,deploy");
  record("回归：默认活跃阶段", {}, "prd in_progress", plainProject.stages?.[0]?.status, plainProject.stages?.[0]?.status === "in_progress");

  // 推进普通项目（旧链路）
  const oldAdvanceRes = await request("POST", `/api/projects/${plainProject.id}/advance`);
  record("回归：普通项目 advance", {}, "200", oldAdvanceRes.status, oldAdvanceRes.status === 200);

  // 清理：删除流程实例
  const delInstanceRes = await request("DELETE", `/api/flow-instances/${instance.id}`);
  record("DELETE /api/flow-instances/:id", {}, "200", delInstanceRes.status, delInstanceRes.status === 200);

  // 清理：删除项目
  await request("DELETE", `/api/projects/${boundProject.id}`, { confirm: true });
  await request("DELETE", `/api/projects/${standaloneProject.id}`, { confirm: true });
  await request("DELETE", `/api/projects/${plainProject.id}`, { confirm: true });

  console.log("\n========== 测试汇总 ==========");
  console.log(`通过: ${passCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`总计: ${passCount + failCount}`);

  // 写入报告文件（供后续生成 MD 使用）
  fs.writeFileSync(path.join(__dirname, ".test-results.json"), JSON.stringify({ passCount, failCount, total: passCount + failCount, results }, null, 2));
  console.log("\n结果已写入 .test-results.json");

  return failCount === 0;
}

runTests().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error("测试异常:", err);
  process.exit(1);
});
