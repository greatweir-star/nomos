const assert = require("node:assert");
const { describe, it, before, after } = require("node:test");
const { createTestFixture } = require("../fixture");

describe("infrastructure/database", () => {
  /** @type {ReturnType<typeof createTestFixture>} */
  let fixture;

  before(() => {
    fixture = createTestFixture();
  });

  after(() => {
    fixture.cleanup();
  });

  it("数据库连接成功且 WAL 已启用", () => {
    const row = fixture.db.prepare("PRAGMA journal_mode;").get();
    assert.strictEqual(row.journal_mode, "wal");
  });

  it("外键约束已启用", () => {
    const row = fixture.db.prepare("PRAGMA foreign_keys;").get();
    assert.strictEqual(row.foreign_keys, 1);
  });

  it("schema_migrations 表存在", () => {
    const row = fixture.db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations';")
      .get();
    assert.ok(row);
  });

  it("核心迁移已应用", () => {
    const rows = fixture.db
      .prepare("SELECT version FROM schema_migrations ORDER BY version;")
      .all();
    assert.strictEqual(rows.length, 5);
    assert.strictEqual(rows[0].version, 1);
    assert.strictEqual(rows[1].version, 2);
    assert.strictEqual(rows[2].version, 3);
    assert.strictEqual(rows[3].version, 4);
    assert.strictEqual(rows[4].version, 5);
  });

  it("事务回滚保持数据一致", () => {
    let thrown = false;
    try {
      fixture.db.exec("BEGIN TRANSACTION;");
      fixture.db.prepare("INSERT INTO skills (id, name, category, level, source, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);").run(
        "skill-1", "TypeScript", "general", 3, "manual", "active", "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z", 1
      );
      throw new Error("模拟异常");
    } catch {
      thrown = true;
      fixture.db.exec("ROLLBACK;");
    }
    assert.ok(thrown);
    const row = fixture.db.prepare("SELECT id FROM skills WHERE id = ?;").get("skill-1");
    assert.strictEqual(row, undefined);
  });

  it("事务提交后数据可查询", () => {
    fixture.db.exec("BEGIN TRANSACTION;");
    fixture.db.prepare("INSERT INTO skills (id, name, category, level, source, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);").run(
      "skill-2", "Node.js", "domain", 2, "imported", "active", "2025-01-02T00:00:00Z", "2025-01-02T00:00:00Z", 1
    );
    fixture.db.exec("COMMIT;");
    const row = fixture.db.prepare("SELECT id FROM skills WHERE id = ?;").get("skill-2");
    assert.ok(row);
    assert.strictEqual(row.id, "skill-2");
  });
});
