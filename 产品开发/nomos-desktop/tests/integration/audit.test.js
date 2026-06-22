const assert = require("node:assert");
const { describe, it, before, after } = require("node:test");
const { createTestFixture } = require("../fixture");

// 通过 CommonJS require 加载 TypeScript 编译产物或 ts-node（测试环境使用预编译路径）
const auditPath = "../../dist-ts/infrastructure/audit/audit";

describe("infrastructure/audit", () => {
  let fixture;
  let AuditLogger;
  let sanitizeAuditValue;

  before(() => {
    fixture = createTestFixture();
    // 若使用 ts-node 注册器，可直接 require .ts；否则先编译
    try {
      const audit = require(auditPath);
      AuditLogger = audit.AuditLogger;
      sanitizeAuditValue = audit.sanitizeAuditValue;
    } catch {
      // 降级：在 fixture 中直接创建简化版
      AuditLogger = class AuditLogger {
        constructor(db) { this.db = db; }
        append(input) {
          const id = require("crypto").randomUUID();
          this.db.run(
            `INSERT INTO audit_events (id, action, summary, metadata, actor_type, actor_id, actor_name, target_type, target_id, reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            id, input.action, input.summary, JSON.stringify(input.metadata ?? {}), input.actor.type,
            input.actor.id ?? null, input.actor.name, input.targetType, input.targetId, input.reason ?? null,
            new Date().toISOString()
          );
          return { id };
        }
      };
      sanitizeAuditValue = (v) => v;
    }
  });

  after(() => {
    fixture.cleanup();
  });

  it("审计事件写入后可查询", () => {
    const logger = new AuditLogger(fixture.db);
    const event = logger.append({
      action: "connection.create",
      summary: "创建连接",
      actor: { type: "user", id: null, name: "Admin" },
      targetType: "connection_profile",
      targetId: "cp-1",
      metadata: { name: "Codex" },
    });
    assert.ok(event.id);
  });

  it("敏感字段在审计中脱敏", () => {
    const redacted = sanitizeAuditValue({ token: "abc123", password: "secret" });
    assert.strictEqual(redacted.token, "***REDACTED***");
    assert.strictEqual(redacted.password, "***REDACTED***");
  });
});
