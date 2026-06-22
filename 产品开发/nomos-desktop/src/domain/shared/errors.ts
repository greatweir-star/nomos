/**
 * Nomos V0.0.3 稳定错误码
 * 与 API 字段合同 §7 保持一致
 * https://nomos-docs/api-contract#error-codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  REFERENCE_CONFLICT: "REFERENCE_CONFLICT",
  PREVIEW_EXPIRED: "PREVIEW_EXPIRED",
  CANDIDATE_NO_LONGER_ELIGIBLE: "CANDIDATE_NO_LONGER_ELIGIBLE",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  CONNECTION_UNMANAGEABLE: "CONNECTION_UNMANAGEABLE",
  CAPACITY_EXHAUSTED: "CAPACITY_EXHAUSTED",
  CREDENTIAL_UNAVAILABLE: "CREDENTIAL_UNAVAILABLE",
  FLOW_VALIDATION_FAILED: "FLOW_VALIDATION_FAILED",
  MIGRATION_REVIEW_REQUIRED: "MIGRATION_REVIEW_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  fieldErrors?: FieldError[];
  requestId: string;
}

export class NomosError extends Error {
  public readonly type: string;
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly detail: string;
  public readonly fieldErrors?: FieldError[];
  public readonly requestId: string;

  constructor(params: {
    type?: string;
    title: string;
    status: number;
    code: ErrorCode;
    detail?: string;
    fieldErrors?: FieldError[];
    requestId?: string;
  }) {
    super(params.title);
    this.name = "NomosError";
    this.type = params.type ?? `https://nomos.local/errors/${params.code}`;
    this.status = params.status;
    this.code = params.code;
    this.detail = params.detail ?? params.title;
    this.fieldErrors = params.fieldErrors;
    this.requestId = params.requestId ?? "unknown";
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.message,
      status: this.status,
      code: this.code,
      detail: this.detail,
      fieldErrors: this.fieldErrors,
      requestId: this.requestId,
    };
  }
}

export function notFound(resource: string, requestId: string): NomosError {
  return new NomosError({
    title: `${resource} 不存在`,
    status: 404,
    code: ErrorCodes.NOT_FOUND,
    detail: `请求的资源 ${resource} 未找到`,
    requestId,
  });
}

export function forbidden(action: string, requestId: string): NomosError {
  return new NomosError({
    title: "管理权限不足",
    status: 403,
    code: ErrorCodes.FORBIDDEN,
    detail: `当前身份没有权限执行：${action}`,
    requestId,
  });
}

export function validationError(
  detail: string,
  requestId: string,
  fieldErrors?: FieldError[]
): NomosError {
  return new NomosError({
    title: "请求字段不合法",
    status: 400,
    code: ErrorCodes.VALIDATION_ERROR,
    detail,
    fieldErrors,
    requestId,
  });
}

export function versionConflict(requestId: string): NomosError {
  return new NomosError({
    title: "乐观锁冲突",
    status: 409,
    code: ErrorCodes.VERSION_CONFLICT,
    detail: "资源版本已变更，请刷新后重试",
    requestId,
  });
}

export function idempotencyConflict(requestId: string): NomosError {
  return new NomosError({
    title: "幂等键冲突",
    status: 409,
    code: ErrorCodes.IDEMPOTENCY_CONFLICT,
    detail: "同一 Idempotency-Key 对应不同请求内容",
    requestId,
  });
}

export function invalidStateTransition(
  from: string,
  to: string,
  requestId: string
): NomosError {
  return new NomosError({
    title: "状态转换不允许",
    status: 409,
    code: ErrorCodes.INVALID_STATE_TRANSITION,
    detail: `从 ${from} 到 ${to} 的转换不被允许`,
    requestId,
  });
}
