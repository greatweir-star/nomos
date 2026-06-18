"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const { createHash, randomUUID } = require("node:crypto");
const { buildAgentTaskEnvelope, markTaskDispatched, recordExecutionReceipt } = require("./workflow");
const { routeKey } = require("./agent-router");
const { updateWorkItem } = require("./work-items");
const {
  createDefaultAdapters,
  findCommandCandidates,
  findExecutable,
  findNpmScript,
  getOpenClawScript,
  probeTcpPort,
} = require("./local-agent-adapters");

const MAX_OUTPUT_CHARS = 12000;
const MAX_PROMPT_CHARS = 8000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function stripAnsi(value) {
  return String(value || "").replace(
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    "",
  );
}

function trimOutput(value) {
  const clean = stripAnsi(value);
  if (clean.length <= MAX_OUTPUT_CHARS) return clean;
  return `${clean.slice(0, MAX_OUTPUT_CHARS)}\n\n[输出已截断]`;
}

function readWorkspaceChanges(workspaceDir) {
  try {
    return execFileSync("git", ["-C", workspaceDir, "status", "--short", "--untracked-files=all"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 100);
  } catch {
    return [];
  }
}

function diffWorkspaceChanges(before, after) {
  const previous = new Set(before || []);
  return (after || []).filter((item) => !previous.has(item));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ExecutionManager {
  constructor({
    store,
    adapters = createDefaultAdapters(),
    allowedRoots = [os.homedir(), process.platform === "win32" ? "D:\\CodexOutputs" : path.join(os.homedir(), "CodexOutputs")],
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }) {
    this.store = store;
    this.adapters = adapters;
    this.allowedRoots = allowedRoots.map((root) => path.resolve(root));
    this.timeoutMs = timeoutMs;
    this.activeProcesses = new Map();
    this.managedGateways = new Map();
    this.toolsCache = null;
    this.toolsCachedAt = 0;
    this.recoverInterruptedExecutions();
  }

  async listTools({ refresh = false } = {}) {
    if (!refresh && this.toolsCache && Date.now() - this.toolsCachedAt < 5000) {
      return this.toolsCache.map((tool) => ({ ...tool }));
    }
    const tools = await Promise.all(Object.entries(this.adapters).map(async ([id, adapter]) => {
      const configuredCommand = this.getConfiguredCommand(id);
      const command = configuredCommand || adapter.command;
      if (adapter.inspect) {
        return {
          id,
          name: adapter.name,
          command,
          defaultCommand: adapter.command,
          configuredCommand,
          configurable: this.isConfigurableAdapter(id),
          connectorType: adapter.connectorType,
          supportsDispatch: adapter.supportsDispatch !== false,
          dispatchMode: adapter.dispatchMode || "local-process",
          receiptMode: adapter.receiptMode || "process-exit",
          ...(await adapter.inspect()),
        };
      }
      const executable = adapter.resolveExecutable(command);
      const installed = Boolean(executable) || findCommandCandidates(command).length > 0;
      const supportsExecution = adapter.supportsExecution !== false && Boolean(executable);
      return {
        id,
        name: adapter.name,
        command,
        defaultCommand: adapter.command,
        configuredCommand,
        configurable: this.isConfigurableAdapter(id),
        connectorType: adapter.connectorType || "CLI",
        supportsDispatch: adapter.supportsDispatch !== false,
        dispatchMode: adapter.dispatchMode || "local-process",
        receiptMode: adapter.receiptMode || "process-exit",
        installed,
        executable: executable || null,
        supportsExecution,
        connectionStatus: supportsExecution ? "connected" : installed ? "discovered" : "unavailable",
        statusLabel: supportsExecution ? "已连接" : installed ? "已发现" : "未安装",
        detail: supportsExecution
          ? adapter.describeConnection?.({ supportsExecution, executable }) || "可派发本地任务"
          : installed
            ? "已发现命令入口"
            : "没有发现本地命令入口",
      };
    }));
    this.toolsCache = tools;
    this.toolsCachedAt = Date.now();
    return tools.map((tool) => ({ ...tool }));
  }

  isConfigurableAdapter(agentId) {
    return ["codex-cli", "claude-code", "kimi-cli"].includes(agentId);
  }

  getConfiguredCommand(agentId) {
    return String(this.store.snapshot().bridge?.adapterCommands?.[agentId] || "").trim() || null;
  }

  async configureAdapter({ agentId, command, confirm = false }) {
    if (confirm !== true) throw new Error("Updating a local adapter command requires explicit confirmation.");
    if (!this.isConfigurableAdapter(agentId)) throw new Error("This adapter command cannot be changed.");
    const normalized = String(command || "").trim();
    if (normalized.length > 500) throw new Error("The adapter command is too long.");
    const adapter = this.adapters[agentId];
    if (normalized && !adapter.resolveExecutable(normalized)) {
      throw new Error("The configured command does not resolve to an executable file.");
    }
    this.store.update((data) => {
      data.bridge.adapterCommands = data.bridge.adapterCommands || {};
      if (normalized) data.bridge.adapterCommands[agentId] = normalized;
      else delete data.bridge.adapterCommands[agentId];
      this.store.audit("bridge.adapter.configure", `Configure local adapter: ${adapter.name}`, {
        agentId,
        command: normalized || adapter.command,
        automatic: !normalized,
      });
      return data.bridge.adapterCommands;
    });
    this.toolsCache = null;
    return {
      agentId,
      configuredCommand: normalized || null,
      tool: (await this.listTools({ refresh: true })).find((tool) => tool.id === agentId),
    };
  }

  async startOpenClawGateway({ confirm = false, acceptRisk = false } = {}) {
    if (confirm !== true) throw new Error("启动 OpenClaw 本地网关需要明确确认");
    if (await probeTcpPort(18789)) return { started: false, status: "connected", port: 18789 };

    const scriptPath = getOpenClawScript();
    if (!scriptPath) throw new Error("没有发现可用的 OpenClaw 命令入口");
    const invocation = path.extname(scriptPath).toLowerCase() === ".exe"
      ? { command: scriptPath, args: [] }
      : { command: process.execPath, args: [scriptPath] };
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
    if (!fs.existsSync(configPath)) {
      if (acceptRisk !== true) {
        throw new Error("OpenClaw 初始化需要确认风险声明：Agent 可能获得较高系统权限");
      }
      const gatewayToken = randomUUID().replaceAll("-", "");
      execFileSync(
        invocation.command,
        [
          ...invocation.args,
          "onboard",
          "--non-interactive",
          "--accept-risk",
          "--mode",
          "local",
          "--auth-choice",
          "skip",
          "--gateway-auth",
          "token",
          "--gateway-token",
          gatewayToken,
          "--gateway-bind",
          "loopback",
          "--gateway-port",
          "18789",
          "--workspace",
          path.join(os.homedir(), ".openclaw", "workspace"),
          "--no-install-daemon",
          "--skip-channels",
          "--skip-skills",
          "--skip-search",
          "--skip-ui",
          "--skip-health",
          "--json",
        ],
        { encoding: "utf8", timeout: 30000, windowsHide: true },
      );
    }

    const child = spawn(
      invocation.command,
      [...invocation.args, "gateway", "run", "--bind", "loopback", "--port", "18789"],
      { env: process.env, shell: false, stdio: "ignore", windowsHide: true },
    );
    this.managedGateways.set("openclaw", child);
    child.once("exit", () => this.managedGateways.delete("openclaw"));
    child.once("error", () => this.managedGateways.delete("openclaw"));

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await delay(500);
      if (await probeTcpPort(18789)) {
        this.toolsCache = null;
        this.store.update(() => {
          this.store.audit("bridge.openclaw.start", "启动 OpenClaw 本地网关", { port: 18789 });
          return { port: 18789 };
        });
        return { started: true, status: "connected", port: 18789 };
      }
      if (child.exitCode !== null) break;
    }

    this.terminateProcess(child);
    throw new Error("OpenClaw 网关启动失败，请检查本机配置");
  }

  getExecutions(projectId) {
    const executions = this.store.snapshot().executions || [];
    return executions
      .filter((execution) => !projectId || execution.projectId === projectId)
      .map((execution) => this.sanitizeExecution(execution));
  }

  getExecution(executionId) {
    const execution = this.store.snapshot().executions?.find((item) => item.id === executionId);
    return execution ? this.sanitizeExecution(execution) : null;
  }

  sanitizeExecution(execution) {
    const { tokenHash, ...safeExecution } = execution;
    return safeExecution;
  }

  recoverInterruptedExecutions() {
    const executions = this.store.snapshot().executions || [];
    const interrupted = executions.filter((execution) =>
      ["pending_confirmation", "running", "cancelling"].includes(execution.status),
    );
    if (interrupted.length === 0) return;

    this.store.update((data) => {
      const now = new Date().toISOString();
      for (const execution of data.executions) {
        if (!["pending_confirmation", "running", "cancelling"].includes(execution.status)) continue;
        execution.status = "interrupted";
        execution.errorOutput = trimOutput(
          `${execution.errorOutput || ""}\n应用上次关闭时任务尚未完成，请重新发起。`,
        ).trim();
        execution.finishedAt = now;
        execution.updatedAt = now;
      }
      this.store.audit("execution.recover", `恢复 ${interrupted.length} 个中断任务`);
      return interrupted.length;
    });
  }

  getAllowedRoots() {
    const approved = this.store.snapshot().bridge?.allowedWorkspaces || [];
    return [...this.allowedRoots, ...approved.map((root) => path.resolve(root))];
  }

  isWorkspaceAllowed(workspaceDir) {
    const normalizedWorkspace = path.resolve(String(workspaceDir || "").trim());
    return Boolean(workspaceDir) && this.getAllowedRoots().some((root) => isInside(root, normalizedWorkspace));
  }

  allowWorkspace({ workspaceDir, confirm = false }) {
    if (confirm !== true) throw new Error("授权本地目录需要明确确认");
    const normalizedWorkspace = path.resolve(String(workspaceDir || "").trim());
    if (!workspaceDir || !fs.existsSync(normalizedWorkspace) || !fs.statSync(normalizedWorkspace).isDirectory()) {
      throw new Error("请选择存在的本地工作目录");
    }
    return this.store.update((data) => {
      data.bridge.allowedWorkspaces = data.bridge.allowedWorkspaces || [];
      if (!data.bridge.allowedWorkspaces.includes(normalizedWorkspace)) {
        data.bridge.allowedWorkspaces.push(normalizedWorkspace);
      }
      this.store.audit("bridge.workspace.allow", `授权本地目录：${normalizedWorkspace}`, {
        workspaceDir: normalizedWorkspace,
      });
      return { workspaceDir: normalizedWorkspace, allowed: true };
    });
  }

  revokeWorkspace({ workspaceDir, confirm = false }) {
    if (confirm !== true) throw new Error("撤销本地目录授权需要明确确认");
    const normalizedWorkspace = path.resolve(String(workspaceDir || "").trim());
    if (!workspaceDir) throw new Error("请选择需要撤销授权的本地目录");
    return this.store.update((data) => {
      data.bridge.allowedWorkspaces = data.bridge.allowedWorkspaces || [];
      data.bridge.allowedWorkspaces = data.bridge.allowedWorkspaces.filter(
        (item) => path.resolve(item) !== normalizedWorkspace,
      );
      this.store.audit("bridge.workspace.revoke", `撤销本地目录授权：${normalizedWorkspace}`, {
        workspaceDir: normalizedWorkspace,
      });
      return { workspaceDir: normalizedWorkspace, allowed: false };
    });
  }

  preview({ projectId, agentId, mode, prompt, workspaceDir, stageKey, agentRoute, workItemId = null, workItemTitle = "" }) {
    const adapter = this.adapters[agentId];
    if (!adapter) throw new Error("暂不支持该本地 Agent");
    if (adapter.supportsExecution === false) throw new Error(`${adapter.name} 已接入，但暂未开放受控任务执行`);
    if (!["read-only", "workspace-write"].includes(mode)) throw new Error("执行权限级别无效");

    const normalizedPrompt = String(prompt || "").trim();
    if (!normalizedPrompt) throw new Error("任务说明不能为空");
    if (normalizedPrompt.length > MAX_PROMPT_CHARS) throw new Error("任务说明过长");

    const normalizedWorkspace = path.resolve(String(workspaceDir || "").trim());
    if (!workspaceDir || !fs.existsSync(normalizedWorkspace) || !fs.statSync(normalizedWorkspace).isDirectory()) {
      throw new Error("请选择存在的本地工作目录");
    }
    if (!this.isWorkspaceAllowed(normalizedWorkspace)) {
      throw new Error("工作目录不在允许范围内");
    }

    const executable = adapter.resolveExecutable(this.getConfiguredCommand(agentId) || adapter.command);
    if (!executable) throw new Error(`${adapter.name} 尚未安装可执行版本`);

    const invocation = adapter.buildInvocation({
      executable,
      mode,
      workspaceDir: normalizedWorkspace,
    });
    const token = randomUUID();
    const now = new Date().toISOString();
    const project = this.store.snapshot().projects.find((item) => item.id === projectId);
    const activeStage = workItemId
      ? null
      : project?.stages.find((item) => item.key === stageKey)
        || project?.stages.find((item) => ["in_progress", "blocked"].includes(item.status) && item.ownerType === "local");
    const envelope = activeStage ? buildAgentTaskEnvelope(project, activeStage.key) : null;
    const execution = {
      id: randomUUID(),
      projectId,
      agentId,
      agentName: adapter.name,
      mode,
      prompt: normalizedPrompt,
      workspaceDir: normalizedWorkspace,
      commandPreview: [invocation.command, ...invocation.args].join(" "),
      status: "pending_confirmation",
      createdAt: now,
      updatedAt: now,
      tokenHash: hashToken(token),
      output: "",
      errorOutput: "",
      stageKey: envelope?.stageKey || null,
      taskId: envelope?.taskId || null,
      workspaceChangesBefore: readWorkspaceChanges(normalizedWorkspace),
      routeReason: String(agentRoute?.reason || "").trim(),
      workItemId: workItemId || null,
      workItemTitle: String(workItemTitle || "").trim().slice(0, 200),
    };

    this.store.update((data) => {
      data.executions = data.executions || [];
      data.executions.unshift(execution);
      data.executions = data.executions.slice(0, 100);
      const project = data.projects.find((item) => item.id === projectId);
      if (project) project.workspaceDir = normalizedWorkspace;
      this.store.audit("execution.preview", `等待确认：${adapter.name}`, {
        executionId: execution.id,
        projectId,
        mode,
        workspaceDir: normalizedWorkspace,
      });
      return execution;
    });

    return { execution: this.sanitizeExecution(execution), confirmationToken: token };
  }

  confirm({ executionId, confirmationToken, confirmWrite = false }) {
    const execution = this.store.snapshot().executions?.find((item) => item.id === executionId);
    if (!execution) throw new Error("执行任务不存在");
    if (execution.status !== "pending_confirmation") throw new Error("执行任务已经处理");
    if (!confirmationToken || hashToken(confirmationToken) !== execution.tokenHash) {
      throw new Error("确认令牌无效");
    }
    if (execution.mode === "workspace-write" && confirmWrite !== true) {
      throw new Error("代码写入任务需要再次确认");
    }

    this.run(executionId);
    return this.getExecution(executionId);
  }

  run(executionId) {
    const execution = this.store.snapshot().executions.find((item) => item.id === executionId);
    const adapter = this.adapters[execution.agentId];
    const executable = adapter.resolveExecutable(this.getConfiguredCommand(execution.agentId) || adapter.command);
    if (!executable) throw new Error(`${adapter.name} 当前不可用`);
    const invocation = adapter.buildInvocation({
      executable,
      mode: execution.mode,
      workspaceDir: execution.workspaceDir,
    });

    this.store.update((data) => {
      const target = data.executions.find((item) => item.id === executionId);
      target.status = "running";
      target.startedAt = new Date().toISOString();
      target.updatedAt = target.startedAt;
      const project = data.projects.find((item) => item.id === target.projectId);
      if (target.workItemId) {
        updateWorkItem(
          data,
          target.workItemId,
          {
            status: "in_progress",
            assignee: { type: "agent", id: target.agentId, name: target.agentName },
          },
          { actor: { type: "system", name: "Nomos Dispatcher" } },
        );
      }
      if (project && target.taskId) {
        markTaskDispatched(project, {
          taskId: target.taskId,
          agentId: target.agentId,
          agentName: target.agentName,
          adapterType: adapter.connectorType || "CLI",
          externalRef: target.id,
          idempotencyKey: routeKey(target.taskId, target.agentId, project.workflowTasks.find((item) => item.id === target.taskId)?.attempt || 1),
        });
      }
      this.store.audit("execution.start", `开始执行：${target.agentName}`, {
        executionId,
        projectId: target.projectId,
      });
      return target;
    });

    const child = spawn(invocation.command, invocation.args, {
      cwd: execution.workspaceDir,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let completed = false;
    let lastPersistedAt = 0;

    const persistLiveOutput = () => {
      const now = Date.now();
      if (now - lastPersistedAt < 500) return;
      lastPersistedAt = now;
      this.store.update((data) => {
        const target = data.executions.find((item) => item.id === executionId);
        if (!target || target.status !== "running") return target;
        target.output = trimOutput(stdout);
        target.errorOutput = trimOutput(stderr);
        target.workspaceChanges = diffWorkspaceChanges(
          target.workspaceChangesBefore,
          readWorkspaceChanges(target.workspaceDir),
        );
        target.updatedAt = new Date().toISOString();
        return target;
      });
    };

    child.stdout.on("data", (chunk) => {
      stdout = trimOutput(`${stdout}${chunk.toString("utf8")}`);
      persistLiveOutput();
    });
    child.stderr.on("data", (chunk) => {
      stderr = trimOutput(`${stderr}${chunk.toString("utf8")}`);
      persistLiveOutput();
    });
    child.on("error", (error) => {
      stderr = trimOutput(`${stderr}\n${error.message}`);
      persistLiveOutput();
    });

    const timer = setTimeout(() => {
      if (completed) return;
      stderr = trimOutput(`${stderr}\n执行超时，已终止。`);
      this.terminateProcess(child);
    }, this.timeoutMs);

    this.activeProcesses.set(executionId, child);

    const finalize = (exitCode, signal) => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      this.activeProcesses.delete(executionId);
      this.store.update((data) => {
        const target = data.executions.find((item) => item.id === executionId);
        const interrupted = target.status === "interrupted";
        const cancelled = Boolean(target.cancelRequestedAt);
        const succeeded = !interrupted && !cancelled && exitCode === 0;
        target.status = interrupted ? "interrupted" : cancelled ? "cancelled" : succeeded ? "succeeded" : "failed";
        target.exitCode = exitCode;
        target.signal = signal;
        target.output = trimOutput(stdout);
        target.errorOutput = trimOutput(stderr);
        target.finishedAt = new Date().toISOString();
        target.updatedAt = target.finishedAt;
        const project = data.projects.find((item) => item.id === target.projectId);
        if (project && !interrupted) {
          const workflowReceipt = recordExecutionReceipt(project, target);
          if (!workflowReceipt) {
            project.messages.push({
              id: randomUUID(),
              authorId: target.agentId,
              authorName: target.agentName,
              authorType: "local",
              text: succeeded
                ? `本地任务已完成：${target.prompt.slice(0, 90)}`
                : cancelled
                  ? `本地任务已取消：${target.prompt.slice(0, 90)}`
                : `本地任务执行失败：${target.errorOutput.slice(0, 120) || "请查看执行记录"}`,
              createdAt: target.finishedAt,
            });
          }
          project.updatedAt = target.finishedAt;
        }
        if (target.workItemId && !interrupted) {
          updateWorkItem(
            data,
            target.workItemId,
            succeeded
              ? { status: "review_pending", progress: 90 }
              : cancelled
                ? { status: "todo", progress: 0 }
                : {
                    status: "blocked",
                    blockedReason: target.errorOutput.slice(0, 1000) || "Agent 执行失败，请查看执行记录",
                  },
            { actor: { type: "agent", id: target.agentId, name: target.agentName } },
          );
        }
        if (!interrupted) {
          this.store.audit(
            cancelled ? "execution.cancel" : succeeded ? "execution.succeed" : "execution.fail",
            `${cancelled ? "执行取消" : succeeded ? "执行完成" : "执行失败"}：${target.agentName}`,
            { executionId, projectId: target.projectId, exitCode },
          );
        }
        return target;
      });
    };

    child.once("exit", finalize);
    child.once("close", finalize);

    child.stdin.on("error", () => {});
    child.stdin.end(execution.prompt, "utf8");
  }

  cancel(executionId) {
    const execution = this.store.snapshot().executions?.find((item) => item.id === executionId);
    if (!execution) throw new Error("执行任务不存在");
    if (!["pending_confirmation", "running", "cancelling"].includes(execution.status)) {
      throw new Error("当前任务无法取消");
    }

    const now = new Date().toISOString();
    const child = this.activeProcesses.get(executionId);
    this.store.update((data) => {
      const target = data.executions.find((item) => item.id === executionId);
      target.cancelRequestedAt = now;
      target.updatedAt = now;
      if (target.status === "pending_confirmation" || !child) {
        target.status = "cancelled";
        target.finishedAt = now;
      } else {
        target.status = "cancelling";
      }
      this.store.audit("execution.cancel.request", `请求取消：${target.agentName}`, { executionId });
      return target;
    });
    if (child) this.terminateProcess(child);
    return this.getExecution(executionId);
  }

  retry(executionId) {
    const execution = this.store.snapshot().executions?.find((item) => item.id === executionId);
    if (!execution) throw new Error("执行任务不存在");
    if (!["failed", "cancelled", "interrupted"].includes(execution.status)) {
      throw new Error("当前任务无需重试");
    }
    return this.preview({
      projectId: execution.projectId,
      agentId: execution.agentId,
      mode: execution.mode,
      prompt: execution.prompt,
      workspaceDir: execution.workspaceDir,
      workItemId: execution.workItemId,
      workItemTitle: execution.workItemTitle,
    });
  }

  terminateProcess(child) {
    if (!child || child.killed) return;
    if (process.platform === "win32" && child.pid) {
      const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      });
      killer.on("error", () => child.kill());
      return;
    }
    child.kill();
  }

  async shutdown() {
    const pendingClosures = [];
    for (const [executionId, child] of this.activeProcesses) {
      pendingClosures.push(
        new Promise((resolve) => {
          let fallbackTimer;
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            clearTimeout(fallbackTimer);
            resolve();
          };
          child.once("exit", settle);
          child.once("close", settle);
          fallbackTimer = setTimeout(() => {
            child.kill();
            settle();
          }, 3000);
          fallbackTimer.unref();
        }),
      );
      const now = new Date().toISOString();
      this.store.update((data) => {
        const target = data.executions.find((item) => item.id === executionId);
        if (!target) return null;
        target.status = "interrupted";
        target.errorOutput = trimOutput(`${target.errorOutput || ""}\n应用关闭，任务已中断。`).trim();
        target.finishedAt = now;
        target.updatedAt = now;
        this.store.audit("execution.interrupt", `应用关闭，中断任务：${target.agentName}`, { executionId });
        return target;
      });
      this.terminateProcess(child);
    }
    await Promise.all(pendingClosures);
    this.activeProcesses.clear();
    for (const child of this.managedGateways.values()) this.terminateProcess(child);
    this.managedGateways.clear();
  }
}

module.exports = {
  ExecutionManager,
  createDefaultAdapters,
  findExecutable,
  findCommandCandidates,
  findNpmScript,
};
