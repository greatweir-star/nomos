import type { Success, Problem, ListParams } from "@/types/api";

export class ApiError extends Error {
  constructor(
    public readonly problem: Problem,
    public readonly status: number,
  ) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  readonly originalCause: unknown;
  constructor(cause: unknown) {
    super("网络连接失败，请检查应用是否正常运行");
    this.name = "NetworkError";
    this.originalCause = cause;
  }
}

const BASE = "/api/v1";

let _idempotencyCounter = 0;
export function newIdempotencyKey(): string {
  return `idem-${Date.now()}-${++_idempotencyCounter}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<Success<T>> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
      ...options,
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      {
        type: "about:blank",
        title: "无效响应",
        status: response.status,
        code: "INVALID_RESPONSE",
        detail: `服务端返回了非 JSON 响应 (HTTP ${response.status})`,
        requestId: "",
      },
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiError(body as Problem, response.status);
  }

  return body as Success<T>;
}

export function get<T>(path: string, params?: ListParams): Promise<Success<T>> {
  const url = params
    ? `${path}?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      )}`
    : path;
  return request<T>(url, { method: "GET" });
}

export function post<T>(
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Success<T>> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: extraHeaders,
  });
}

export function patch<T>(path: string, body: unknown): Promise<Success<T>> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string, body?: unknown): Promise<Success<T>> {
  return request<T>(path, {
    method: "DELETE",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
