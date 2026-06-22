/**
 * Nomos V0.0.3 测试入口与共享夹具
 * 隔离测试数据，禁止写入用户实际工作区
 */

const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { DbConnection } = require("../dist-ts/infrastructure/database/connection");
const { MigrationRunner, CORE_MIGRATIONS } = require("../dist-ts/infrastructure/database/migrations");
const { TransactionManager } = require("../dist-ts/infrastructure/database/transaction");

function createTestFixture() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nomos-test-"));
  const db = new DbConnection({ dataDir, dbName: "test.sqlite" });
  db.open();
  const runner = new MigrationRunner(db);
  runner.migrate(CORE_MIGRATIONS, false);
  const txManager = new TransactionManager(db);

  return {
    dataDir,
    db,
    txManager,
    cleanup() {
      db.close();
      try {
        fs.rmSync(dataDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    },
  };
}

module.exports = { createTestFixture };
