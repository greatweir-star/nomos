/**
 * Nomos V0.0.3 新旧系统适配层
 * 保留现有 backend/ 和 JSON 实现，通过适配层调用新内核
 * 不修改旧 server.js 入口；新路由通过 electron/main.js 可选启用
 */

import type { NomosServer } from "../../server";
import { createNomosServerV1 } from "../../server";

export interface BridgeOptions {
  dataDir: string;
  port?: number;
  enableV1?: boolean;
}

export interface NomosBridge {
  v1: NomosServer | null;
  start(): Promise<{ url: string; port: number }>;
  stop(): Promise<void>;
}

/**
 * 创建渐进适配桥。
 * 当 enableV1=true 时同时启动 V1 服务器（不同端口）。
 * 旧系统不受影响，前端可通过 Origin 或端口切换。
 */
export function createBridge(options: BridgeOptions): NomosBridge {
  const v1 = options.enableV1 ? createNomosServerV1({
    dataDir: options.dataDir,
    port: options.port ? options.port + 1 : 0,
  }) : null;

  return {
    v1,

    async start() {
      if (v1) {
        return await v1.start();
      }
      throw new Error("V1 server is not enabled");
    },

    async stop() {
      if (v1) {
        await v1.stop();
      }
    },
  };
}

/**
 * 用于旧 server.js 中可选注入新仓储的兼容包装。
 * 不强制迁移，只在已存在 SQLite 时使用。
 */
export function tryOpenV1Db(dataDir: string): { isOpen: boolean; error?: string } {
  try {
    const { DbConnection } = require("../../infrastructure/database/connection");
    const { MigrationRunner } = require("../../infrastructure/database/migrations");
    const { CORE_MIGRATIONS } = require("../../infrastructure/database/migrations");
    const db = new DbConnection({ dataDir, dbName: "nomos-v1.sqlite" });
    db.open();
    const runner = new MigrationRunner(db);
    runner.migrate(CORE_MIGRATIONS, true); // dry-run
    db.close();
    return { isOpen: true, error: undefined };
  } catch (err) {
    return {
      isOpen: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
