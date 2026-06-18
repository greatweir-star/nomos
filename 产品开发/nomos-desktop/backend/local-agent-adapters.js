"use strict";

const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isExecutableFile(candidate) {
  try {
    const stat = fs.statSync(candidate);
    if (!stat.isFile()) return false;
    if (process.platform === "win32") return true;
    return Boolean(stat.mode & 0o111);
  } catch {
    return false;
  }
}

function findCommandCandidates(command) {
  const normalized = String(command || "").trim();
  if (!normalized) return [];
  if (path.isAbsolute(normalized)) return isExecutableFile(normalized) ? [normalized] : [];
  const lookupCommand = process.platform === "win32" ? "where.exe" : "which";
  const lookupArgs = process.platform === "win32" ? [normalized] : ["-a", normalized];
  try {
    return execFileSync(lookupCommand, lookupArgs, {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((candidate, index, values) => values.indexOf(candidate) === index);
  } catch {
    return [];
  }
}

function findExecutable(command) {
  return findCommandCandidates(command).find(isExecutableFile) || null;
}

function findNpmScript(command, packageScript) {
  for (const candidate of findCommandCandidates(command)) {
    if (process.platform === "win32") {
      if (path.extname(candidate).toLowerCase() !== ".cmd") continue;
      const scriptPath = path.join(path.dirname(candidate), "node_modules", ...packageScript);
      if (fs.existsSync(scriptPath) && fs.statSync(scriptPath).isFile()) return scriptPath;
      continue;
    }
    try {
      const realPath = fs.realpathSync(candidate);
      if (realPath.includes(`${path.sep}node_modules${path.sep}`) && fs.statSync(realPath).isFile()) {
        return realPath;
      }
    } catch {
      // Fall through to direct executable resolution.
    }
  }
  return null;
}

function resolveCommandEntry(command, packageScript = null) {
  const normalized = String(command || "").trim();
  if (!normalized) return null;
  if (path.isAbsolute(normalized)) {
    try {
      return fs.statSync(normalized).isFile() ? normalized : null;
    } catch {
      return null;
    }
  }
  return (packageScript ? findNpmScript(normalized, packageScript) : null) || findExecutable(normalized);
}

function getAliceDataDir() {
  const pointer = readJsonFile(path.join(os.homedir(), ".alice-pointer.json"));
  if (pointer?.dataDir) return pointer.dataDir;
  return process.platform === "win32" ? "D:\\Alice\\AliceData" : path.join(os.homedir(), "AliceData");
}

function getAliceConnection() {
  const cliDir = path.join(getAliceDataDir(), "cli");
  return {
    cliDir,
    cliPath: process.platform === "win32" ? path.join(cliDir, "alice-cli.cmd") : path.join(cliDir, "alice-cli"),
    cliScriptPath: path.join(cliDir, "alice-cli.js"),
    config: readJsonFile(path.join(cliDir, "config.json")),
  };
}

async function probeAliceMcp(config) {
  if (!config?.serverUrl || !config?.token) return false;
  try {
    const response = await fetch(config.serverUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "nomos", version: "1.4.0" },
        },
      }),
      signal: AbortSignal.timeout(2500),
    });
    const text = await response.text();
    return response.ok && text.includes('"name":"alice"');
  } catch {
    return false;
  }
}

function probeTcpPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const settle = (connected) => {
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
    socket.once("timeout", () => settle(false));
  });
}

function getOpenClawScript() {
  return findNpmScript("openclaw", ["@qingchencloud", "openclaw-zh", "openclaw.mjs"]) || findExecutable("openclaw");
}

function executableInvocation(executable, args) {
  const extension = path.extname(executable).toLowerCase();
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return { command: process.execPath, args: [executable, ...args] };
  }
  return { command: executable, args };
}

function createCliAdapter({
  name,
  command,
  packageScript = null,
  connectorType = "CLI",
  capabilities = [],
  buildArgs,
  detail = "可派发本地任务",
}) {
  return {
    name,
    command,
    connectorType,
    supportsDispatch: true,
    supportsExecution: true,
    dispatchMode: "local-process",
    receiptMode: "process-exit",
    capabilities,
    resolveExecutable: (configuredCommand = command) => resolveCommandEntry(configuredCommand, packageScript),
    buildInvocation({ executable, mode, workspaceDir }) {
      return executableInvocation(executable, buildArgs({ mode, workspaceDir }));
    },
    describeConnection({ supportsExecution }) {
      return supportsExecution ? detail : "已发现命令入口，但暂不可执行";
    },
  };
}

function createDefaultAdapters() {
  return {
    alice: {
      name: "Alice",
      command: "alice-cli",
      connectorType: "MCP",
      supportsExecution: false,
      supportsDispatch: true,
      dispatchMode: "mcp-message",
      receiptMode: "manual-sync",
      capabilities: ["coordination", "workflow", "memory", "receipt-sync"],
      resolveExecutable() {
        const connection = getAliceConnection();
        return fs.existsSync(connection.cliPath) && fs.existsSync(connection.cliScriptPath)
          ? connection.cliPath
          : null;
      },
      async inspect() {
        const connection = getAliceConnection();
        const cliInstalled = fs.existsSync(connection.cliPath) || fs.existsSync(connection.cliScriptPath);
        const cliReady = fs.existsSync(connection.cliPath) && fs.existsSync(connection.cliScriptPath);
        const connected = await probeAliceMcp(connection.config);
        return {
          installed: Boolean(connection.config || cliInstalled),
          executable: cliReady ? connection.cliPath : null,
          supportsExecution: false,
          connectionStatus: connected ? "connected" : "offline",
          statusLabel: connected ? "MCP 已连接" : "Alice 未运行",
          detail: connected
            ? cliReady
              ? "Alice MCP 在线，alice-cli 可用"
              : "Alice MCP 在线，CLI 包装脚本需要修复"
            : "启动 Alice 桌面端后可连接",
          endpoint: connection.config?.serverUrl || null,
        };
      },
    },
    "codex-cli": createCliAdapter({
      name: "Codex CLI",
      command: "codex",
      packageScript: ["@openai", "codex", "bin", "codex.js"],
      capabilities: ["code", "terminal", "repo-analysis", "tests"],
      buildArgs: ({ mode, workspaceDir }) => [
        "exec",
        "--sandbox",
        mode,
        "--skip-git-repo-check",
        "--ephemeral",
        "--ignore-user-config",
        "--color",
        "never",
        "-C",
        workspaceDir,
        "-",
      ],
    }),
    "claude-code": createCliAdapter({
      name: "Claude Code",
      command: "claude",
      capabilities: ["code-review", "design-review", "repo-analysis"],
      buildArgs: ({ mode }) => [
        "--print",
        "--output-format",
        "text",
        "--no-session-persistence",
        "--permission-mode",
        mode === "workspace-write" ? "acceptEdits" : "plan",
      ],
    }),
    "kimi-cli": createCliAdapter({
      name: "Kimi",
      command: "kimi",
      capabilities: ["research", "analysis", "content", "long-context"],
      buildArgs: () => [],
      detail: "可派发本机 Kimi CLI 任务",
    }),
    openclaw: {
      name: "OpenClaw",
      command: "openclaw",
      connectorType: "Gateway",
      supportsExecution: false,
      supportsDispatch: false,
      dispatchMode: "gateway",
      receiptMode: "gateway-event",
      capabilities: ["desktop-control", "plugins", "local-tools"],
      resolveExecutable: () => getOpenClawScript(),
      async inspect() {
        const executable = getOpenClawScript();
        const configured = fs.existsSync(path.join(os.homedir(), ".openclaw", "openclaw.json"));
        const gatewayOnline = await probeTcpPort(18789);
        return {
          installed: Boolean(executable || findCommandCandidates("openclaw").length),
          executable,
          supportsExecution: false,
          connectionStatus: gatewayOnline ? "connected" : configured ? "offline" : "setup_required",
          statusLabel: gatewayOnline ? "网关已连接" : configured ? "网关未启动" : "待网关配置",
          detail: gatewayOnline
            ? "OpenClaw 本地网关在线"
            : configured
              ? "点击后可启动本地网关"
              : "确认风险声明后，可由 nomos 初始化并启动网关",
          endpoint: "ws://127.0.0.1:18789",
        };
      },
    },
  };
}

module.exports = {
  createDefaultAdapters,
  findCommandCandidates,
  findExecutable,
  findNpmScript,
  getOpenClawScript,
  probeTcpPort,
  resolveCommandEntry,
};
