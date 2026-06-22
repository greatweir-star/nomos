/**
 * Nomos V0.0.3 事务管理
 * 显式事务作用域，支持回滚和乐观锁
 */

import { DbConnection, DbSession } from "./connection";
import { NomosError, versionConflict } from "../../domain/shared/errors";

export type TransactionIsolation =
  | "SERIALIZABLE"
  | "REPEATABLE READ"
  | "READ COMMITTED";

export interface TxOptions {
  isolation?: TransactionIsolation;
  readonly?: boolean;
}

export class TransactionManager {
  constructor(private db: DbConnection) {}

  /** 在事务中执行工作单元 */
  async run<T>(
    work: (session: DbSession) => T,
    options: TxOptions = {}
  ): Promise<T> {
    if (options.readonly) {
      this.db.exec("BEGIN TRANSACTION;");
    } else {
      this.db.exec("BEGIN IMMEDIATE TRANSACTION;");
    }
    const session = new DbSession(this.db);
    try {
      const result = work(session);
      this.db.exec("COMMIT;");
      return result;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK;");
      } catch {
        /* 忽略回滚失败 */
      }
      throw error;
    }
  }

  /** 乐观锁版本检查 */
  checkVersion(
    session: DbSession,
    table: string,
    id: string,
    expectedVersion: number,
    requestId: string
  ): void {
    const row = session.get<{ version: number }>(
      `SELECT version FROM ${table} WHERE id = ?;`,
      id
    );
    if (!row) {
      throw new NomosError({
        title: "资源不存在",
        status: 404,
        code: "NOT_FOUND",
        detail: `资源 ${table}/${id} 不存在`,
        requestId,
      });
    }
    if (row.version !== expectedVersion) {
      throw versionConflict(requestId);
    }
  }

  /** 执行带版本检查的更新 */
  updateWithVersion(
    session: DbSession,
    sql: string,
    params: unknown[],
    expectedRowsAffected: number,
    requestId: string
  ): void {
    const result = session.run(sql, ...(params as (string | number | null)[]));
    if (result.changes !== expectedRowsAffected) {
      throw versionConflict(requestId);
    }
  }
}
