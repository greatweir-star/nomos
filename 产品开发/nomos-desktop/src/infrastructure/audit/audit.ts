/**
 * Nomos V0.0.3 追加式脱敏审计
 * 每次写操作带 requestId/correlationId/actor/action/target/reason
 * 凭据不进入日志、审计和备份
 */

import { randomUUID } from "node:crypto";
import { DbSession, DbConnection } from "../database/connection";
import type { NomosId, AuditActor, AuditEvent } from "../../domain/shared/types";

/** 敏感字段脱敏规则 */
const SENSITIVE_PATTERNS = [
  /token/gi,
  /password/gi,
  /secret/gi,
  /credential/gi,
  /api[_-]?key/gi,
  /authorization/gi,
  /cookie/gi,
  /session[_-]?key/gi,
];

export function sanitizeAuditValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE_PATTERNS.some((p) => p.test(value))) {
      return "***REDACTED***";
    }
    return value;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map(sanitizeAuditValue);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_PATTERNS.some((p) => p.test(k))) {
        result[k] = "***REDACTED***";
      } else {
        result[k] = sanitizeAuditValue(v);
      }
    }
    return result;
  }
  return value;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  return sanitizeAuditValue(metadata) as Record<string, unknown>;
}

export interface AppendAuditInput {
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
  actor: AuditActor;
  targetType: string;
  targetId: NomosId;
  reason?: string;
  requestId?: string;
}

export class AuditLogger {
  constructor(private db: DbSession | DbConnection) {}

  append(input: AppendAuditInput): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      action: input.action,
      summary: input.summary,
      metadata: sanitizeAuditMetadata(input.metadata ?? {}),
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };

    this.db.prepare(
      `INSERT INTO audit_events
        (id, action, summary, metadata, actor_type, actor_id, actor_name, target_type, target_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
    ).run(
      event.id,
      event.action,
      event.summary,
      JSON.stringify(event.metadata),
      event.actor.type,
      event.actor.id ?? null,
      event.actor.name,
      event.targetType,
      event.targetId,
      event.reason ?? null,
      event.createdAt
    );

    return event;
  }

  queryByTarget(
    targetType: string,
    targetId: NomosId,
    options?: { limit?: number; offset?: number }
  ): AuditEvent[] {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const rows = this.db.all<{
      id: string;
      action: string;
      summary: string;
      metadata: string;
      actor_type: string;
      actor_id: string | null;
      actor_name: string;
      target_type: string;
      target_id: string;
      reason: string | null;
      created_at: string;
    }>(
      `SELECT * FROM audit_events
       WHERE target_type = ? AND target_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?;`,
      targetType,
      targetId,
      limit,
      offset
    );

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      summary: r.summary,
      metadata: JSON.parse(r.metadata) as Record<string, unknown>,
      actor: {
        type: r.actor_type as AuditActor["type"],
        id: r.actor_id,
        name: r.actor_name,
      },
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason ?? undefined,
      createdAt: r.created_at,
    }));
  }
}
