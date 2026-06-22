/**
 * Nomos V0.0.3 幂等处理
 * 所有写操作接收 Idempotency-Key；重复请求不重复执行
 */

import { DbSession } from "../database/connection";
import { idempotencyConflict } from "../../domain/shared/errors";

export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: string;
  createdAt: string;
  expiresAt: string;
}

export interface IdempotencyStore {
  get(key: string): IdempotencyRecord | undefined;
  set(key: string, record: IdempotencyRecord): void;
  deleteExpired(before: string): number;
}

export class SqliteIdempotencyStore implements IdempotencyStore {
  constructor(private db: DbSession) {}

  get(key: string): IdempotencyRecord | undefined {
    const row = this.db.get<{
      key: string;
      request_hash: string;
      response_status: number;
      response_body: string;
      created_at: string;
      expires_at: string;
    }>(
      `SELECT * FROM idempotency_keys WHERE key = ? AND expires_at > ?;`,
      key,
      new Date().toISOString()
    );
    if (!row) return undefined;
    return {
      key: row.key,
      requestHash: row.request_hash,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  set(key: string, record: IdempotencyRecord): void {
    this.db.run(
      `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         request_hash = excluded.request_hash,
         response_status = excluded.response_status,
         response_body = excluded.response_body,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at;`,
      key,
      record.requestHash,
      record.responseStatus,
      record.responseBody,
      record.createdAt,
      record.expiresAt
    );
  }

  deleteExpired(before: string): number {
    const result = this.db.run(
      `DELETE FROM idempotency_keys WHERE expires_at <= ?;`,
      before
    );
    return Number(result.changes);
  }
}

export class IdempotencyGuard {
  private ttlMinutes = 24 * 60; // 24 小时

  constructor(private store: IdempotencyStore) {}

  /** 检查幂等键；相同键+相同请求返回已缓存响应；相同键+不同请求报错 */
  check(
    key: string | undefined,
    requestHash: string,
    requestId: string
  ): { status: number; body: string } | null {
    if (!key) return null;
    const existing = this.store.get(key);
    if (!existing) return null;

    if (existing.requestHash !== requestHash) {
      throw idempotencyConflict(requestId);
    }

    return { status: existing.responseStatus, body: existing.responseBody };
  }

  /** 保存幂等响应 */
  save(
    key: string | undefined,
    requestHash: string,
    responseStatus: number,
    responseBody: string
  ): void {
    if (!key) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMinutes * 60 * 1000);
    this.store.set(key, {
      key,
      requestHash,
      responseStatus,
      responseBody,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  /** 清理过期键 */
  cleanup(): number {
    return this.store.deleteExpired(new Date().toISOString());
  }
}

export function hashRequest(
  method: string,
  path: string,
  body: unknown
): string {
  const payload = JSON.stringify({ method, path, body });
  // 使用简单的 hash 组合；Node 内置 crypto 可用于更严格场景
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${hash}`;
}
