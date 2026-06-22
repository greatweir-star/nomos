/**
 * Nomos V0.0.3 中间件框架
 * requestId、CORS、Host/Origin 校验、日志、脱敏
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { sendError } from "../response";
import { NomosError } from "../../domain/shared/errors";

export interface NomosContext {
  requestId: string;
  startedAt: number;
  url: URL;
  params: Record<string, string>;
  body?: unknown;
}

export type NomosHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: NomosContext
) => Promise<void> | void;

export type NomosMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: NomosContext,
  next: () => Promise<void> | void
) => Promise<void> | void;

export function composeMiddleware(
  middlewares: NomosMiddleware[]
): NomosMiddleware {
  return async (req, res, ctx, next) => {
    let index = 0;
    async function dispatch(): Promise<void> {
      if (index < middlewares.length) {
        const mw = middlewares[index++];
        await mw(req, res, ctx, dispatch);
      } else {
        await next();
      }
    }
    await dispatch();
  };
}

/** 生成 requestId 并注入上下文 */
export function requestIdMiddleware(): NomosMiddleware {
  return (_req, _res, ctx, next) => {
    ctx.requestId = randomUUID();
    return next();
  };
}

/** 仅允许本机访问 */
export function localHostMiddleware(): NomosMiddleware {
  return (req, res, ctx, next) => {
    const host = req.headers.host || "";
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "https://nomos.local/errors/FORBIDDEN",
        title: "仅允许本机访问",
        status: 403,
        code: "FORBIDDEN",
        detail: "Host 不在本地白名单",
        requestId: ctx.requestId,
      }));
      return;
    }
    return next();
  };
}

/** API 请求校验 Origin */
export function trustedOriginMiddleware(): NomosMiddleware {
  return (req, res, ctx, next) => {
    const segments = ctx.url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "api") return next();

    const origin = req.headers.origin;
    if (!origin) return next();

    try {
      const originUrl = new URL(origin);
      const isLocal = /^(127\.0\.0\.1|localhost)$/.test(originUrl.hostname);
      if (!isLocal || originUrl.host !== req.headers.host) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          type: "https://nomos.local/errors/FORBIDDEN",
          title: "请求来源不受信任",
          status: 403,
          code: "FORBIDDEN",
          detail: "Origin 校验失败",
          requestId: ctx.requestId,
        }));
        return;
      }
    } catch {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "https://nomos.local/errors/FORBIDDEN",
        title: "请求来源不受信任",
        status: 403,
        code: "FORBIDDEN",
        detail: "Origin 解析失败",
        requestId: ctx.requestId,
      }));
      return;
    }
    return next();
  };
}

/** 请求日志（脱敏） */
export function requestLogMiddleware(): NomosMiddleware {
  return async (req, res, ctx, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      const duration = Date.now() - start;
      const method = req.method ?? "GET";
      const path = ctx.url.pathname;
      // 脱敏：不记录 body 中的敏感字段
      console.log(
        `[${ctx.requestId}] ${method} ${path} ${res.statusCode ?? 0} ${duration}ms`
      );
    }
  };
}

/** 错误处理中间件（捕获未处理异常） */
export function errorHandlerMiddleware(): NomosMiddleware {
  return async (_req, res, ctx, next) => {
    try {
      await next();
    } catch (err) {
      sendError(res, err, ctx.requestId);
    }
  };
}

/** 敏感字段脱敏工具 */
const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "secret",
  "credential",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "sessionKey",
  "session_key",
]);

export function sanitizeLogPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) {
    return payload.map(sanitizeLogPayload);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "***REDACTED***";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeLogPayload(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** 统一返回 404 的路由兜底 */
export function notFoundHandler(): NomosHandler {
  return (_req, res, ctx) => {
    const err = new NomosError({
      title: "资源不存在",
      status: 404,
      code: "NOT_FOUND",
      detail: `未找到 ${ctx.url.pathname} 对应的处理程序`,
      requestId: ctx.requestId,
    });
    sendError(res, err, ctx.requestId);
  };
}
