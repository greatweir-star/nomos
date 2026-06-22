/**
 * Nomos V0.0.3 Repository 基类
 * 提供标准 CRUD、乐观锁和软删除支持
 */

import { randomUUID } from "node:crypto";
import { DbSession } from "./connection";
import { TransactionManager } from "./transaction";
import { type NomosId, type EntityBase } from "../../domain/shared/types";
import { NomosError } from "../../domain/shared/errors";

export interface RepositoryOptions {
  table: string;
  idColumn?: string;
  versionColumn?: string;
  softDelete?: boolean;
  statusColumn?: string;
}

export abstract class Repository<T extends EntityBase> {
  protected idColumn = "id";
  protected versionColumn = "version";
  protected softDelete = false;
  protected statusColumn = "status";

  constructor(
    protected db: DbSession,
    protected txManager: TransactionManager,
    options: RepositoryOptions
  ) {
    this.idColumn = options.idColumn ?? "id";
    this.versionColumn = options.versionColumn ?? "version";
    this.softDelete = options.softDelete ?? false;
    this.statusColumn = options.statusColumn ?? "status";
  }

  protected abstract rowToEntity(row: Record<string, unknown>): T;
  protected abstract entityToRow(entity: Partial<T>): Record<string, unknown>;

  now(): string {
    return new Date().toISOString();
  }

  generateId(): NomosId {
    return randomUUID();
  }

  findById(id: NomosId): T | null {
    const row = this.db.get<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName()} WHERE ${this.idColumn} = ? LIMIT 1;`,
      id
    );
    return row ? this.rowToEntity(row) : null;
  }

  findAll(options?: { limit?: number; offset?: number }): T[] {
    const limit = options?.limit ?? 200;
    const offset = options?.offset ?? 0;
    const rows = this.db.all<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName()} ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
      limit,
      offset
    );
    return rows.map((r) => this.rowToEntity(r));
  }

  exists(id: NomosId): boolean {
    const row = this.db.get<{ count: number }>(
      `SELECT 1 as count FROM ${this.tableName()} WHERE ${this.idColumn} = ? LIMIT 1;`,
      id
    );
    return row !== undefined;
  }

  insert(entity: Omit<T, "createdAt" | "updatedAt" | "version"> & Partial<EntityBase>): T {
    const now = this.now();
    const id = entity.id ?? this.generateId();
    const version = entity.version ?? 1;
    const full = {
      ...entity,
      id,
      created_at: entity.createdAt ?? now,
      updated_at: entity.updatedAt ?? now,
      version,
    } as unknown as Record<string, unknown>;

    const row = this.entityToRow(full as Partial<T>);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const values: (string | number | null | boolean | Buffer)[] = columns.map((c) => row[c] as (string | number | null | boolean | Buffer));

    this.db.run(
      `INSERT INTO ${this.tableName()} (${columns.join(", ")}) VALUES (${placeholders});`,
      ...values
    );

    return this.findById(id)!;
  }

  update(
    id: NomosId,
    changes: Partial<Omit<T, "id" | "createdAt">>,
    expectedVersion?: number,
    requestId?: string
  ): T {
    const entity = this.findById(id);
    if (!entity) {
      throw new NomosError({
        title: "资源不存在",
        status: 404,
        code: "NOT_FOUND",
        detail: `未找到 ${this.tableName()}/${id}`,
        requestId: requestId ?? "unknown",
      });
    }

    if (expectedVersion !== undefined && entity.version !== expectedVersion) {
      throw new NomosError({
        title: "乐观锁冲突",
        status: 409,
        code: "VERSION_CONFLICT",
        detail: "资源版本已变更，请刷新后重试",
        requestId: requestId ?? "unknown",
      });
    }

    const row = this.entityToRow(changes as Partial<T>);
    const setters: string[] = [];
    const values: (string | number | null | boolean | Buffer)[] = [];

    for (const [key, value] of Object.entries(row)) {
      if (value === undefined) continue;
      setters.push(`${key} = ?`);
      values.push(value as (string | number | null | boolean | Buffer));
    }

    setters.push(`${this.versionColumn} = ${this.versionColumn} + 1`);
    setters.push("updated_at = ?");
    values.push(this.now());
    values.push(id);

    const sql = `UPDATE ${this.tableName()} SET ${setters.join(", ")} WHERE ${this.idColumn} = ?;`;
    this.db.run(sql, ...values);

    return this.findById(id)!;
  }

  delete(id: NomosId, requestId?: string): void {
    if (this.softDelete) {
      this.db.run(
        `UPDATE ${this.tableName()} SET ${this.statusColumn} = 'deleted', updated_at = ? WHERE ${this.idColumn} = ?;`,
        this.now(),
        id
      );
      return;
    }

    const result = this.db.run(
      `DELETE FROM ${this.tableName()} WHERE ${this.idColumn} = ?;`,
      id
    );
    if (result.changes === 0) {
      throw new NomosError({
        title: "资源不存在",
        status: 404,
        code: "NOT_FOUND",
        detail: `未找到 ${this.tableName()}/${id}`,
        requestId: requestId ?? "unknown",
      });
    }
  }

  protected tableName(): string {
    return this.constructor.name
      .replace(/Repository$/, "")
      .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      .replace(/^_/, "");
  }
}
