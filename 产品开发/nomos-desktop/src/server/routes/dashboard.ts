import type { NomosHandler } from "../middleware/core";
import { sendSuccess } from "../response";
import type { DbConnection } from "../../infrastructure/database/connection";

function count(db: DbConnection, sql: string): number {
  return Number(db.get<{ total: number }>(sql)?.total || 0);
}

export function dashboardRouter(db: DbConnection): NomosHandler {
  return (_req, res, ctx) => {
    const exceptions: Array<Record<string, unknown>> = [];
    for (const row of db.all<{id:string;name:string;status:string}>("SELECT id,name,status FROM connection_profiles WHERE status IN ('offline','degraded','unmanageable')")) {
      exceptions.push({type:"connection",severity:row.status==="offline"?"critical":"warning",targetId:row.id,title:`连接异常：${row.name}`,reason:`当前状态 ${row.status}`});
    }
    for (const row of db.all<{id:string;title:string;status:string}>("SELECT id,title,status FROM work_items WHERE status IN ('blocked','failed')")) {
      exceptions.push({type:"work_item",severity:row.status==="failed"?"critical":"warning",targetId:row.id,title:`工作项异常：${row.title}`,reason:`当前状态 ${row.status}`});
    }
    sendSuccess(
      res,
      200,
      {
        counts: {
          schedulableEmployees: count(db, "SELECT COUNT(*) AS total FROM employees WHERE schedulable = 1"),
          runningWorkItems: count(db, "SELECT COUNT(*) AS total FROM work_items WHERE status = 'running'"),
          pendingDispatches: count(db, "SELECT COUNT(*) AS total FROM dispatches WHERE status IN ('previewed', 'pending_confirmation')"),
          pendingAcceptances: count(db, "SELECT COUNT(*) AS total FROM work_items WHERE status = 'review_pending'"),
          pendingPermissionRequests: count(db, "SELECT COUNT(*) AS total FROM permission_requests WHERE status = 'pending'"),
        },
        exceptions,
        updatedAt: new Date().toISOString(),
      },
      ctx.requestId
    );
  };
}
