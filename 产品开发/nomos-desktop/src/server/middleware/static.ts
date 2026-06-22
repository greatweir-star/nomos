import type { NomosMiddleware } from "./core";
import * as fs from "node:fs";
import * as path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export function staticRendererMiddleware(rendererDir?: string): NomosMiddleware {
  const root = rendererDir ? path.resolve(rendererDir) : null;

  return (req, res, ctx, next) => {
    if (!root || !["GET", "HEAD"].includes(req.method || "GET")) return next();
    if (ctx.url.pathname.startsWith("/api/")) return next();

    let pathname: string;
    try {
      pathname = decodeURIComponent(ctx.url.pathname);
    } catch {
      return next();
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return next();

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return next();
    }
    if (!stat.isFile()) return next();

    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  };
}
