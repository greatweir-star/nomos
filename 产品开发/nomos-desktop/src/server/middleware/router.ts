/**
 * Nomos V0.0.3 轻量级路由注册器
 * 基于 Node.js http 模块，不引入 Express 等外部依赖
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { NomosContext, NomosHandler, NomosMiddleware } from "./core";
import { composeMiddleware, notFoundHandler } from "./core";
import { readJsonBody } from "../response";

export interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: NomosHandler;
}

export class Router {
  private routes: Route[] = [];
  private globalMiddleware: NomosMiddleware[] = [];

  use(middleware: NomosMiddleware): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  private addRoute(method: string, path: string, handler: NomosHandler): this {
    const keys: string[] = [];
    const pattern = path.replace(/:([^/]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
    const regex = new RegExp(`^${pattern}$`);
    this.routes.push({ method: method.toUpperCase(), pattern: regex, keys, handler });
    return this;
  }

  get(path: string, handler: NomosHandler): this {
    return this.addRoute("GET", path, handler);
  }
  post(path: string, handler: NomosHandler): this {
    return this.addRoute("POST", path, handler);
  }
  patch(path: string, handler: NomosHandler): this {
    return this.addRoute("PATCH", path, handler);
  }
  delete(path: string, handler: NomosHandler): this {
    return this.addRoute("DELETE", path, handler);
  }

  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      for (let i = 0; i < route.keys.length; i++) {
        params[route.keys[i]] = match[i + 1];
      }
      return { route, params };
    }
    return null;
  }

  handler(): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
    const global = composeMiddleware(this.globalMiddleware);
    const fallback = notFoundHandler();

    return async (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const matched = req.method ? this.match(req.method, url.pathname) : null;
      const ctx: NomosContext = {
        requestId: "pending",
        startedAt: Date.now(),
        url,
        params: matched?.params ?? {},
      };

      // 按需读取 body
      if (req.method && ["POST", "PUT", "PATCH"].includes(req.method.toUpperCase())) {
        try {
          ctx.body = await readJsonBody(req);
        } catch (err) {
          // 后续 handler 中自行处理解析失败
        }
      }

      const target = matched?.route.handler ?? fallback;
      await global(req, res, ctx, async () => {
        await target(req, res, ctx);
      });
    };
  }
}

/** 创建 /api/v1 前缀路由 */
export function createV1Router(): Router {
  return new Router();
}
