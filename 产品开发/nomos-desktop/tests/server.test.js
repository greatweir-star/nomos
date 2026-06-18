"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createNomosServer } = require("../backend/server");
const { JsonStore } = require("../backend/store");
const { createProject } = require("../backend/default-data");
const { parseAgentReceipt, parseTestReport } = require("../backend/agent-receipt");
const { normalizeAliceSessions } = require("../backend/alice");

async function withServer(run, options = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-test-"));
  const backend = createNomosServer({ dataDir, ...options });
  seedDemoWorkspace(backend.store);
  const address = await backend.start();
  try {
    await run(address.url);
  } finally {
    await backend.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

function seedDemoWorkspace(store) {
  store.update((data) => {
    const website = createProject({
      id: "project-website",
      title: "Test website",
      subtitle: "Test website delivery",
      goal: "Deliver a test website preview.",
      dueLabel: "Test acceptance",
      unread: 3,
    });
    website.assets = [
      { id: "asset-prd", stageKey: "prd", type: "PRD", name: "Test PRD" },
      { id: "asset-copy", stageKey: "prd", type: "TXT", name: "Test copy" },
      { id: "asset-reference", stageKey: "prd", type: "URL", name: "Test reference" },
    ];
    data.projects = [
      website,
      createProject({
        id: "project-content",
        title: "Test content",
        subtitle: "Test content delivery",
        goal: "Deliver test content.",
        dueLabel: "Test acceptance",
        team: "内容团队",
        activeIndex: 0,
        unread: 8,
      }),
      createProject({
        id: "project-launch",
        title: "Test launch",
        subtitle: "Test launch delivery",
        goal: "Deliver test launch materials.",
        dueLabel: "Test acceptance",
        team: "运营团队",
        activeIndex: 0,
        unread: 2,
      }),
    ];
    data.bridge.status = "online";
    return data.projects;
  });
}

function createTestExecutionOptions(workspaceDir) {
  return {
    allowedRoots: [workspaceDir],
    adapters: {
      "codex-cli": {
        name: "Test Codex",
        command: "node",
        resolveExecutable: () => process.execPath,
        buildInvocation: ({ executable }) => ({
          command: executable,
          args: [
            "-e",
            "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>process.stdout.write('received:'+text));",
          ],
        }),
      },
    },
    timeoutMs: 5000,
  };
}

function createSlowExecutionOptions(workspaceDir) {
  return {
    allowedRoots: [workspaceDir],
    adapters: {
      "codex-cli": {
        name: "Slow Test Codex",
        command: "node",
        resolveExecutable: () => process.execPath,
        buildInvocation: ({ executable }) => ({
          command: executable,
          args: ["-e", "setInterval(()=>process.stdout.write('tick\\n'),100);process.stdin.resume();"],
        }),
      },
    },
    timeoutMs: 5000,
  };
}

test("workspace seeds projects and paired local agents", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/workspace`);
    assert.equal(response.status, 200);
    const workspace = await response.json();
    assert.equal(workspace.projects.length, 3);
    assert.equal(workspace.agents.filter((agent) => agent.type === "local").length, 5);
    assert.ok(workspace.agents.some((agent) => agent.id === "alice"));
    assert.ok(workspace.agents.some((agent) => agent.id === "kimi-cli"));
    assert.equal(workspace.bridge.status, "online");
  });
});

test("production workspace starts without demo projects", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-clean-start-"));
  try {
    const store = new JsonStore({ dataDir });
    const data = store.load();
    assert.deepEqual(data.projects, []);
    assert.equal(data.bridge.status, "offline");
    assert.equal(JSON.stringify(data).includes("Test website"), false);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("legacy project data migrates into the workflow model", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-migrate-"));
  try {
    fs.writeFileSync(
      path.join(dataDir, "nomos-data.json"),
      JSON.stringify({
        version: 3,
        projects: [
          {
            id: "legacy-project",
            title: "Legacy",
            updatedAt: new Date().toISOString(),
            messages: [],
            checkpoints: [],
            assets: [{ id: "legacy-prd", stageKey: "prd", type: "PRD", name: "Legacy PRD" }],
            stages: [
              { key: "prd", title: "需求定义", ownerId: "product", ownerName: "产品", ownerType: "cloud", status: "in_progress", progress: 30 },
              { key: "design", title: "界面设计", ownerId: "design", ownerName: "设计", ownerType: "cloud", status: "waiting", progress: 0 },
            ],
          },
        ],
        agents: [],
        audit: [],
        executions: [],
        bridge: { id: "desktop-bridge", status: "offline", allowedWorkspaces: [] },
      }),
      "utf8",
    );
    const store = new JsonStore({ dataDir });
    const data = store.load();
    assert.equal(data.version, 9);
    assert.equal(data.projects[0].workflow.currentStageKey, "prd");
    assert.equal(data.projects[0].workflow.status, "active");
    assert.equal(data.projects[0].stages[0].attempt, 1);
    assert.deepEqual(data.projects[0].stages[0].deliverableIds, ["legacy-prd"]);
    assert.equal(data.projects[0].workflowTasks.length, 1);
    assert.equal(data.projects[0].workflowTasks[0].stageKey, "prd");
    assert.deepEqual(data.bridge.adapterCommands, {});
    assert.ok(Array.isArray(data.workItems));
    assert.ok(Array.isArray(data.workItemEvents));
    assert.ok(data.agents.some((agent) => agent.employee?.employmentType === "silicon"));
    assert.ok(data.agents.some((agent) => agent.architecture?.adapterId === "tencent-yuanqi"));
    assert.equal(data.agentAdapters["tencent-yuanqi"].status, "unconfigured");
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("project messages persist and project stage can advance", async () => {
  await withServer(async (url) => {
    const before = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.equal(before.stages.find((stage) => stage.status === "in_progress").key, "design");

    const messageResponse = await fetch(`${url}/api/projects/project-website/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "请把首页首屏再简化一点。" }),
    });
    assert.equal(messageResponse.status, 201);

    const advanceResponse = await fetch(`${url}/api/projects/project-website/advance`, {
      method: "POST",
    });
    assert.equal(advanceResponse.status, 200);

    const after = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.equal(after.messages.at(-2).text, "请把首页首屏再简化一点。");
    assert.equal(after.stages.find((stage) => stage.status === "in_progress").key, "develop");
  });
});

test("new projects and bridge aliases can be saved", async () => {
  await withServer(async (url) => {
    const projectResponse = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "本地测试项目", goal: "验证完整项目创建流程" }),
    });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json();
    assert.equal(project.title, "本地测试项目");
    assert.equal(project.stages.length, 5);

    const pairResponse = await fetch(`${url}/api/bridge/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliases: { "codex-cli": "本地开发主力" } }),
    });
    assert.equal(pairResponse.status, 200);

    const bridge = await fetch(`${url}/api/bridge`).then((response) => response.json());
    assert.equal(bridge.agents.find((agent) => agent.id === "codex-cli").alias, "本地开发主力");
  });
});

test("structured stage receipts bind deliverables and wait for human approval", async () => {
  await withServer(async (url) => {
    const before = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.equal(before.checkpoints.find((item) => item.stageKey === "design").status, "waiting");

    const submitted = await fetch(`${url}/api/projects/project-website/stages/design/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        summary: "首页、关于页和文章页设计稿已经整理完成。",
        agentId: "design-director",
        agentName: "设计总监",
        agentType: "cloud",
        deliverables: [{ type: "URL", name: "Figma 高保真设计稿", url: "https://example.test/design" }],
      }),
    });
    assert.equal(submitted.status, 201);
    const receipt = await submitted.json();
    assert.equal(receipt.stage.status, "review_pending");
    assert.equal(receipt.deliverables[0].stageKey, "design");
    assert.equal(receipt.receipt.taskId, receipt.stage.activeTaskId);

    const workflow = await fetch(`${url}/api/projects/project-website/workflow`).then((response) => response.json());
    assert.equal(workflow.workflow.status, "review_pending");
    assert.equal(workflow.tasks.find((task) => task.id === receipt.receipt.taskId).status, "review_pending");
    assert.equal(workflow.deliverables.some((asset) => asset.name === "Figma 高保真设计稿"), true);
    const checkpoint = workflow.checkpoints.find(
      (item) => item.stageKey === "design" && item.status === "pending",
    );
    assert.ok(checkpoint);

    const approved = await fetch(`${url}/api/projects/project-website/checkpoints/${checkpoint.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    assert.equal(approved.status, 200);
    const project = (await approved.json()).project;
    assert.equal(project.stages.find((stage) => stage.key === "design").status, "done");
    assert.equal(project.stages.find((stage) => stage.key === "develop").status, "in_progress");
    assert.equal(project.workflow.currentStageKey, "develop");
    assert.equal(project.workflowTasks.find((task) => task.stageKey === "develop").status, "queued");
  });
});

test("failed stage receipts can return work to an upstream agent", async () => {
  await withServer(async (url) => {
    await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });
    const failed = await fetch(`${url}/api/projects/project-website/stages/develop/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "failed",
        summary: "移动端交互约束不完整，需要补充设计说明。",
        agentId: "codex-cli",
        agentName: "Codex CLI",
        agentType: "local",
      }),
    });
    assert.equal(failed.status, 201);
    const failure = await failed.json();
    assert.equal(failure.stage.status, "blocked");
    assert.equal(failure.stage.suggestedReturnStageKey, "design");

    const returned = await fetch(`${url}/api/projects/project-website/stages/develop/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        targetStageKey: "design",
        reason: "请补充移动端交互说明后重新交付。",
      }),
    });
    assert.equal(returned.status, 200);
    const project = (await returned.json()).project;
    assert.equal(project.workflow.currentStageKey, "design");
    assert.equal(project.stages.find((stage) => stage.key === "design").status, "in_progress");
    assert.equal(project.stages.find((stage) => stage.key === "develop").status, "waiting");
    assert.equal(project.handoffs[0].type, "revision");
    assert.equal(project.workflowTasks[0].stageKey, "design");
    assert.equal(project.workflowTasks[0].attempt, 2);
  });
});

test("successful local development execution creates a receipt and hands off to test", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-workflow-execution-"));
  try {
    await withServer(
      async (url) => {
        await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });
        const preview = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            agentId: "codex-cli",
            mode: "read-only",
            workspaceDir,
            prompt: "implement the approved design",
          }),
        }).then((response) => response.json());
        await fetch(`${url}/api/executions/${preview.execution.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });

        let execution;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          execution = await fetch(`${url}/api/executions/${preview.execution.id}`).then((response) =>
            response.json(),
          );
          if (execution.status !== "running") break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(execution.status, "succeeded");

        const project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
        assert.equal(project.stages.find((stage) => stage.key === "develop").status, "done");
        assert.equal(project.stages.find((stage) => stage.key === "test").status, "in_progress");
        assert.equal(project.taskReceipts[0].executionId, preview.execution.id);
        assert.equal(project.taskReceipts[0].status, "completed");
        assert.equal(project.taskReceipts[0].taskId, project.stages.find((stage) => stage.key === "develop").activeTaskId);
        assert.equal(project.workflowTasks.find((task) => task.stageKey === "test").status, "queued");
      },
      { executionManagerOptions: createTestExecutionOptions(workspaceDir) },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("bridge refresh reports connected MCP agents", async () => {
  await withServer(
    async (url) => {
      const response = await fetch(`${url}/api/bridge/refresh`, { method: "POST" });
      assert.equal(response.status, 200);
      const bridge = await response.json();
      const alice = bridge.agents.find((agent) => agent.id === "alice");
      assert.equal(alice.status, "online");
      assert.equal(alice.connection.statusLabel, "MCP connected");
      assert.equal(bridge.tools.find((tool) => tool.id === "alice").supportsExecution, false);
    },
    {
      executionManagerOptions: {
        adapters: {
          alice: {
            name: "Alice",
            command: "alice-cli",
            connectorType: "MCP",
            supportsExecution: false,
            resolveExecutable: () => null,
            inspect: async () => ({
              installed: true,
              executable: null,
              supportsExecution: false,
              connectionStatus: "connected",
              statusLabel: "MCP connected",
              detail: "test MCP connector",
            }),
          },
        },
      },
    },
  );
});

test("agent directory separates employee identity from technical adapters", async () => {
  await withServer(async (url) => {
    const directory = await fetch(`${url}/api/agent-directory`).then((response) => response.json());
    assert.ok(directory.summary.siliconEmployees >= 1);
    assert.equal(directory.summary.cloudAdapters >= 3, true);
    assert.ok(directory.agents.some((agent) => agent.id === "tencent-yuanqi-agent"));
    assert.ok(directory.agents.every((agent) => agent.employee && agent.architecture));
    assert.ok(directory.technicalAdapters.some((adapter) => adapter.id === "tencent-yuanqi" && adapter.scope === "cloud"));
  });
});

test("cloud technical adapters can be configured without storing tokens", async () => {
  await withServer(async (url) => {
    const rejected = await fetch(`${url}/api/agent-adapters/tencent-yuanqi/configure`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://yuanqi.tencent.test/bot" }),
    });
    assert.equal(rejected.status, 400);

    const configured = await fetch(`${url}/api/agent-adapters/tencent-yuanqi/configure`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://yuanqi.tencent.test/bot",
        workspace: "bot-123",
        tokenConfigured: true,
        confirm: true,
      }),
    });
    assert.equal(configured.status, 200);
    const result = await configured.json();
    assert.equal(result.status, "configured");
    assert.equal(result.tokenConfigured, true);

    const adapters = await fetch(`${url}/api/agent-adapters`).then((response) => response.json());
    const yuanqi = adapters.find((adapter) => adapter.id === "tencent-yuanqi");
    assert.equal(yuanqi.connectionStatus, "configured");
    assert.equal(JSON.stringify(yuanqi).includes("secret"), false);

    const route = await fetch(`${url}/api/projects/project-website/stages/design/agent-route?agentId=tencent-yuanqi`).then(
      (response) => response.json(),
    );
    assert.equal(route.selectedAgent.id, "tencent-yuanqi");
    assert.equal(route.selectedAgent.scope, "cloud");
  });
});

test("agent router selects a connected adapter and keeps OpenClaw inactive", async () => {
  await withServer(
    async (url) => {
      const adapters = await fetch(`${url}/api/agent-adapters`).then((response) => response.json());
      assert.equal(adapters.find((item) => item.id === "alice").dispatchMode, "mcp-message");
      assert.equal(adapters.find((item) => item.id === "openclaw").supportsDispatch, false);

      const route = await fetch(`${url}/api/projects/project-website/stages/design/agent-route`).then((response) =>
        response.json(),
      );
      assert.equal(route.selectedAgent.id, "alice");
      assert.match(route.reason, /界面设计阶段优先使用 Alice/);
      assert.match(route.idempotencyKey, new RegExp(`^${route.taskId}:alice:1$`));

      const blocked = await fetch(`${url}/api/projects/project-website/stages/design/agent-route?agentId=openclaw`);
      assert.equal(blocked.status, 400);
      assert.equal((await blocked.json()).error, "OpenClaw 当前不可派发");

      await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });
      const developRoute = await fetch(`${url}/api/projects/project-website/stages/develop/agent-route`).then((response) =>
        response.json(),
      );
      assert.equal(developRoute.selectedAgent.id, "codex-cli");
      assert.match(developRoute.reason, /代码开发阶段优先使用 Codex CLI/);

      const claudeRoute = await fetch(`${url}/api/projects/project-website/stages/develop/agent-route?agentId=claude-code`).then(
        (response) => response.json(),
      );
      assert.equal(claudeRoute.selectedAgent.id, "claude-code");
      assert.match(claudeRoute.reason, /按照人工指定路由到 Claude Code/);
    },
    {
      executionManagerOptions: {
        adapters: {
          alice: {
            name: "Alice",
            command: "alice-cli",
            connectorType: "MCP",
            supportsExecution: false,
            supportsDispatch: true,
            dispatchMode: "mcp-message",
            receiptMode: "manual-sync",
            inspect: async () => ({
              connectionStatus: "connected",
              statusLabel: "MCP connected",
              supportsExecution: false,
            }),
          },
          "codex-cli": {
            name: "Codex CLI",
            command: "codex",
            connectorType: "CLI",
            supportsExecution: true,
            supportsDispatch: true,
            dispatchMode: "local-process",
            receiptMode: "process-exit",
            inspect: async () => ({
              connectionStatus: "connected",
              statusLabel: "已连接",
              supportsExecution: true,
            }),
          },
          "claude-code": {
            name: "Claude Code",
            command: "claude",
            connectorType: "CLI",
            supportsExecution: true,
            supportsDispatch: true,
            dispatchMode: "local-process",
            receiptMode: "process-exit",
            inspect: async () => ({
              connectionStatus: "connected",
              statusLabel: "已连接",
              supportsExecution: true,
            }),
          },
          openclaw: {
            name: "OpenClaw",
            command: "openclaw",
            connectorType: "Gateway",
            supportsExecution: false,
            supportsDispatch: false,
            dispatchMode: "gateway",
            receiptMode: "gateway-event",
            inspect: async () => ({
              connectionStatus: "setup_required",
              statusLabel: "待网关配置",
              supportsExecution: false,
            }),
          },
        },
      },
    },
  );
});

test("work item dispatch routes research tasks to Kimi and updates the work item after execution", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-kimi-workitem-"));
  try {
    await withServer(
      async (url) => {
        const created = await fetch(`${url}/api/work-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            title: "竞品调研与资料分析",
            description: "调研竞品资料并输出长上下文分析结论。",
            status: "ready",
          }),
        }).then((response) => response.json());
        const workItem = created.data;

        const route = await fetch(`${url}/api/work-items/${workItem.id}/agent-route`).then((response) => response.json());
        assert.equal(route.selectedAgent.id, "kimi-cli");
        assert.equal(route.intent, "research");

        const preview = await fetch(`${url}/api/work-items/${workItem.id}/dispatch/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceDir, mode: "read-only" }),
        }).then((response) => response.json());
        assert.equal(preview.kind, "execution");
        assert.equal(preview.execution.workItemId, workItem.id);
        assert.equal(preview.execution.agentId, "kimi-cli");
        assert.equal(preview.execution.tokenHash, undefined);

        await fetch(`${url}/api/executions/${preview.execution.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });

        let execution;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          execution = await fetch(`${url}/api/executions/${preview.execution.id}`).then((response) => response.json());
          if (execution.status !== "running") break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(execution.status, "succeeded");

        const updated = await fetch(`${url}/api/work-items/${workItem.id}`).then((response) => response.json());
        assert.equal(updated.data.status, "review_pending");
        assert.equal(updated.data.assignee.id, "kimi-cli");
        assert.equal(updated.data.progress, 90);
      },
      {
        executionManagerOptions: {
          allowedRoots: [workspaceDir],
          adapters: {
            "kimi-cli": {
              name: "Test Kimi",
              command: "node",
              connectorType: "CLI",
              supportsExecution: true,
              supportsDispatch: true,
              dispatchMode: "local-process",
              receiptMode: "process-exit",
              resolveExecutable: () => process.execPath,
              buildInvocation: ({ executable }) => ({
                command: executable,
                args: [
                  "-e",
                  "let text='';process.stdin.on('data',c=>text+=c);process.stdin.on('end',()=>process.stdout.write('kimi:'+text.slice(0,20)));",
                ],
              }),
            },
          },
        },
      },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("work item dispatch can hand off coordination tasks to Alice with explicit confirmation", async () => {
  const sentMessages = [];
  await withServer(
    async (url) => {
      const created = await fetch(`${url}/api/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "project-website",
          title: "协调设计复核事项",
          description: "协调各智能体补齐验收信息。",
          status: "ready",
        }),
      }).then((response) => response.json());
      const workItem = created.data;

      const preview = await fetch(`${url}/api/work-items/${workItem.id}/dispatch/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "alice", note: "请优先协调阻塞信息。" }),
      });
      assert.equal(preview.status, 201);
      const payload = await preview.json();
      assert.equal(payload.kind, "alice-dispatch");
      assert.equal(payload.dispatch.tokenHash, undefined);
      assert.match(payload.dispatch.message, /协调设计复核事项/);

      const rejected = await fetch(`${url}/api/alice-dispatches/${payload.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: payload.confirmationToken }),
      });
      assert.equal(rejected.status, 400);
      assert.equal(sentMessages.length, 0);

      const confirmed = await fetch(`${url}/api/alice-dispatches/${payload.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: payload.confirmationToken, confirm: true }),
      });
      assert.equal(confirmed.status, 202);
      assert.equal(sentMessages.length, 1);
      assert.match(sentMessages[0], /nomos 工作项协作任务/);

      const updated = await fetch(`${url}/api/work-items/${workItem.id}`).then((response) => response.json());
      assert.equal(updated.data.status, "in_progress");
      assert.equal(updated.data.assignee.id, "alice");
    },
    {
      executionManagerOptions: {
        adapters: {
          alice: {
            name: "Alice",
            command: "alice-cli",
            connectorType: "MCP",
            supportsExecution: false,
            supportsDispatch: true,
            dispatchMode: "mcp-message",
            receiptMode: "manual-sync",
            inspect: async () => ({
              installed: true,
              executable: null,
              connectionStatus: "connected",
              statusLabel: "MCP connected",
              supportsExecution: false,
            }),
          },
        },
      },
      aliceCoordinatorOptions: {
        sendMessage: async ({ message }) => {
          sentMessages.push(message);
          return { content: "Alice accepted work item" };
        },
      },
    },
  );
});

test("generic agent receipt endpoint normalizes adapter receipts", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/projects/project-website/stages/design/agents/alice/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "progress",
        progress: 72,
        summary: "Alice 已完成页面信息层级检查。",
        rawSummary: "raw alice response",
      }),
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.receipt.agentId, "alice");
    assert.equal(result.receipt.source, "alice");
    assert.equal(result.receipt.rawSummary, "raw alice response");
    assert.equal(result.stage.progress, 72);
  });
});

test("plain adapter text is normalized as progress instead of accidental completion", () => {
  const receipt = parseAgentReceipt("Design work is looking good. I am still checking the mobile layout.");
  assert.equal(receipt.status, "progress");
  assert.match(receipt.summary, /still checking/);
});

test("Node TAP summaries are normalized into structured test reports", () => {
  assert.deepEqual(
    parseTestReport("ℹ tests 27\nℹ pass 26\nℹ fail 1\nℹ skipped 2\nℹ duration_ms 5396.89"),
    { total: 27, passed: 26, failed: 1, skipped: 2, durationMs: 5396.89 },
  );
});

test("Alice conversation sync requires confirmation and imports structured completion receipts", async () => {
  let readCount = 0;
  await withServer(
    async (url) => {
      const preview = await fetch(`${url}/api/projects/project-website/stages/design/alice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => response.json());
      await fetch(`${url}/api/alice-dispatches/${preview.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: preview.confirmationToken, confirm: true }),
      });

      const rejected = await fetch(`${url}/api/projects/project-website/stages/design/agents/alice/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "alice-session-1" }),
      });
      assert.equal(rejected.status, 400);
      assert.equal(readCount, 0);

      const synced = await fetch(`${url}/api/projects/project-website/stages/design/agents/alice/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "alice-session-1", confirm: true }),
      });
      assert.equal(synced.status, 201);
      const result = await synced.json();
      assert.equal(readCount, 1);
      assert.equal(result.receipt.status, "completed");
      assert.equal(result.receipt.source, "alice-sync");
      assert.equal(result.stage.status, "review_pending");
      assert.equal(result.deliverables[0].name, "Alice design review");
      assert.equal(result.project.workflowTasks.find((task) => task.id === preview.dispatch.taskId).externalRef, "alice-session-1");
      assert.equal(result.project.checkpoints.find((item) => item.stageKey === "design").status, "pending");
    },
    {
      aliceCoordinatorOptions: {
        sendMessage: async () => ({ content: JSON.stringify({ sessionId: "alice-session-1" }) }),
        readConversation: async () => {
          readCount += 1;
          return {
            content: JSON.stringify({
              status: "completed",
              progress: 100,
              summary: "Alice completed the responsive design review.",
              deliverables: [{ type: "URL", name: "Alice design review", url: "https://example.test/alice-design" }],
            }),
          };
        },
      },
    },
  );
});

test("Alice session discovery exposes recent conversations and linked session metadata", async () => {
  assert.deepEqual(normalizeAliceSessions(JSON.stringify([{ sessionId: "session-a", title: "Design", messageCount: 3 }])), [
    {
      id: "session-a",
      title: "Design",
      createdAt: null,
      updatedAt: null,
      messageCount: 3,
      archived: false,
    },
  ]);

  await withServer(
    async (url) => {
      const blocked = await fetch(`${url}/api/projects/project-website/stages/design/agents/alice/sessions`);
      assert.equal(blocked.status, 400);

      const preview = await fetch(`${url}/api/projects/project-website/stages/design/alice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => response.json());
      await fetch(`${url}/api/alice-dispatches/${preview.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: preview.confirmationToken, confirm: true }),
      });

      const discovered = await fetch(`${url}/api/projects/project-website/stages/design/agents/alice/sessions`);
      assert.equal(discovered.status, 200);
      const result = await discovered.json();
      assert.equal(result.linkedSessionId, "alice-session-1");
      assert.deepEqual(result.linkedSession.status, { status: "idle" });
      assert.deepEqual(result.linkedSession.workspace, { workspace: "D:\\Alice\\Workspace\\alice-session-1" });
      assert.equal(result.sessions[0].title, "nomos design task");
    },
    {
      aliceCoordinatorOptions: {
        sendMessage: async () => ({ content: JSON.stringify({ sessionId: "alice-session-1" }) }),
        listConversations: async () => ({
          content: JSON.stringify([{ id: "alice-session-1", title: "nomos design task", messageCount: 4 }]),
        }),
        getConversationStatus: async () => ({ content: JSON.stringify({ status: "idle" }) }),
        getWorkspace: async () => ({ content: JSON.stringify({ workspace: "D:\\Alice\\Workspace\\alice-session-1" }) }),
      },
    },
  );
});

test("Alice task dispatch requires explicit confirmation", async () => {
  let sendCount = 0;
  await withServer(
    async (url) => {
      const previewResponse = await fetch(`${url}/api/projects/project-website/stages/design/alice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "请优先检查首页信息层级。" }),
      });
      assert.equal(previewResponse.status, 201);
      const preview = await previewResponse.json();
      assert.equal(preview.dispatch.status, "pending_confirmation");
      assert.match(preview.dispatch.message, /请优先检查首页信息层级/);
      assert.equal(preview.dispatch.tokenHash, undefined);

      const rejected = await fetch(`${url}/api/alice-dispatches/${preview.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
      });
      assert.equal(rejected.status, 400);
      assert.equal((await rejected.json()).error, "派发给 Alice 需要明确确认");
      assert.equal(sendCount, 0);
    },
    {
      aliceCoordinatorOptions: {
        sendMessage: async () => {
          sendCount += 1;
          return { content: "unexpected" };
        },
      },
    },
  );
});

test("confirmed Alice task dispatch records the workflow task handoff", async () => {
  const sentMessages = [];
  await withServer(
    async (url) => {
      const preview = await fetch(`${url}/api/projects/project-website/stages/design/alice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => response.json());

      const confirmed = await fetch(`${url}/api/alice-dispatches/${preview.dispatch.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: preview.confirmationToken, confirm: true }),
      });
      assert.equal(confirmed.status, 202);
      const dispatch = await confirmed.json();
      assert.equal(dispatch.status, "dispatched");
      assert.equal(dispatch.tokenHash, undefined);
      assert.equal(sentMessages.length, 1);
      assert.match(sentMessages[0], /nomos 本地项目协调任务/);

      const project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
      const task = project.workflowTasks.find((item) => item.id === preview.dispatch.taskId);
      assert.equal(task.status, "dispatched");
      assert.equal(task.dispatchedTo, "alice");
      assert.match(project.messages.at(-1).text, /派发给 Alice/);
      const audit = await fetch(`${url}/api/audit`).then((response) => response.json());
      assert.equal(audit[0].action, "alice.dispatch");

      const duplicate = await fetch(`${url}/api/projects/project-website/stages/design/alice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(duplicate.status, 400);
      assert.equal((await duplicate.json()).error, "当前任务已经派发给 Alice");
    },
    {
      aliceCoordinatorOptions: {
        sendMessage: async ({ message }) => {
          sentMessages.push(message);
          return { content: "Alice accepted" };
        },
      },
    },
  );
});

test("starting OpenClaw gateway requires explicit confirmation", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/bridge/openclaw/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "启动 OpenClaw 本地网关需要明确确认");
  });
});

test("untrusted browser origins cannot call local APIs", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://untrusted.example",
      },
      body: JSON.stringify({ title: "不应创建", goal: "验证来源拦截" }),
    });
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, "请求来源不受信任");
  });
});

test("local execution requires preview confirmation and stores output", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-workspace-"));
  try {
    await withServer(
      async (url) => {
        const previewResponse = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            agentId: "codex-cli",
            mode: "read-only",
            workspaceDir,
            prompt: "inspect this workspace",
          }),
        });
        assert.equal(previewResponse.status, 201);
        const preview = await previewResponse.json();
        assert.equal(preview.execution.status, "pending_confirmation");
        assert.equal(preview.execution.tokenHash, undefined);

        const listed = await fetch(`${url}/api/executions?projectId=project-website`).then((response) =>
          response.json(),
        );
        assert.equal(listed[0].tokenHash, undefined);

        const confirmResponse = await fetch(`${url}/api/executions/${preview.execution.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });
        assert.equal(confirmResponse.status, 202);

        let execution;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          execution = await fetch(`${url}/api/executions/${preview.execution.id}`).then((response) =>
            response.json(),
          );
          if (execution.status !== "running") break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(execution.status, "succeeded");
        assert.equal(execution.output, "received:inspect this workspace");

        const project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
        assert.match(project.messages.at(-1).text, /本地任务已完成/);
      },
      { executionManagerOptions: createTestExecutionOptions(workspaceDir) },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("running local execution can be cancelled without leaking confirmation hashes", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-cancel-"));
  try {
    await withServer(
      async (url) => {
        const preview = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            agentId: "codex-cli",
            mode: "read-only",
            workspaceDir,
            prompt: "keep running until cancelled",
          }),
        }).then((response) => response.json());
        await fetch(`${url}/api/executions/${preview.execution.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });
        const cancel = await fetch(`${url}/api/executions/${preview.execution.id}/cancel`, {
          method: "POST",
        });
        assert.equal(cancel.status, 200);

        let execution;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          execution = await fetch(`${url}/api/executions/${preview.execution.id}`).then((response) =>
            response.json(),
          );
          if (execution.status === "cancelled") break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(execution.status, "cancelled");
        assert.equal(execution.tokenHash, undefined);

        const retry = await fetch(`${url}/api/executions/${preview.execution.id}/retry`, {
          method: "POST",
        });
        assert.equal(retry.status, 201);
        const retryPayload = await retry.json();
        assert.equal(retryPayload.execution.status, "pending_confirmation");
      },
      { executionManagerOptions: createSlowExecutionOptions(workspaceDir) },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("stale running executions are marked interrupted after restart", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-recover-"));
  try {
    const first = createNomosServer({ dataDir });
    await first.start();
    first.store.update((data) => {
      data.executions.push({
        id: "stale-execution",
        projectId: "project-website",
        agentId: "codex-cli",
        agentName: "Codex CLI",
        mode: "read-only",
        prompt: "stale task",
        workspaceDir: dataDir,
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tokenHash: "secret",
        output: "",
        errorOutput: "",
      });
      return data.executions.at(-1);
    });
    await first.stop();

    const second = createNomosServer({ dataDir });
    const address = await second.start();
    try {
      const execution = await fetch(`${address.url}/api/executions/stale-execution`).then((response) =>
        response.json(),
      );
      assert.equal(execution.status, "interrupted");
      assert.equal(execution.tokenHash, undefined);
      assert.match(execution.errorOutput, /尚未完成/);
    } finally {
      await second.stop();
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("workspace-write execution needs a second explicit confirmation", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-workspace-"));
  try {
    await withServer(
      async (url) => {
        const preview = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            agentId: "codex-cli",
            mode: "workspace-write",
            workspaceDir,
            prompt: "write files",
          }),
        }).then((response) => response.json());

        const rejected = await fetch(`${url}/api/executions/${preview.execution.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });
        assert.equal(rejected.status, 400);
        const payload = await rejected.json();
        assert.equal(payload.error, "代码写入任务需要再次确认");
      },
      { executionManagerOptions: createTestExecutionOptions(workspaceDir) },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("directories outside default roots need explicit authorization", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-authorize-"));
  try {
    await withServer(
      async (url) => {
        const payload = {
          projectId: "project-website",
          agentId: "codex-cli",
          mode: "read-only",
          workspaceDir,
          prompt: "inspect authorized workspace",
        };
        const blocked = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        assert.equal(blocked.status, 400);
        assert.equal((await blocked.json()).error, "工作目录不在允许范围内");

        const authorization = await fetch(`${url}/api/bridge/workspaces/allow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceDir, confirm: true }),
        });
        assert.equal(authorization.status, 201);

        const allowed = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        assert.equal(allowed.status, 201);
      },
      {
        executionManagerOptions: {
          ...createTestExecutionOptions(workspaceDir),
          allowedRoots: [path.join(workspaceDir, "not-the-workspace")],
        },
      },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("project settings and assets can be managed", async () => {
  await withServer(async (url) => {
    const patch = await fetch(`${url}/api/projects/project-website`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated project", team: "Desktop team" }),
    });
    assert.equal(patch.status, 200);
    assert.equal((await patch.json()).title, "Updated project");

    const added = await fetch(`${url}/api/projects/project-website/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageKey: "design", type: "url", name: "Local docs", url: "https://example.test/docs" }),
    });
    assert.equal(added.status, 201);
    const asset = await added.json();
    assert.equal(asset.type, "URL");
    assert.equal(asset.stageKey, "design");
    let project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.equal(project.stages.find((stage) => stage.key === "design").deliverableIds.includes(asset.id), true);

    const removed = await fetch(`${url}/api/projects/project-website/assets/${asset.id}`, {
      method: "DELETE",
    });
    assert.equal(removed.status, 200);
    project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.equal(project.assets.some((item) => item.id === asset.id), false);
    assert.equal(project.stages.find((stage) => stage.key === "design").deliverableIds.includes(asset.id), false);
  });
});

test("explicit directory authorization can be revoked", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-revoke-"));
  try {
    await withServer(
      async (url) => {
        const authorization = await fetch(`${url}/api/bridge/workspaces/allow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceDir, confirm: true }),
        });
        assert.equal(authorization.status, 201);

        const revoke = await fetch(`${url}/api/bridge/workspaces/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceDir, confirm: true }),
        });
        assert.equal(revoke.status, 200);

        const blocked = await fetch(`${url}/api/executions/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "project-website",
            agentId: "codex-cli",
            mode: "read-only",
            workspaceDir,
            prompt: "inspect revoked workspace",
          }),
        });
        assert.equal(blocked.status, 400);
      },
      {
        executionManagerOptions: {
          ...createTestExecutionOptions(workspaceDir),
          allowedRoots: [path.join(workspaceDir, "not-the-workspace")],
        },
      },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("CLI adapter commands require confirmation and can return to automatic detection", async () => {
  await withServer(async (url) => {
    const rejected = await fetch(`${url}/api/bridge/adapters/claude-code`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: process.execPath }),
    });
    assert.equal(rejected.status, 400);

    const blocked = await fetch(`${url}/api/bridge/adapters/alice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: process.execPath, confirm: true }),
    });
    assert.equal(blocked.status, 400);

    const configured = await fetch(`${url}/api/bridge/adapters/claude-code`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: process.execPath, confirm: true }),
    });
    assert.equal(configured.status, 200);
    const configuredPayload = await configured.json();
    assert.equal(configuredPayload.configuredCommand, process.execPath);
    assert.equal(configuredPayload.tool.command, process.execPath);
    assert.equal(configuredPayload.tool.configurable, true);

    const bridge = await fetch(`${url}/api/bridge`).then((response) => response.json());
    assert.equal(bridge.adapterCommands["claude-code"], process.execPath);

    const reset = await fetch(`${url}/api/bridge/adapters/claude-code`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "", confirm: true }),
    });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).configuredCommand, null);
    const after = await fetch(`${url}/api/bridge`).then((response) => response.json());
    assert.equal(after.adapterCommands["claude-code"], undefined);
  });
});

test("local backups require confirmation and diagnostics expose sanitized status", async () => {
  await withServer(async (url) => {
    const rejected = await fetch(`${url}/api/system/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(rejected.status, 400);

    const created = await fetch(`${url}/api/system/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, reason: "test" }),
    });
    assert.equal(created.status, 201);
    const backup = await created.json();
    assert.match(backup.fileName, /^nomos-data-.*-test\.json$/);
    assert.equal(fs.existsSync(backup.filePath), true);

    const backups = await fetch(`${url}/api/system/backups`).then((response) => response.json());
    assert.equal(backups.length, 1);
    assert.equal(backups[0].fileName, backup.fileName);

    const diagnostics = await fetch(`${url}/api/system/diagnostics`).then((response) => response.json());
    assert.equal(diagnostics.status, "ok");
    assert.equal(diagnostics.dataVersion, 9);
    assert.equal(diagnostics.backupCount, 1);
    assert.equal(diagnostics.projectCount, 3);
    assert.equal(diagnostics.adapters.some((adapter) => adapter.id === "alice"), true);
    assert.equal(JSON.stringify(diagnostics).includes("token"), false);
  });
});

test("local backup restore validates snapshots and creates a protection backup", async () => {
  await withServer(async (url) => {
    const created = await fetch(`${url}/api/system/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true, reason: "restore-target" }),
    }).then((response) => response.json());

    await fetch(`${url}/api/projects/project-website`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Changed after backup" }),
    });

    const inspected = await fetch(`${url}/api/system/backups/${encodeURIComponent(created.fileName)}/inspect`);
    assert.equal(inspected.status, 200);
    assert.equal((await inspected.json()).projectCount, 3);

    const rejected = await fetch(`${url}/api/system/backups/${encodeURIComponent(created.fileName)}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(rejected.status, 400);

    const traversal = await fetch(`${url}/api/system/backups/${encodeURIComponent("../nomos-data.json")}/inspect`);
    assert.equal(traversal.status, 400);

    const restored = await fetch(`${url}/api/system/backups/${encodeURIComponent(created.fileName)}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    assert.equal(restored.status, 200);
    const result = await restored.json();
    assert.equal(result.restored, true);
    assert.match(result.protectionBackup.fileName, /pre-restore\.json$/);
    assert.equal(fs.existsSync(result.protectionBackup.filePath), true);

    const project = await fetch(`${url}/api/projects/project-website`).then((response) => response.json());
    assert.notEqual(project.title, "Changed after backup");
    const backups = await fetch(`${url}/api/system/backups`).then((response) => response.json());
    assert.equal(backups.length, 2);
  });
});

test("local backup restore is blocked while an execution is active", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-restore-active-"));
  try {
    const store = new JsonStore({ dataDir });
    store.load();
    const backup = store.backup({ confirm: true, reason: "active-execution" });
    store.update((data) => {
      const execution = { id: "execution-running", status: "running" };
      data.executions.push(execution);
      return execution;
    });

    assert.throws(
      () => store.restoreBackup({ fileName: backup.fileName, confirm: true }),
      /Cannot restore a backup while local executions are active/
    );
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test("local preview deployment runs a confirmed npm script and enters final review", async () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-preview-"));
  const calls = [];
  try {
    await withServer(
      async (url) => {
        await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });
        await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });
        await fetch(`${url}/api/projects/project-website/advance`, { method: "POST" });

        const blockedUrl = await fetch(`${url}/api/deployments/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: "project-website", workspaceDir, script: "build", previewUrl: "https://example.test" }),
        });
        assert.equal(blockedUrl.status, 400);

        const preview = await fetch(`${url}/api/deployments/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: "project-website", workspaceDir, script: "build:preview", previewUrl: "http://127.0.0.1:4174" }),
        }).then((response) => response.json());
        assert.equal(preview.deployment.commandPreview, "npm run build:preview");
        assert.equal(preview.deployment.tokenHash, undefined);

        const rejected = await fetch(`${url}/api/deployments/${preview.deployment.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
        });
        assert.equal(rejected.status, 400);
        assert.equal(calls.length, 0);

        const confirmed = await fetch(`${url}/api/deployments/${preview.deployment.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationToken: preview.confirmationToken, confirm: true }),
        });
        assert.equal(confirmed.status, 201);
        const result = await confirmed.json();
        assert.deepEqual(calls, [{ workspaceDir, script: "build:preview" }]);
        assert.equal(result.stage.status, "review_pending");
        assert.equal(result.deployment.url, "http://127.0.0.1:4174/");
        assert.equal(result.deliverables[0].name, "Local preview");
        assert.equal(result.project.checkpoints.find((item) => item.stageKey === "deploy").status, "pending");
      },
      {
        executionManagerOptions: { allowedRoots: [workspaceDir] },
        deploymentManagerOptions: {
          runScript: ({ workspaceDir: targetDir, script }) => {
            calls.push({ workspaceDir: targetDir, script });
            return "preview build complete";
          },
        },
      },
    );
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test("shutdown preserves interrupted execution state", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-shutdown-"));
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-shutdown-workspace-"));
  try {
    const first = createNomosServer({
      dataDir,
      executionManagerOptions: createSlowExecutionOptions(workspaceDir),
    });
    seedDemoWorkspace(first.store);
    const address = await first.start();
    const preview = await fetch(`${address.url}/api/executions/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-website",
        agentId: "codex-cli",
        mode: "read-only",
        workspaceDir,
        prompt: "remain active during shutdown",
      }),
    }).then((response) => response.json());
    await fetch(`${address.url}/api/executions/${preview.execution.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationToken: preview.confirmationToken }),
    });
    await first.stop();
    await new Promise((resolve) => setTimeout(resolve, 250));

    const second = createNomosServer({ dataDir });
    const secondAddress = await second.start();
    try {
      const execution = await fetch(`${secondAddress.url}/api/executions/${preview.execution.id}`).then(
        (response) => response.json(),
      );
      assert.equal(execution.status, "interrupted");
    } finally {
      await second.stop();
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
});

// ─── V1.1 Organization Management Tests ──────────────────────────

test("skill CRUD with name uniqueness and reference check", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };

    // Create skill
    const created = await fetch(`${url}/api/skills`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "战略规划", description: "制定中长期战略目标和路径", category: "role-specific", level: 4, source: "huawei_methodology" }),
    });
    assert.equal(created.status, 201);
    const createdData = await created.json();
    assert.equal(createdData.data.name, "战略规划");
    const skillId = createdData.data.id;

    // Reject duplicate name
    const dup = await fetch(`${url}/api/skills`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "战略规划", description: "重复" }),
    });
    assert.equal(dup.status, 409);

    // Get single skill
    const fetched = await fetch(`${url}/api/skills/${skillId}`);
    assert.equal(fetched.status, 200);
    assert.equal((await fetched.json()).data.id, skillId);

    // List skills
    const list = await fetch(`${url}/api/skills`);
    assert.equal(list.status, 200);
    assert.ok((await list.json()).data.length >= 1);

    // Update skill
    const updated = await fetch(`${url}/api/skills/${skillId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ description: "更新描述", level: 3 }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).data.level, 3);

    // Create a role referencing this skill
    const role = await fetch(`${url}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "CEO/总经理", description: "经营决策", family: "经营与战略", type: "hybrid", skillIds: [skillId] }),
    });
    assert.equal(role.status, 201);
    const roleId = (await role.json()).data.id;

    // Cannot rename skill when referenced by role
    const renameBlocked = await fetch(`${url}/api/skills/${skillId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "战略规划V2" }),
    });
    assert.equal(renameBlocked.status, 409);

    // Cannot delete skill when referenced by role
    const deleteBlocked = await fetch(`${url}/api/skills/${skillId}`, { method: "DELETE" });
    assert.equal(deleteBlocked.status, 409);
    const blockedPayload = await deleteBlocked.json();
    assert.ok(blockedPayload.referencingRoles.length >= 1);

    // Delete role, then delete skill
    await fetch(`${url}/api/roles/${roleId}`, { method: "DELETE" });
    const deleted = await fetch(`${url}/api/skills/${skillId}`, { method: "DELETE" });
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json()).data.deleted, true);

    // 404 after delete
    const gone = await fetch(`${url}/api/skills/${skillId}`);
    assert.equal(gone.status, 404);
  });
});

test("role CRUD with default protection and employee binding check", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };

    // Create a skill first
    const skill = await fetch(`${url}/api/skills`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "项目管理", description: "项目管理能力", category: "general", level: 3, source: "huawei_methodology" }),
    });
    const skillId = (await skill.json()).data.id;

    // Create role
    const created = await fetch(`${url}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "项目经理", description: "负责交付", family: "交付与运营", type: "hybrid", skillIds: [skillId], acceptanceCriteria: "按时交付" }),
    });
    assert.equal(created.status, 201);
    const roleId = (await created.json()).data.id;

    // Reject empty name
    const emptyName = await fetch(`${url}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "", description: "空名" }),
    });
    assert.equal(emptyName.status, 400);

    // Reject duplicate name
    const dup = await fetch(`${url}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "项目经理", description: "重复" }),
    });
    assert.equal(dup.status, 409);

    // Update role
    const updated = await fetch(`${url}/api/roles/${roleId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ description: "负责项目交付和质量管理", flowNotes: "所有项目必须经过验收" }),
    });
    assert.equal(updated.status, 200);

    // Delete non-default role
    const deleted = await fetch(`${url}/api/roles/${roleId}`, { method: "DELETE" });
    assert.equal(deleted.status, 200);

    // Init defaults, then try to delete a default role
    await fetch(`${url}/api/org/init-defaults`, { method: "POST", headers });
    const defaultRoles = await fetch(`${url}/api/roles?family=经营与战略`).then((r) => r.json());
    const defaultRole = defaultRoles.data.find((r) => r.isDefault);
    assert.ok(defaultRole, "should have a default role");

    const deleteDefault = await fetch(`${url}/api/roles/${defaultRole.id}`, { method: "DELETE" });
    assert.equal(deleteDefault.status, 403);
  });
});

test("employee CRUD with agent reference and soft delete", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };

    // Get available agents
    const workspace = await fetch(`${url}/api/workspace`).then((r) => r.json());
    const agents = workspace.agents || [];
    const cloudAgent = agents.find((a) => a.id === "product-director");
    assert.ok(cloudAgent, "should have a cloud agent for testing");

    // Create carbon employee
    const carbon = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "张三", type: "carbon" }),
    });
    assert.equal(carbon.status, 201);
    const carbonEmp = (await carbon.json()).data;
    assert.equal(carbonEmp.type, "carbon");
    assert.equal(carbonEmp.agentId, null);
    const carbonId = carbonEmp.id;

    // Carbon employee cannot have agentId
    const carbonWithAgent = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "李四", type: "carbon", agentId: cloudAgent.id }),
    });
    assert.equal(carbonWithAgent.status, 400);

    // Create silicon employee with agent
    const silicon = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "硅基助手", type: "silicon", agentId: cloudAgent.id }),
    });
    assert.equal(silicon.status, 201);
    const siliconEmp = (await silicon.json()).data;
    assert.equal(siliconEmp.agentId, cloudAgent.id);
    assert.ok(siliconEmp.digitalEmployeeDraft);
    assert.equal(siliconEmp.digitalEmployeeDraft.status, "empty");
    const siliconId = siliconEmp.id;

    // Silicon without agentId should fail
    const siliconNoAgent = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "无Agent硅基", type: "silicon" }),
    });
    assert.equal(siliconNoAgent.status, 400);

    // Soft delete employee
    const deleted = await fetch(`${url}/api/employees/${carbonId}`, { method: "DELETE" });
    assert.equal(deleted.status, 200);

    // Employee still exists but inactive
    const stillThere = await fetch(`${url}/api/employees/${carbonId}`);
    assert.equal(stillThere.status, 200);
    assert.equal((await stillThere.json()).data.status, "inactive");

    // Default list doesn't include inactive
    const list = await fetch(`${url}/api/employees`);
    const listData = await list.json();
    assert.ok(!listData.data.some((e) => e.id === carbonId));

    // But can query with status=inactive
    const inactiveList = await fetch(`${url}/api/employees?status=inactive`);
    const inactiveData = await inactiveList.json();
    assert.ok(inactiveData.data.some((e) => e.id === carbonId));
  });
});

test("digital employee draft state machine validation", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };
    const workspace = await fetch(`${url}/api/workspace`).then((r) => r.json());
    const agentId = workspace.agents[0]?.id;
    assert.ok(agentId);

    // Create silicon employee
    const emp = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "数字员工A", type: "silicon", agentId }),
    });
    const empId = (await emp.json()).data.id;

    // Try skipping steps: empty -> onboarding (should fail)
    const skipStep = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "onboarding" } }),
    });
    assert.equal(skipStep.status, 400);

    // Valid transition: empty -> skill_matching
    const step1 = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "skill_matching", targetRoleId: null, skillMatching: { acceptanceCriteria: "测试" } } }),
    });
    assert.equal(step1.status, 200);

    // Valid transition: skill_matching -> onboarding
    const step2 = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "onboarding", onboarding: { knowledgeBaseRefs: [] } } }),
    });
    assert.equal(step2.status, 200);

    // Valid transition: onboarding -> mentorship
    const step3 = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "mentorship", mentorship: { sops: [] } } }),
    });
    assert.equal(step3.status, 200);

    // Valid transition: mentorship -> draft_complete
    const complete = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "draft_complete" } }),
    });
    assert.equal(complete.status, 200);

    // Invalid: draft_complete -> empty (backward)
    const backward = await fetch(`${url}/api/employees/${empId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ digitalEmployeeDraft: { status: "empty" } }),
    });
    assert.equal(backward.status, 400);
  });
});

test("organization health overview computation", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };

    // Health with empty data
    const emptyHealth = await fetch(`${url}/api/org/health`).then((r) => r.json());
    assert.equal(emptyHealth.skillCount, 0);
    assert.equal(emptyHealth.roleCount, 0);
    assert.equal(emptyHealth.employeeCount.total, 0);
    assert.equal(emptyHealth.agentCoverageRate, 0);

    // Init defaults
    await fetch(`${url}/api/org/init-defaults`, { method: "POST", headers });

    // Health after defaults
    const health = await fetch(`${url}/api/org/health`).then((r) => r.json());
    assert.ok(health.skillCount > 0);
    assert.ok(health.roleCount > 0);
    assert.ok(health.emptyFamilies.length === 0, "all families should have roles after init");
    assert.ok(Array.isArray(health.rolesWithoutEmployees));
    assert.ok(Array.isArray(health.rolesWithoutSkills));
  });
});

test("default org template generation and idempotency", async () => {
  await withServer(async (url) => {
    const headers = { "Content-Type": "application/json" };

    // Generate defaults
    const first = await fetch(`${url}/api/org/init-defaults`, { method: "POST", headers });
    assert.equal(first.status, 201);
    const firstData = (await first.json()).data;
    assert.ok(firstData.skillsCreated > 0);
    assert.ok(firstData.rolesCreated > 0);

    // Second attempt should fail (idempotency)
    const second = await fetch(`${url}/api/org/init-defaults`, { method: "POST", headers });
    assert.equal(second.status, 409);

    // Verify roles are marked as default
    const roles = await fetch(`${url}/api/roles`).then((r) => r.json());
    const defaultRoles = roles.data.filter((r) => r.isDefault);
    assert.ok(defaultRoles.length > 0);

    // Verify skills are linked to roles
    const skills = await fetch(`${url}/api/skills`).then((r) => r.json());
    for (const role of defaultRoles) {
      if (role.skillIds && role.skillIds.length > 0) {
        for (const sid of role.skillIds) {
          assert.ok(skills.data.some((s) => s.id === sid), `skill ${sid} should exist for role ${role.name}`);
        }
      }
    }
  });
});

test("data migration from v6 to v9 preserves existing data", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-migrate-"));
  try {
    // Write v6 format data
    const v6Data = {
      version: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projects: [],
      agents: [],
      agentAdapters: {},
      audit: [],
      executions: [],
      bridge: { id: "desktop-bridge", status: "offline", command: "nomos bridge pair", allowedWorkspaces: [], adapterCommands: {} },
    };
    fs.writeFileSync(path.join(dataDir, "nomos-data.json"), JSON.stringify(v6Data, null, 2));

    // Load with JsonStore (triggers migration)
    const store = new JsonStore({ dataDir });
    const data = store.load();

    assert.equal(data.version, 9);
    assert.ok(Array.isArray(data.skills));
    assert.ok(Array.isArray(data.roles));
    assert.ok(Array.isArray(data.employees));
    assert.ok(Array.isArray(data.flowTemplates));
    assert.ok(Array.isArray(data.workItems));
    assert.ok(Array.isArray(data.workItemEvents));
    assert.equal(data.skills.length, 0);
    assert.equal(data.roles.length, 0);
    assert.equal(data.employees.length, 0);
    assert.equal(data.flowTemplates.length, 0);
    assert.equal(data.workItems.length, 0);
    assert.equal(data.workItemEvents.length, 0);

    // Existing data preserved
    assert.ok(Array.isArray(data.projects));
    assert.ok(Array.isArray(data.agents));
    assert.ok(Array.isArray(data.audit));
    assert.ok(Array.isArray(data.executions));
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

// ─── v1.2 Flow Management ────────────────────────────────────────────

async function createFlow(url, body) {
  const response = await fetch(`${url}/api/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response;
}

async function createWorkItemRequest(url, body) {
  return fetch(`${url}/api/work-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleFlowBody = {
  name: "LTC 自定义",
  description: "测试用流程",
  category: "value",
  tags: ["销售"],
  stages: [
    { name: "管理线索", gate: { reviewMode: "carbon", entryConditions: "有线索", exitCriteria: "线索分级" } },
    { name: "管理机会点", gate: { reviewMode: "hybrid" } },
    { name: "管理合同执行", gate: { reviewMode: "carbon" } },
  ],
};

test("flow templates support full CRUD with validation", async () => {
  await withServer(async (url) => {
    // create
    const created = await createFlow(url, sampleFlowBody);
    assert.equal(created.status, 201);
    const template = (await created.json()).data;
    assert.ok(template.id);
    assert.equal(template.category, "value");
    assert.equal(template.stages.length, 3);
    assert.equal(template.stages[0].order, 0);
    assert.equal(template.stages[1].gate.reviewMode, "hybrid");
    assert.equal(template.isPreset, false);

    // empty name -> 400
    const blank = await createFlow(url, { name: "", stages: [] });
    assert.equal(blank.status, 400);

    // invalid category -> 400
    const badCategory = await createFlow(url, { name: "X", category: "nope", stages: [] });
    assert.equal(badCategory.status, 400);

    // duplicate name -> 409
    const dup = await createFlow(url, sampleFlowBody);
    assert.equal(dup.status, 409);

    // list
    const list = await (await fetch(`${url}/api/flows`)).json();
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].stageCount, 3);
    assert.equal(list.data[0].usageCount, 0);

    // list filter by category
    const enablingList = await (await fetch(`${url}/api/flows?category=enabling`)).json();
    assert.equal(enablingList.data.length, 0);

    // get one
    const one = await (await fetch(`${url}/api/flows/${template.id}`)).json();
    assert.equal(one.data.name, "LTC 自定义");

    // patch
    const patched = await fetch(`${url}/api/flows/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "LTC 改名", category: "enabling" }),
    });
    assert.equal(patched.status, 200);
    const patchedTemplate = (await patched.json()).data;
    assert.equal(patchedTemplate.name, "LTC 改名");
    assert.equal(patchedTemplate.category, "enabling");

    // delete
    const deleted = await fetch(`${url}/api/flows/${template.id}`, { method: "DELETE" });
    assert.equal(deleted.status, 200);
    const emptyList = await (await fetch(`${url}/api/flows`)).json();
    assert.equal(emptyList.data.length, 0);
  });
});

test("preset flow templates initialize once and are idempotent", async () => {
  await withServer(async (url) => {
    const first = await fetch(`${url}/api/flows/init-presets`, { method: "POST" });
    assert.equal(first.status, 201);
    const result = (await first.json()).data;
    assert.equal(result.created, 3);

    const list = await (await fetch(`${url}/api/flows`)).json();
    assert.equal(list.data.length, 3);
    assert.ok(list.data.every((t) => t.isPreset === true));
    assert.ok(list.data.some((t) => t.name === "LTC 轻量版"));
    assert.ok(list.data.some((t) => t.name === "IPD 轻量版"));
    assert.ok(list.data.some((t) => t.name === "ITR 轻量版"));

    // second init is blocked
    const second = await fetch(`${url}/api/flows/init-presets`, { method: "POST" });
    assert.equal(second.status, 409);
  });
});

test("projects bind, rebind and unbind flow templates", async () => {
  await withServer(async (url) => {
    const templateA = (await (await createFlow(url, sampleFlowBody)).json()).data;
    const templateB = (await (await createFlow(url, { ...sampleFlowBody, name: "另一条流程" })).json()).data;

    // bind on create
    const created = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "绑定项目", goal: "测试绑定", flowTemplateId: templateA.id }),
    });
    assert.equal(created.status, 201);
    const project = await created.json();
    assert.equal(project.flowTemplateId, templateA.id);
    assert.equal(project.flowStages.length, 3);
    assert.ok(project.flowStages.every((s) => s.gateStatus === "pending"));

    // usage count reflects binding
    const list = await (await fetch(`${url}/api/flows`)).json();
    assert.equal(list.data.find((t) => t.id === templateA.id).usageCount, 1);

    // rebind to template B
    const rebind = await fetch(`${url}/api/projects/${project.id}/flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowTemplateId: templateB.id }),
    });
    assert.equal(rebind.status, 200);
    assert.equal((await rebind.json()).flowTemplateId, templateB.id);

    // delete-referenced check (template B is in use) -> 409
    const blockedDelete = await fetch(`${url}/api/flows/${templateB.id}`, { method: "DELETE" });
    assert.equal(blockedDelete.status, 409);
    const blockedBody = await blockedDelete.json();
    assert.equal(blockedBody.referencingProjects.length, 1);

    // unbind
    const unbind = await fetch(`${url}/api/projects/${project.id}/flow`, { method: "DELETE" });
    assert.equal(unbind.status, 200);
    const unbound = await unbind.json();
    assert.equal(unbound.flowTemplateId, null);
    assert.equal(unbound.flowStages.length, 0);

    // now template B can be deleted
    const okDelete = await fetch(`${url}/api/flows/${templateB.id}`, { method: "DELETE" });
    assert.equal(okDelete.status, 200);
  });
});

test("gate review advances, blocks and reworks the flow", async () => {
  await withServer(async (url) => {
    const template = (await (await createFlow(url, sampleFlowBody)).json()).data;
    const project = await (await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "评审项目", goal: "测试关口", flowTemplateId: template.id }),
    })).json();
    const [s1, s2, s3] = project.flowStages;

    const review = (stageId, body) =>
      fetch(`${url}/api/projects/${project.id}/flow/stages/${stageId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    // cannot review a non-current stage
    const outOfOrder = await review(s2.id, { action: "pass" });
    assert.equal(outOfOrder.status, 400);

    // pass stage 1 -> advances to stage 2
    const pass1 = await review(s1.id, { action: "pass", reviewer: "总经理" });
    assert.equal(pass1.status, 200);
    const pass1Body = await pass1.json();
    assert.equal(pass1Body.stage.gateStatus, "passed");
    assert.equal(pass1Body.currentFlowStageId, s2.id);

    // fail stage 2 -> stays current, marked failed
    const fail2 = await review(s2.id, { action: "fail", comment: "材料不全" });
    assert.equal(fail2.status, 200);
    const fail2Body = await fail2.json();
    assert.equal(fail2Body.stage.gateStatus, "failed");
    assert.equal(fail2Body.currentFlowStageId, s2.id);

    // pass stage 2 -> advances to stage 3
    const pass2 = await review(s2.id, { action: "pass" });
    assert.equal((await pass2.json()).currentFlowStageId, s3.id);

    // rework stage 3 back to stage 1
    const rework = await review(s3.id, { action: "rework", targetStageId: s1.id, comment: "需求变更" });
    assert.equal(rework.status, 200);
    const reworkBody = await rework.json();
    assert.equal(reworkBody.currentFlowStageId, s1.id);

    // verify gate statuses after rework: stage1 returned, others pending
    const after = await (await fetch(`${url}/api/projects/${project.id}/flow/progress`)).json();
    const byId = Object.fromEntries(after.data.flowStages.map((s) => [s.id, s.gateStatus]));
    assert.equal(byId[s1.id], "returned");
    assert.equal(byId[s2.id], "pending");
    assert.equal(byId[s3.id], "pending");
    assert.equal(after.data.completed, false);
    assert.equal(after.data.passed, 0);

    // pass all three -> completed
    await review(s1.id, { action: "pass" });
    await review(s2.id, { action: "pass" });
    const final = await review(s3.id, { action: "pass" });
    const finalBody = await final.json();
    assert.equal(finalBody.completed, true);
    assert.equal(finalBody.currentFlowStageId, null);
  });
});

test("gate review rejects review on projects without a flow template", async () => {
  await withServer(async (url) => {
    const project = await (await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "无流程项目", goal: "兼容性" }),
    })).json();
    // backward compatible defaults
    assert.equal(project.flowTemplateId, null);
    assert.ok(Array.isArray(project.flowStages));
    assert.equal(project.flowStages.length, 0);
    // existing five-stage workflow still present
    assert.equal(project.stages.length, 5);

    const review = await fetch(`${url}/api/projects/${project.id}/flow/stages/whatever/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pass" }),
    });
    assert.equal(review.status, 400);
  });
});

test("binding a non-existent flow template is rejected", async () => {
  await withServer(async (url) => {
    const created = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X", goal: "Y", flowTemplateId: "does-not-exist" }),
    });
    assert.equal(created.status, 400);
  });
});

// ─── v1.3 Work Items And Dashboards ─────────────────────────────────

test("work items support flow-stage mapping, events and dependency guardrails", async () => {
  await withServer(async (url) => {
    const template = (await (await createFlow(url, sampleFlowBody)).json()).data;
    const project = await (await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "V1.3 工作项项目", goal: "验证工作项", flowTemplateId: template.id }),
    })).json();
    const flowStage = project.flowStages[0];

    const predecessor = await createWorkItemRequest(url, {
      projectId: project.id,
      title: "竞品分析",
      description: "- [x] 收集竞品\n- [ ] 输出结论",
      estimateHours: 2,
      assignee: { type: "agent", id: "codex-cli", name: "Codex CLI" },
    });
    assert.equal(predecessor.status, 201);
    const predecessorItem = (await predecessor.json()).data;
    assert.equal(predecessorItem.checklist.total, 2);
    assert.equal(predecessorItem.checklist.completed, 1);

    const dependent = await createWorkItemRequest(url, {
      projectId: project.id,
      sourceType: "flow_stage",
      flowInstanceId: project.id,
      flowStageId: flowStage.id,
      title: "报价草案",
      estimateHours: 3,
      dependsOn: [predecessorItem.id],
      assignee: { type: "agent", id: "codex-cli", name: "Codex CLI" },
    });
    assert.equal(dependent.status, 201);
    const dependentItem = (await dependent.json()).data;
    assert.equal(dependentItem.sourceType, "flow_stage");
    assert.equal(dependentItem.flowTemplateId, template.id);
    assert.equal(dependentItem.flowStageId, flowStage.id);
    assert.equal(dependentItem.templateStageId, flowStage.stageTemplateId);
    assert.equal(dependentItem.status, "waiting_dependency");

    const blockedStart = await fetch(`${url}/api/work-items/${dependentItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    assert.equal(blockedStart.status, 409);
    const blockedBody = await blockedStart.json();
    assert.equal(blockedBody.details.unmetDependencies[0].id, predecessorItem.id);

    const cycle = await fetch(`${url}/api/work-items/${predecessorItem.id}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependencyId: dependentItem.id }),
    });
    assert.equal(cycle.status, 409);

    const done = await fetch(`${url}/api/work-items/${predecessorItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(done.status, 200);

    const started = await fetch(`${url}/api/work-items/${dependentItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress", progress: 40 }),
    });
    assert.equal(started.status, 200);
    const startedItem = (await started.json()).data;
    assert.equal(startedItem.status, "in_progress");
    assert.equal(startedItem.progress, 40);

    const events = await fetch(`${url}/api/work-items/${dependentItem.id}/events`).then((response) => response.json());
    assert.ok(events.data.some((event) => event.type === "item.created"));
    assert.ok(events.data.some((event) => event.type === "flow_stage.linked"));
    assert.ok(events.data.some((event) => event.type === "dependency.added"));
    assert.ok(events.data.some((event) => event.type === "status.changed"));

    const progress = await fetch(`${url}/api/dashboards/progress?projectId=${project.id}`).then((response) => response.json());
    assert.equal(progress.data.total, 3);
    assert.equal(progress.data.done, 1);
    assert.equal(progress.data.activeEstimateHours, 5);
    assert.equal(progress.data.doneEstimateHours, 2);
    assert.ok(progress.data.stageGroups.some((group) => group.key === flowStage.id));

    const resources = await fetch(`${url}/api/dashboards/resources?projectId=${project.id}`).then((response) => response.json());
    const codex = resources.data.resources.find((group) => group.assignee.id === "codex-cli");
    assert.ok(codex);
    assert.equal(codex.inProgress, 1);
    assert.equal(codex.recentlyDone, 1);
  });
});

test("legacy workflow tasks are mirrored into work items idempotently", async () => {
  await withServer(async (url) => {
    const first = await fetch(`${url}/api/work-items/sync-legacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "project-website" }),
    });
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.ok(firstBody.data.created >= 1);

    const list = await fetch(`${url}/api/work-items?projectId=project-website&sourceType=legacy_workflow_task`).then((response) => response.json());
    assert.ok(list.data.length >= 1);
    assert.ok(list.data.every((item) => item.sourceType === "legacy_workflow_task"));
    assert.ok(list.data.every((item) => item.legacyWorkflowTaskId));
    assert.ok(list.data.every((item) => item.projectId === "project-website"));

    const second = await fetch(`${url}/api/work-items/sync-legacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "project-website" }),
    });
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.data.created, 0);

    const summary = await fetch(`${url}/api/projects/project-website/board-summary`).then((response) => response.json());
    assert.ok(summary.data.total >= list.data.length);
    assert.equal(summary.data.projectGroups[0].key, "project-website");
  });
});
