import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { DbConnection, DbSession } from "../../infrastructure/database/connection";
import { notFound, validationError } from "../../domain/shared/errors";
import type { AdapterTemplateDto, ConnectionProfileDto, DiscoveredConnectionDto } from "./dto";

type TemplateSeed = AdapterTemplateDto & { command: string };

const now = "2026-06-21T00:00:00.000Z";
export const ADAPTER_TEMPLATES: TemplateSeed[] = [
  { id: "alice", name: "Alice", provider: "Alice", scope: "local", connectorType: "MCP", dispatchMode: "mcp-message", receiptMode: "manual-sync", supportsDispatch: true, supportsExecution: false, configurable: true, capabilities: ["coordination", "workflow", "receipt-sync"], riskLevel: "medium", command: "alice-cli", createdAt: now, updatedAt: now, version: 1 },
  { id: "codex-cli", name: "Codex CLI", provider: "OpenAI", scope: "local", connectorType: "CLI", dispatchMode: "local-process", receiptMode: "process-exit", supportsDispatch: true, supportsExecution: true, configurable: true, capabilities: ["code", "terminal", "repo-analysis", "tests"], riskLevel: "high", command: "codex", createdAt: now, updatedAt: now, version: 1 },
  { id: "claude-code", name: "Claude Code", provider: "Anthropic", scope: "local", connectorType: "CLI", dispatchMode: "local-process", receiptMode: "process-exit", supportsDispatch: true, supportsExecution: true, configurable: true, capabilities: ["code-review", "design-review", "repo-analysis"], riskLevel: "high", command: "claude", createdAt: now, updatedAt: now, version: 1 },
  { id: "kimi", name: "Kimi", provider: "Moonshot AI", scope: "local", connectorType: "CLI", dispatchMode: "local-process", receiptMode: "process-exit", supportsDispatch: true, supportsExecution: true, configurable: true, capabilities: ["research", "analysis", "content", "long-context"], riskLevel: "medium", command: "kimi", createdAt: now, updatedAt: now, version: 1 },
  { id: "openclaw", name: "OpenClaw", provider: "OpenClaw", scope: "local", connectorType: "Gateway", dispatchMode: "gateway", receiptMode: "gateway-event", supportsDispatch: false, supportsExecution: false, configurable: true, capabilities: ["desktop-control", "plugins", "local-tools"], riskLevel: "high", command: "openclaw", createdAt: now, updatedAt: now, version: 1 },
];

export function seedAdapterTemplates(db: DbConnection): void {
  const statement = db.prepare(`
    INSERT INTO adapter_templates
      (id, name, provider, scope, connector_type, dispatch_mode, receipt_mode, supports_dispatch,
       supports_execution, configurable, capabilities, risk_level, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, provider=excluded.provider, scope=excluded.scope,
      connector_type=excluded.connector_type, dispatch_mode=excluded.dispatch_mode,
      receipt_mode=excluded.receipt_mode, supports_dispatch=excluded.supports_dispatch,
      supports_execution=excluded.supports_execution, configurable=excluded.configurable,
      capabilities=excluded.capabilities, risk_level=excluded.risk_level,
      updated_at=excluded.updated_at, version=excluded.version;
  `);
  for (const template of ADAPTER_TEMPLATES) {
    statement.run(template.id, template.name, template.provider, template.scope, template.connectorType,
      template.dispatchMode, template.receiptMode, Number(template.supportsDispatch),
      Number(template.supportsExecution), Number(template.configurable), JSON.stringify(template.capabilities),
      template.riskLevel, template.createdAt, new Date().toISOString(), template.version);
  }
}

function isExecutable(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate);
    return stat.isFile() && (process.platform === "win32" || Boolean(stat.mode & 0o111));
  } catch {
    return false;
  }
}

function resolveExecutable(command: string): string | null {
  if (path.isAbsolute(command)) return isExecutable(command) ? command : null;
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  try {
    const output = execFileSync(lookup, process.platform === "win32" ? [command] : ["-a", command], {
      encoding: "utf8", timeout: 4000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).map((item) => item.trim()).find(isExecutable) || null;
  } catch {
    return null;
  }
}

function readVersion(executable: string): string | null {
  try {
    return execFileSync(executable, ["--version"], {
      encoding: "utf8", timeout: 5000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    }).trim().split(/\r?\n/)[0].slice(0, 120) || null;
  } catch {
    return null;
  }
}

export function discoverConnections(templateId?: string): DiscoveredConnectionDto[] {
  const templates = templateId ? ADAPTER_TEMPLATES.filter((item) => item.id === templateId) : ADAPTER_TEMPLATES;
  const detectedAt = new Date().toISOString();
  return templates.flatMap((template) => {
    const executable = resolveExecutable(template.command);
    if (!executable) return [];
    return [{ discoveryId: randomUUID(), templateId: template.id as DiscoveredConnectionDto["templateId"], label: `本机 ${template.name}`, commandOrEndpoint: executable, versionLabel: readVersion(executable), detectedAt }];
  });
}

export interface CreateProfileInput {
  templateId: ConnectionProfileDto["templateId"];
  name: string;
  scope: "local" | "remote";
  commandOrEndpoint: string;
  concurrencyCapacity: number;
}

export function createProfile(session: DbSession, input: CreateProfileInput, requestId: string): string {
  if (!ADAPTER_TEMPLATES.some((item) => item.id === input.templateId)) throw validationError("未知 AdapterTemplate", requestId);
  if (input.scope !== "local") throw validationError("V0.0.3 仅支持本机连接", requestId);
  const executable = resolveExecutable(input.commandOrEndpoint);
  if (!executable) throw validationError("命令入口不存在或不可执行", requestId, [{ field: "commandOrEndpoint", code: "NOT_EXECUTABLE", message: "请选择可执行命令" }]);
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  session.run(`INSERT INTO connection_profiles
    (id, template_id, name, scope, reach_ref, status, manageable, concurrency_capacity,
     active_sessions, credential_state, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, 'draft', 0, ?, 0, 'not_required', ?, ?, 1)`,
    id, input.templateId, input.name, input.scope, executable, input.concurrencyCapacity, timestamp, timestamp);
  return id;
}

export function testProfile(session: DbSession, id: string, requestId: string): void {
  const row = session.get<{ reach_ref: string; status: string; version: number }>("SELECT reach_ref, status, version FROM connection_profiles WHERE id = ?", id);
  if (!row) throw notFound("ConnectionProfile", requestId);
  if (row.status === "disabled") throw validationError("已禁用连接不能测试", requestId);
  const versionLabel = readVersion(row.reach_ref);
  const timestamp = new Date().toISOString();
  const connected = versionLabel !== null;
  session.run(`UPDATE connection_profiles SET status = ?, manageable = ?, version_label = ?,
    last_check_at = ?, last_error_code = ?, last_error_message = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
    connected ? "connected" : "unmanageable", Number(connected), versionLabel,
    timestamp, connected ? null : "CONNECTION_UNMANAGEABLE", connected ? null : "命令无法完成无副作用版本检查", timestamp, id);
}

export function disableProfile(session: DbSession, id: string, version: number, requestId: string): void {
  const result = session.run(`UPDATE connection_profiles SET status = 'disabled', manageable = 0,
    updated_at = ?, version = version + 1 WHERE id = ? AND version = ?`, new Date().toISOString(), id, version);
  if (Number(result.changes) !== 1) {
    const exists = session.get("SELECT id FROM connection_profiles WHERE id = ?", id);
    if (!exists) throw notFound("ConnectionProfile", requestId);
    throw validationError("资源版本已变化，请刷新后重试", requestId);
  }
}
