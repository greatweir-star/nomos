/**
 * Nomos V0.0.3 统一响应格式
 * 成功：{ data, meta: { requestId, nextCursor? } }
 * 失败：Problem Details
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { type ProblemDetails, NomosError } from "../domain/shared/errors";

export interface SuccessPayload<T> {
  data: T;
  meta: {
    requestId: string;
    nextCursor?: string | null;
  };
}

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export function sendJson<T>(
  res: ServerResponse,
  statusCode: number,
  payload: T
): void {
  res.writeHead(statusCode, {
    "Content-Type": JSON_CONTENT_TYPE,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  res.end(JSON.stringify(payload));
}

export function sendSuccess<T>(
  res: ServerResponse,
  statusCode: number,
  data: T,
  requestId: string,
  nextCursor?: string | null
): void {
  const payload: SuccessPayload<T> = {
    data,
    meta: { requestId, nextCursor: nextCursor ?? null },
  };
  sendJson(res, statusCode, payload);
}

export function sendProblem(
  res: ServerResponse,
  problem: ProblemDetails
): void {
  sendJson(res, problem.status, problem);
}

export function sendError(
  res: ServerResponse,
  error: unknown,
  requestId: string
): void {
  if (error instanceof NomosError) {
    sendProblem(res, error.toProblemDetails());
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  const problem: ProblemDetails = {
    type: "https://nomos.local/errors/INTERNAL_ERROR",
    title: "内部服务器错误",
    status: 500,
    code: "INTERNAL_ERROR",
    detail: err.message,
    requestId,
  };
  sendProblem(res, problem);
}

export function readJsonBody<T = Record<string, unknown>>(
  req: IncomingMessage,
  maxBytes = 1024 * 1024
): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("请求内容过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
      } catch {
        reject(new Error("请求内容不是有效 JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function parseSearchParams(
  url: string
): Record<string, string> {
  const { searchParams } = new URL(url, "http://127.0.0.1");
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
