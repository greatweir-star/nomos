const assert = require("node:assert");
const { describe, it } = require("node:test");
const {
  NomosError,
  ErrorCodes,
  notFound,
  forbidden,
  validationError,
  versionConflict,
  idempotencyConflict,
  invalidStateTransition,
} = require("../../dist-ts/domain/shared/errors");

describe("domain/shared/errors", () => {
  it("NomosError 包含完整 Problem Details", () => {
    const err = new NomosError({
      title: "测试错误",
      status: 400,
      code: ErrorCodes.VALIDATION_ERROR,
      detail: "字段不合法",
      requestId: "req-1",
    });
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.code, "VALIDATION_ERROR");
    assert.strictEqual(err.requestId, "req-1");
    const pd = err.toProblemDetails();
    assert.strictEqual(pd.status, 400);
    assert.strictEqual(pd.code, "VALIDATION_ERROR");
  });

  it("notFound 生成正确错误", () => {
    const err = notFound("ConnectionProfile", "req-2");
    assert.strictEqual(err.status, 404);
    assert.strictEqual(err.code, "NOT_FOUND");
    assert.ok(err.detail.includes("ConnectionProfile"));
  });

  it("forbidden 生成正确错误", () => {
    const err = forbidden("删除项目", "req-3");
    assert.strictEqual(err.status, 403);
    assert.strictEqual(err.code, "FORBIDDEN");
  });

  it("validationError 支持字段错误", () => {
    const err = validationError("请求无效", "req-4", [
      { field: "name", code: "REQUIRED", message: "必填" },
    ]);
    assert.strictEqual(err.status, 400);
    assert.ok(err.fieldErrors);
    assert.strictEqual(err.fieldErrors.length, 1);
  });

  it("versionConflict 返回 409", () => {
    const err = versionConflict("req-5");
    assert.strictEqual(err.status, 409);
    assert.strictEqual(err.code, "VERSION_CONFLICT");
  });

  it("idempotencyConflict 返回 409", () => {
    const err = idempotencyConflict("req-6");
    assert.strictEqual(err.status, 409);
    assert.strictEqual(err.code, "IDEMPOTENCY_CONFLICT");
  });

  it("invalidStateTransition 返回 409 并描述状态", () => {
    const err = invalidStateTransition("draft", "done", "req-7");
    assert.strictEqual(err.status, 409);
    assert.strictEqual(err.code, "INVALID_STATE_TRANSITION");
    assert.ok(err.detail.includes("draft"));
    assert.ok(err.detail.includes("done"));
  });
});
