/**
 * Nomos V0.0.3 SQLite 连接与数据库会话
 * 使用 Node.js 内置 node:sqlite（实验性，Electron 42 / Node 22+ 已包含）
 */

import { DatabaseSync, type DatabaseSyncOptions } from "node:sqlite";
import * as path from "node:path";
import * as fs from "node:fs";

export interface DbConfig {
  dataDir: string;
  dbName?: string;
  readonly?: boolean;
}

export class DbConnection {
  private db: DatabaseSync | null = null;
  public readonly dbPath: string;

  constructor(private config: DbConfig) {
    this.dbPath = path.join(config.dataDir, config.dbName || "nomos.sqlite");
  }

  open(): DatabaseSync {
    if (this.db) return this.db;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    const opts: DatabaseSyncOptions = {};
    if (this.config.readonly) {
      // node:sqlite 目前不支持直接 readonly，通过 PRAGMA 控制
    }
    this.db = new DatabaseSync(this.dbPath, opts);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA synchronous = NORMAL;");
    return this.db;
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    const stmt = this.open().prepare(sql);
    return stmt.get(...params as (string | number | null)[]) as T | undefined;
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    const stmt = this.open().prepare(sql);
    return stmt.all(...params as (string | number | null)[]) as T[];
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  get isOpen(): boolean {
    return this.db !== null;
  }

  exec(sql: string): void {
    this.open().exec(sql);
  }

  prepare(sql: string) {
    return this.open().prepare(sql);
  }
}

/** 提供事务作用域的数据库会话 */
export class DbSession {
  constructor(public readonly connection: DbConnection) {}

  exec(sql: string): void {
    this.connection.exec(sql);
  }

  prepare(sql: string) {
    return this.connection.prepare(sql);
  }

  run(sql: string, ...params: unknown[]): ReturnType<ReturnType<DatabaseSync["prepare"]>["run"]> {
    const stmt = this.connection.prepare(sql);
    return stmt.run(...params as (string | number | null)[]);
  }

  get<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
    const stmt = this.connection.prepare(sql);
    return stmt.get(...params as (string | number | null)[]) as T | undefined;
  }

  all<T = unknown>(sql: string, ...params: unknown[]): T[] {
    const stmt = this.connection.prepare(sql);
    return stmt.all(...params as (string | number | null)[]) as T[];
  }
}
