/**
 * Nomos V0.0.3 Health Check
 */

import type { NomosHandler, NomosContext } from "../middleware/core";
import { sendSuccess } from "../response";
import type { IncomingMessage, ServerResponse } from "node:http";

export function healthRouter(): NomosHandler {
  return (_req: IncomingMessage, res: ServerResponse, ctx: NomosContext) => {
    sendSuccess(
      res,
      200,
      {
        status: "ok",
        service: "nomos-v1",
        version: "0.0.3",
        timestamp: new Date().toISOString(),
      },
      ctx.requestId
    );
  };
}
