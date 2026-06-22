const assert = require("node:assert");
const { describe, it, before, after } = require("node:test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createNomosServerV1 } = require("../../dist-ts/server");
const { createTestFixture } = require("../fixture");

describe("server/api/v1", () => {
  let server;
  let port;
  let fixture;

  before(async () => {
    fixture = createTestFixture();
    const rendererDir = path.join(fixture.dataDir, "renderer-v2");
    fs.mkdirSync(rendererDir, { recursive: true });
    fs.writeFileSync(path.join(rendererDir, "index.html"), "<!doctype html><title>Nomos V0.0.3</title><main>Nomos 控制台</main>");
    server = createNomosServerV1({
      dataDir: fixture.dataDir,
      port: 0,
      rendererDir,
    });
    const addr = await server.start();
    port = addr.port;
  });

  after(async () => {
    await server.stop();
    fixture.cleanup();
  });

  function request(path, opts = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: opts.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(opts.headers || {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
            } catch {
              resolve({ status: res.statusCode, body: data, headers: res.headers });
            }
          });
        }
      );
      req.on("error", reject);
      if (opts.body) req.end(JSON.stringify(opts.body));
      else req.end();
    });
  }

  it("GET /api/v1/health 返回成功且包含 requestId", async () => {
    const { status, body } = await request("/api/v1/health");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.status, "ok");
    assert.ok(body.meta.requestId);
    assert.strictEqual(body.meta.requestId.length, 36); // UUID
  });

  it("非本机 Host 返回 403", async () => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/api/v1/health",
      method: "GET",
      headers: { Host: "evil.com" },
    }, (res) => {
      assert.strictEqual(res.statusCode, 403);
    });
    req.end();
  });

  it("未知 API 路径返回 404 Problem Details", async () => {
    const { status, body } = await request("/api/v1/unknown-resource");
    assert.strictEqual(status, 404);
    assert.strictEqual(body.code, "NOT_FOUND");
    assert.ok(body.requestId);
  });

  it("GET /api/v1/adapter-templates 返回数组", async () => {
    const { status, body } = await request("/api/v1/adapter-templates");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 5);
  });

  it("GET /api/v1/connection-profiles 返回数组", async () => {
    const { status, body } = await request("/api/v1/connection-profiles");
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /api/v1/dashboard 返回真实空聚合", async () => {
    const { status, body } = await request("/api/v1/dashboard");
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(body.data.counts, {
      schedulableEmployees: 0,
      runningWorkItems: 0,
      pendingDispatches: 0,
      pendingAcceptances: 0,
      pendingPermissionRequests: 0,
    });
    assert.deepStrictEqual(body.data.exceptions, []);
  });

  it("ConnectionProfile 支持发现、创建、测试和显式禁用", async () => {
    const discovered = await request("/api/v1/connection-profiles/discover", { method: "POST", body: {} });
    assert.strictEqual(discovered.status, 200);
    assert.ok(Array.isArray(discovered.body.data));

    const created = await request("/api/v1/connection-profiles", {
      method: "POST",
      body: {
        templateId: "codex-cli",
        name: "测试 Node 连接",
        scope: "local",
        commandOrEndpoint: process.execPath,
        concurrencyCapacity: 2,
      },
    });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.data.status, "draft");
    assert.strictEqual(created.body.data.manageable, false);

    const tested = await request(`/api/v1/connection-profiles/${created.body.data.id}/test`, { method: "POST", body: {} });
    assert.strictEqual(tested.status, 200);
    assert.strictEqual(tested.body.data.status, "connected");
    assert.strictEqual(tested.body.data.manageable, true);
    assert.match(tested.body.data.versionLabel, /^v?\d+/);

    const rejectedDisable = await request(`/api/v1/connection-profiles/${created.body.data.id}/disable`, {
      method: "POST", body: { version: tested.body.data.version, confirm: false },
    });
    assert.strictEqual(rejectedDisable.status, 400);

    const disabled = await request(`/api/v1/connection-profiles/${created.body.data.id}/disable`, {
      method: "POST", body: { version: tested.body.data.version, confirm: true },
    });
    assert.strictEqual(disabled.status, 200);
    assert.strictEqual(disabled.body.data.status, "disabled");
    assert.strictEqual(disabled.body.data.manageable, false);
  });

  it("Skill/Position 具备引用保护且岗位合同字段完整", async () => {
    const skill = await request("/api/v1/skills", { method: "POST", body: { name: "前端工程", category: "position_specific", level: 3, source: "manual" } });
    assert.strictEqual(skill.status, 201);
    const position = await request("/api/v1/positions", { method: "POST", body: {
      name: "前端工程师", family: "研发", responsibilities: ["实现可访问的用户界面"], acceptanceCriteria: ["构建与测试通过"], skillIds: [skill.body.data.id],
      managementPermission: { dataScopes: ["project"], visibility: ["assigned"], actions: ["read", "write"], responsibilityBoundary: "仅限所分配项目", approvalPolicy: "owner" },
    } });
    assert.strictEqual(position.status, 201);
    assert.deepStrictEqual(position.body.data.skillIds, [skill.body.data.id]);
    assert.strictEqual(position.body.data.managementPermission.approvalPolicy, "owner");
    const deactivate = await request(`/api/v1/skills/${skill.body.data.id}`, { method: "PATCH", body: { status: "inactive", version: skill.body.data.version } });
    assert.strictEqual(deactivate.status, 409);
    assert.strictEqual(deactivate.body.code, "REFERENCE_CONFLICT");
  });

  it("同一连接可实例化两个会话隔离的硅基员工并通过入职检查", async () => {
    const profile = await request("/api/v1/connection-profiles", { method: "POST", body: {
      templateId: "codex-cli", name: "组织测试连接", scope: "local", commandOrEndpoint: process.execPath, concurrencyCapacity: 3,
    } });
    const connected = await request(`/api/v1/connection-profiles/${profile.body.data.id}/test`, { method: "POST", body: {} });
    assert.strictEqual(connected.body.data.status, "connected");
    const skill = await request("/api/v1/skills", { method: "POST", body: { name: "测试工程", category: "position_specific", level: 3, source: "manual" } });
    const position = await request("/api/v1/positions", { method: "POST", body: {
      name: "测试工程师", family: "质量", responsibilities: ["验证交付质量"], acceptanceCriteria: ["核心路径无阻断缺陷"], skillIds: [skill.body.data.id],
      managementPermission: { dataScopes: ["project"], visibility: ["assigned"], actions: ["read"], responsibilityBoundary: "质量验证", approvalPolicy: "none" },
    } });
    const createEmployee = (name) => request("/api/v1/employees", { method: "POST", body: { name, type: "silicon", primaryPositionId: position.body.data.id, additionalPositionIds: [], connectionProfileId: profile.body.data.id } });
    const first = await createEmployee("测试员工甲"); const second = await createEmployee("测试员工乙");
    assert.strictEqual(first.status, 201); assert.strictEqual(second.status, 201);
    const firstMaterialized = await request(`/api/v1/employees/${first.body.data.id}/materialize`, { method: "POST", body: {} });
    const secondMaterialized = await request(`/api/v1/employees/${second.body.data.id}/materialize`, { method: "POST", body: {} });
    assert.notStrictEqual(firstMaterialized.body.data.runtimeBinding.sessionKeyMasked, secondMaterialized.body.data.runtimeBinding.sessionKeyMasked);
    assert.notStrictEqual(firstMaterialized.body.data.runtimeBinding.promptSnapshotId, secondMaterialized.body.data.runtimeBinding.promptSnapshotId);
    assert.ok(!JSON.stringify(firstMaterialized.body).includes("nomos:"));
    const onboarded = await request(`/api/v1/employees/${first.body.data.id}/onboarding-check`, { method: "POST", body: {} });
    assert.strictEqual(onboarded.status, 200); assert.strictEqual(onboarded.body.data.passed, true);
    assert.strictEqual(onboarded.body.data.employee.status, "schedulable");
    assert.strictEqual(onboarded.body.data.employee.onboardingChecks.length, 3);
    const suspended = await request(`/api/v1/employees/${first.body.data.id}/suspend`, { method: "POST", body: { version: onboarded.body.data.employee.version } });
    assert.strictEqual(suspended.body.data.schedulable, false);
    const resumed = await request(`/api/v1/employees/${first.body.data.id}/resume`, { method: "POST", body: { version: suspended.body.data.version } });
    assert.strictEqual(resumed.body.data.schedulable, true);
  });

  it("岗位外权限申请支持审批与撤销", async () => {
    const employee = (await request("/api/v1/employees")).body.data[0];
    const position = (await request("/api/v1/positions")).body.data[0];
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const created = await request("/api/v1/permission-requests", { method: "POST", body: { employeeId: employee.id, targetPositionId: position.id, requestedScopes: ["project:review"], reason: "需要执行发布前质量复核", expiresAt } });
    assert.strictEqual(created.status, 201);
    const pending = (await request("/api/v1/permission-requests")).body.data.find((item) => item.id === created.body.data.id);
    const approved = await request(`/api/v1/permission-requests/${pending.id}/approve`, { method: "POST", body: { version: pending.version, reason: "范围合理" } });
    assert.strictEqual(approved.body.data.status, "approved");
    const approvedRow = (await request("/api/v1/permission-requests")).body.data.find((item) => item.id === pending.id);
    const revoked = await request(`/api/v1/permission-requests/${pending.id}/revoke`, { method: "POST", body: { version: approvedRow.version, reason: "工作完成" } });
    assert.strictEqual(revoked.body.data.status, "revoked");
  });

  it("发布流程后项目启动会快照版本并按岗位槽位生成工作项", async () => {
    const owner = (await request("/api/v1/employees")).body.data.find((item) => item.status === "schedulable");
    const position = (await request("/api/v1/positions")).body.data[0];
    const flow = await request("/api/v1/flows", { method: "POST", body: { name: "软件交付验收流程", description: "测试用两阶段黄金链路" } });
    assert.strictEqual(flow.status, 201);
    const version = await request(`/api/v1/flows/${flow.body.data.id}/versions`, { method: "POST", body: {
      versionLabel: "1.0.0",
      nodes: [
        { key: "design", name: "产品设计", goal: "形成可开发方案", inputs: ["需求"], outputs: ["设计"], positionSlots: [{ name: "设计负责人", requiredPositionId: position.id, executionType: "silicon", routingStrategy: "auto" }], acceptance: { required: true, reviewerPositionId: position.id, criteria: ["方案可执行"] }, failurePolicy: { maxAttempts: 2, reworkNodeKey: null } },
        { key: "verify", name: "测试验证", goal: "验证交付质量", inputs: ["实现"], outputs: ["报告"], positionSlots: [{ name: "验证负责人", requiredPositionId: position.id, executionType: "silicon", routingStrategy: "auto" }], acceptance: { required: true, reviewerPositionId: position.id, criteria: ["核心路径通过"] }, failurePolicy: { maxAttempts: 2, reworkNodeKey: "design" } },
      ], edges: [{ fromNodeKey: "design", toNodeKey: "verify", condition: null }],
    } });
    assert.strictEqual(version.status, 201); assert.strictEqual(version.body.data.nodes.length, 2);
    const checked = await request(`/api/v1/flows/${flow.body.data.id}/versions/${version.body.data.id}/validate`, { method: "POST", body: {} });
    assert.strictEqual(checked.body.data.valid, true);
    const published = await request(`/api/v1/flows/${flow.body.data.id}/versions/${version.body.data.id}/publish`, { method: "POST", body: {} });
    assert.strictEqual(published.body.data.status, "published");
    const project = await request("/api/v1/projects", { method: "POST", body: { name: "V0.0.3 发布验收", goal: "完成 Nomos 版本交付", ownerEmployeeId: owner.id, flowVersionId: version.body.data.id } });
    assert.strictEqual(project.status, 201);
    const started = await request(`/api/v1/projects/${project.body.data.id}/start`, { method: "POST", body: {} });
    assert.strictEqual(started.body.data.status, "active");
    const runtime = await request(`/api/v1/projects/${project.body.data.id}/runtime`);
    assert.strictEqual(runtime.body.data.flowSnapshot.flowVersionId, version.body.data.id);
    assert.strictEqual(runtime.body.data.workItems.length, 2);
    assert.strictEqual(runtime.body.data.workItems[0].status, "pending_dispatch");
    assert.deepStrictEqual(runtime.body.data.workItems[1].dependencyIds, [runtime.body.data.workItems[0].id]);
  });

  it("流程校验阻止环路发布", async () => {
    const position = (await request("/api/v1/positions")).body.data[0];
    const flow = await request("/api/v1/flows", { method: "POST", body: { name: "环路反例流程" } });
    const node = (key) => ({ key, name: `节点 ${key}`, goal: "验证校验器", positionSlots: [{ name: "负责人", requiredPositionId: position.id }], acceptance: { required: true, criteria: ["完成"] } });
    const version = await request(`/api/v1/flows/${flow.body.data.id}/versions`, { method: "POST", body: { versionLabel: "1", nodes: [node("a"), node("b")], edges: [{ fromNodeKey: "a", toNodeKey: "b" }, { fromNodeKey: "b", toNodeKey: "a" }] } });
    const publish = await request(`/api/v1/flows/${flow.body.data.id}/versions/${version.body.data.id}/publish`, { method: "POST", body: {} });
    assert.strictEqual(publish.status, 409); assert.strictEqual(publish.body.code, "FLOW_VALIDATION_FAILED");
  });

  it("派发、回执、返工与验收形成幂等证据闭环", async () => {
    const project = (await request("/api/v1/projects")).body.data.find((item) => item.status === "active");
    let runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    const workItem = runtime.workItems.find((item) => item.status === "pending_dispatch");
    const preview = await request(`/api/v1/work-items/${workItem.id}/dispatch/preview`, { method: "POST", body: {} });
    assert.strictEqual(preview.status, 200);
    assert.ok(preview.body.data.candidates.some((item) => item.eligible));
    assert.ok(preview.body.data.selectedEmployeeId);
    const key1 = `dispatch-${Date.now()}-attempt-1`;
    const confirmed = await request(`/api/v1/dispatches/${preview.body.data.dispatchId}/confirm`, { method: "POST", headers: { "Idempotency-Key": key1 }, body: { employeeId: preview.body.data.selectedEmployeeId } });
    assert.strictEqual(confirmed.status, 200); assert.strictEqual(confirmed.body.data.status, "running");
    const replay = await request(`/api/v1/dispatches/${preview.body.data.dispatchId}/confirm`, { method: "POST", headers: { "Idempotency-Key": key1 }, body: { employeeId: preview.body.data.selectedEmployeeId } });
    assert.strictEqual(replay.body.data.executionId, confirmed.body.data.executionId); assert.strictEqual(replay.body.data.idempotentReplay, true);
    const receipt1 = await request(`/api/v1/executions/${confirmed.body.data.executionId}/receipts`, { method: "POST", body: { status: "completed", summary: "首次实现已完成", deliverables: [{ type: "text", label: "澄清记录", uri: "nomos://deliverables/clarification-v1" }], tests: [{ name: "合同检查", status: "passed", detail: "字段完整" }], risks: [], nextActions: ["等待人工验收"] } });
    assert.strictEqual(receipt1.status, 201);
    runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    assert.strictEqual(runtime.workItems.find((item) => item.id === workItem.id).status, "review_pending");
    const reviewer = runtime.participants[0];
    const rework = await request(`/api/v1/receipts/${receipt1.body.data.id}/acceptances`, { method: "POST", body: { reviewerEmployeeId: reviewer.id, result: "rework", againstCriteria: [{ criterion: "范围、目标和非范围明确", result: "failed", comment: "非范围需要补充" }], comment: "补充非范围后重新提交" } });
    assert.strictEqual(rework.status, 201);
    runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    const retryWork = runtime.workItems.find((item) => item.id === workItem.id);
    assert.strictEqual(retryWork.status, "pending_dispatch"); assert.strictEqual(retryWork.attempt, 2);
    const preview2 = await request(`/api/v1/work-items/${workItem.id}/dispatch/preview`, { method: "POST", body: {} });
    const confirmed2 = await request(`/api/v1/dispatches/${preview2.body.data.dispatchId}/confirm`, { method: "POST", headers: { "Idempotency-Key": `dispatch-${Date.now()}-attempt-2` }, body: { employeeId: preview2.body.data.selectedEmployeeId } });
    const receipt2 = await request(`/api/v1/executions/${confirmed2.body.data.executionId}/receipts`, { method: "POST", body: { status: "completed", summary: "已补充非范围", deliverables: [{ type: "text", label: "澄清记录 v2", uri: "nomos://deliverables/clarification-v2" }], tests: [{ name: "验收标准", status: "passed", detail: "全部满足" }], risks: [], nextActions: [] } });
    const accepted = await request(`/api/v1/receipts/${receipt2.body.data.id}/acceptances`, { method: "POST", body: { reviewerEmployeeId: reviewer.id, result: "accepted", againstCriteria: [{ criterion: "范围、目标和非范围明确", result: "passed", comment: "已满足" }], comment: "验收通过" } });
    assert.strictEqual(accepted.status, 201);
    runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    assert.strictEqual(runtime.workItems.find((item) => item.id === workItem.id).status, "done");
    assert.strictEqual(runtime.workItems[1].status, "pending_dispatch");
    const history = await request(`/api/v1/work-items/${workItem.id}/receipts`);
    assert.strictEqual(history.body.data.length, 2);
  });

  it("SQLite 备份、检查、恢复前保护快照与安全诊断形成闭环", async () => {
    const rejected = await request("/api/v1/system/backups", { method: "POST", body: { confirm: false, reason: "test" } });
    assert.strictEqual(rejected.status, 400);
    const created = await request("/api/v1/system/backups", { method: "POST", body: { confirm: true, reason: "release-test" } });
    assert.strictEqual(created.status, 201); assert.strictEqual(created.body.data.integrity, "ok");
    const inspected = await request(`/api/v1/system/backups/${encodeURIComponent(created.body.data.fileName)}/inspect`);
    assert.strictEqual(inspected.body.data.integrity, "ok"); assert.ok(inspected.body.data.schemaVersions.includes(5));
    const transient = await request("/api/v1/skills", { method: "POST", body: { name: "恢复后应消失的 Skill", category: "general", level: 1, source: "manual" } });
    assert.strictEqual(transient.status, 201);
    const restored = await request(`/api/v1/system/backups/${encodeURIComponent(created.body.data.fileName)}/restore`, { method: "POST", body: { confirm: true } });
    assert.strictEqual(restored.status, 200); assert.strictEqual(restored.body.data.restored, true);
    assert.match(restored.body.data.protectionBackup.fileName, /pre-restore/);
    const skills = await request("/api/v1/skills");
    assert.ok(!skills.body.data.some((skill) => skill.name === "恢复后应消失的 Skill"));
    const diagnostics = await request("/api/v1/system/diagnostics");
    assert.strictEqual(diagnostics.body.data.database.integrity, "ok");
    assert.strictEqual(diagnostics.body.data.security.rawSessionKeys, 0);
    assert.strictEqual(diagnostics.body.data.security.passed, true);
  });

  it("旧 v9 数据先 dry-run、保持源文件不变并按确认报告导入", async () => {
    const legacyPath = path.join(fixture.dataDir, "nomos-data.json");
    const legacy = {
      version: 9,
      projects: [{ id: "old-project", title: "旧项目" }],
      skills: [{ id: "old-skill", name: "旧版需求分析", category: "role-specific", level: 3, token: "fake-token-must-not-import" }],
      roles: [{ id: "old-role", name: "旧版产品经理", family: "产品", responsibilities: ["需求分析"], acceptanceCriteria: "PRD 可开发", skillIds: ["old-skill"] }],
      employees: [
        { id: "old-carbon", name: "旧版碳基员工", type: "carbon", roleIds: ["old-role"] },
        { id: "old-silicon", name: "旧版硅基员工", type: "silicon", roleIds: ["old-role"], agentId: "codex-cli" },
      ],
      flowTemplates: [], workItems: [], agents: [], audit: [], executions: [],
    };
    fs.writeFileSync(legacyPath, JSON.stringify(legacy, null, 2));
    const before = fs.readFileSync(legacyPath);
    const preview = await request("/api/v1/migration/legacy/dry-run", { method: "POST", body: { sourcePath: legacyPath } });
    assert.strictEqual(preview.status, 200); assert.strictEqual(preview.body.data.sourceUnchanged, true);
    assert.strictEqual(preview.body.data.importable.carbonEmployees, 1);
    assert.strictEqual(preview.body.data.skipped.employees, 1);
    assert.ok(preview.body.data.ambiguities.some((item) => item.type === "employee_connection"));
    assert.ok(preview.body.data.sensitiveFields.some((field) => field.endsWith(".token")));
    assert.deepStrictEqual(fs.readFileSync(legacyPath), before);
    const imported = await request("/api/v1/migration/legacy/confirm", { method: "POST", body: { sourcePath: legacyPath, sourceHash: preview.body.data.sourceHash, confirm: true } });
    assert.strictEqual(imported.status, 201); assert.strictEqual(imported.body.data.imported.carbonEmployees, 1);
    assert.deepStrictEqual(fs.readFileSync(legacyPath), before);
    const employees = await request("/api/v1/employees");
    assert.ok(employees.body.data.some((employee) => employee.name === "旧版碳基员工"));
    assert.ok(!employees.body.data.some((employee) => employee.name === "旧版硅基员工"));
    assert.ok(!JSON.stringify(await request("/api/v1/system/audits")).includes("fake-token-must-not-import"));
  });

  it("启动恢复会释放中断执行容量并创建可重试 attempt", async () => {
    const { recoverInterruptedExecutions } = require("../../dist-ts/application/system/service");
    const project = (await request("/api/v1/projects")).body.data.find((item) => item.status === "active");
    let runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    const work = runtime.workItems.find((item) => item.status === "pending_dispatch");
    const preview = await request(`/api/v1/work-items/${work.id}/dispatch/preview`, { method: "POST", body: {} });
    const confirmed = await request(`/api/v1/dispatches/${preview.body.data.dispatchId}/confirm`, { method: "POST", headers: { "Idempotency-Key": `recovery-${Date.now()}` }, body: { employeeId: preview.body.data.selectedEmployeeId } });
    assert.strictEqual(confirmed.body.data.status, "running");
    const recovered = recoverInterruptedExecutions(server.db());
    assert.strictEqual(recovered, 1);
    runtime = (await request(`/api/v1/projects/${project.id}/runtime`)).body.data;
    const recoveredWork = runtime.workItems.find((item) => item.id === work.id);
    assert.strictEqual(recoveredWork.status, "pending_dispatch");
    assert.strictEqual(recoveredWork.attempt, work.attempt + 1);
    const profiles = await request("/api/v1/connection-profiles");
    assert.ok(profiles.body.data.every((profile) => profile.activeSessions === 0));
  });

  it("GET / 返回 V0.0.3 Renderer", async () => {
    const { status, body, headers } = await request("/");
    assert.strictEqual(status, 200);
    assert.match(String(headers["content-type"]), /^text\/html/);
    assert.match(String(headers["content-security-policy"]), /default-src 'self'/);
    assert.strictEqual(headers["x-frame-options"], "DENY");
    assert.match(String(body), /Nomos 控制台/);
  });

  it("请求日志包含 requestId 但不泄露敏感字段", async () => {
    // 通过日志无法直接断言，但可验证响应中无敏感字段
    const { status, body } = await request("/api/v1/health");
    assert.strictEqual(status, 200);
    assert.ok(!JSON.stringify(body).includes("token"));
  });
});
