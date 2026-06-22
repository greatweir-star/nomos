import type { NomosHandler } from "../middleware/core";
import { sendSuccess } from "../response";
import { DbConnection } from "../../infrastructure/database/connection";
import type { TransactionManager } from "../../infrastructure/database/transaction";
import { AuditLogger } from "../../infrastructure/audit/audit";
import { createDtoValidator } from "../middleware/schema";
import { validationError } from "../../domain/shared/errors";
import {
  createProfile,
  disableProfile,
  discoverConnections,
  testProfile,
  type CreateProfileInput,
} from "../../application/integration/service";

const createValidator = createDtoValidator<CreateProfileInput & Record<string, unknown>>({
  templateId: { type: "string", enum: ["alice", "codex-cli", "claude-code", "kimi", "openclaw"] },
  name: { type: "string", minLength: 2, maxLength: 80 },
  scope: { type: "string", enum: ["local", "remote"] },
  commandOrEndpoint: { type: "string", minLength: 1, maxLength: 1024 },
  concurrencyCapacity: { type: "number", integer: true, min: 1, max: 32 },
});

const discoverValidator = createDtoValidator<Record<string, unknown>>({
  templateId: { type: "string", enum: ["alice", "codex-cli", "claude-code", "kimi", "openclaw"], optional: true },
});

const updateValidator = createDtoValidator<Record<string, unknown>>({
  name: { type: "string", minLength: 2, maxLength: 80, optional: true },
  concurrencyCapacity: { type: "number", integer: true, min: 1, max: 32, optional: true },
  version: { type: "number", integer: true, min: 1 },
});

const disableValidator = createDtoValidator<Record<string, unknown>>({
  version: { type: "number", integer: true, min: 1 },
  confirm: { type: "boolean" },
});

function requireValid<T extends Record<string, unknown>>(
  result: ReturnType<typeof createDtoValidator<T>> extends (value: unknown) => infer R ? R : never,
  requestId: string
): T {
  const typed = result as { success: boolean; data?: T; errors: Array<{ field: string; code: string; message: string }> };
  if (!typed.success || !typed.data) throw validationError("请求字段不符合合同", requestId, typed.errors);
  return typed.data;
}

function mapProfile(r: Record<string, unknown>) {
  return {
    id: r.id, templateId: r.template_id, name: r.name, scope: r.scope, reachRef: r.reach_ref,
    status: r.status, manageable: Boolean(r.manageable), versionLabel: r.version_label,
    concurrencyCapacity: r.concurrency_capacity, activeSessions: r.active_sessions,
    credentialState: r.credential_state, lastCheckAt: r.last_check_at,
    lastError: r.last_error_code ? { code: r.last_error_code, message: r.last_error_message } : null,
    createdAt: r.created_at, updatedAt: r.updated_at, version: r.version,
  };
}

function getProfile(db: DbConnection, id: string, requestId: string): Record<string, unknown> {
  const row = db.get<Record<string, unknown>>("SELECT * FROM connection_profiles WHERE id = ?", id);
  if (!row) throw validationError("ConnectionProfile 不存在", requestId);
  return row;
}

export function integrationRouter(db: DbConnection, txManager: TransactionManager) {
  const listTemplates: NomosHandler = (_req, res, ctx) => {
    const rows = db.all<Record<string, unknown>>("SELECT * FROM adapter_templates ORDER BY name ASC");
    sendSuccess(res, 200, rows.map((r) => ({
      id: r.id, name: r.name, provider: r.provider, scope: r.scope,
      connectorType: r.connector_type, dispatchMode: r.dispatch_mode, receiptMode: r.receipt_mode,
      supportsDispatch: Boolean(r.supports_dispatch), supportsExecution: Boolean(r.supports_execution),
      configurable: Boolean(r.configurable), capabilities: JSON.parse(String(r.capabilities || "[]")),
      riskLevel: r.risk_level, createdAt: r.created_at, updatedAt: r.updated_at, version: r.version,
    })), ctx.requestId);
  };

  const listProfiles: NomosHandler = (_req, res, ctx) => {
    const rows = db.all<Record<string, unknown>>("SELECT * FROM connection_profiles ORDER BY updated_at DESC");
    sendSuccess(res, 200, rows.map(mapProfile), ctx.requestId);
  };

  const discover: NomosHandler = (_req, res, ctx) => {
    const input = requireValid(discoverValidator(ctx.body || {}), ctx.requestId);
    sendSuccess(res, 200, discoverConnections(input.templateId as string | undefined), ctx.requestId);
  };

  const create: NomosHandler = async (_req, res, ctx) => {
    const input = requireValid(createValidator(ctx.body), ctx.requestId) as unknown as CreateProfileInput;
    const id = await txManager.run((session) => {
      const profileId = createProfile(session, input, ctx.requestId);
      new AuditLogger(session).append({ action: "connection_profile.created", summary: `创建技术连接 ${input.name}`,
        metadata: { templateId: input.templateId, reachRef: input.commandOrEndpoint }, actor: { type: "user", id: null, name: "本机 Owner" },
        targetType: "connection_profile", targetId: profileId, requestId: ctx.requestId });
      return profileId;
    });
    sendSuccess(res, 201, mapProfile(getProfile(db, id, ctx.requestId)), ctx.requestId);
  };

  const test: NomosHandler = async (_req, res, ctx) => {
    await txManager.run((session) => {
      testProfile(session, ctx.params.id, ctx.requestId);
      new AuditLogger(session).append({ action: "connection_profile.tested", summary: "执行无副作用可管理性检查",
        actor: { type: "user", id: null, name: "本机 Owner" }, targetType: "connection_profile", targetId: ctx.params.id, requestId: ctx.requestId });
    });
    sendSuccess(res, 200, mapProfile(getProfile(db, ctx.params.id, ctx.requestId)), ctx.requestId);
  };

  const update: NomosHandler = async (_req, res, ctx) => {
    const input = requireValid(updateValidator(ctx.body), ctx.requestId);
    if (input.name === undefined && input.concurrencyCapacity === undefined) throw validationError("至少修改一个字段", ctx.requestId);
    await txManager.run((session) => {
      const current = session.get<Record<string, unknown>>("SELECT * FROM connection_profiles WHERE id = ?", ctx.params.id);
      if (!current) throw validationError("ConnectionProfile 不存在", ctx.requestId);
      const result = session.run(`UPDATE connection_profiles SET name = ?, concurrency_capacity = ?, updated_at = ?, version = version + 1
        WHERE id = ? AND version = ?`, input.name ?? current.name, input.concurrencyCapacity ?? current.concurrency_capacity,
        new Date().toISOString(), ctx.params.id, input.version);
      if (Number(result.changes) !== 1) throw validationError("资源版本已变化，请刷新后重试", ctx.requestId);
      new AuditLogger(session).append({ action: "connection_profile.updated", summary: "更新技术连接",
        metadata: { name: input.name, concurrencyCapacity: input.concurrencyCapacity }, actor: { type: "user", id: null, name: "本机 Owner" },
        targetType: "connection_profile", targetId: ctx.params.id, requestId: ctx.requestId });
    });
    sendSuccess(res, 200, mapProfile(getProfile(db, ctx.params.id, ctx.requestId)), ctx.requestId);
  };

  const disable: NomosHandler = async (_req, res, ctx) => {
    const input = requireValid(disableValidator(ctx.body), ctx.requestId);
    if (input.confirm !== true) throw validationError("禁用连接需要显式确认", ctx.requestId);
    await txManager.run((session) => {
      disableProfile(session, ctx.params.id, Number(input.version), ctx.requestId);
      new AuditLogger(session).append({ action: "connection_profile.disabled", summary: "禁用技术连接",
        actor: { type: "user", id: null, name: "本机 Owner" }, targetType: "connection_profile", targetId: ctx.params.id, requestId: ctx.requestId });
    });
    sendSuccess(res, 200, mapProfile(getProfile(db, ctx.params.id, ctx.requestId)), ctx.requestId);
  };

  return { listTemplates, listProfiles, discover, create, test, update, disable };
}
