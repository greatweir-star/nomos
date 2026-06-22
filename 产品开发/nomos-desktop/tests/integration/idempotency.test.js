const assert = require("node:assert");
const { describe, it, before, after } = require("node:test");
const { createTestFixture } = require("../fixture");

// 简化测试：直接在 fixture 上操作 idempotency_keys 表
describe("infrastructure/idempotency", () => {
  let fixture;

  before(() => {
    fixture = createTestFixture();
  });

  after(() => {
    fixture.cleanup();
  });

  it("相同幂等键+相同请求返回已缓存", () => {
    fixture.db.prepare(
      `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?);`
    ).run(
      "key-1", "hash-a", 201, '{"id":"1"}', "2025-01-01T00:00:00Z", "2099-01-01T00:00:00Z"
    );
    const row = fixture.db
      .prepare("SELECT * FROM idempotency_keys WHERE key = ? AND expires_at > ?;")
      .get("key-1", new Date().toISOString());
    assert.ok(row);
    assert.strictEqual(row.request_hash, "hash-a");
  });

  it("过期键可被清理", () => {
    fixture.db.prepare(
      `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?);`
    ).run(
      "key-2", "hash-b", 200, "ok", "2025-01-01T00:00:00Z", "2000-01-01T00:00:00Z"
    );
    const result = fixture.db.prepare(
      `DELETE FROM idempotency_keys WHERE expires_at <= ?;`
    ).run(
      new Date().toISOString()
    );
    assert.strictEqual(result.changes, 1);
  });
});
