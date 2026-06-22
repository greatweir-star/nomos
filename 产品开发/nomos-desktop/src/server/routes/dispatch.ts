import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { NomosHandler } from "../middleware/core";
import { createDtoValidator } from "../middleware/schema";
import { sendSuccess } from "../response";
import type {
  DbConnection,
  DbSession,
} from "../../infrastructure/database/connection";
import type { TransactionManager } from "../../infrastructure/database/transaction";
import { AuditLogger } from "../../infrastructure/audit/audit";
import {
  ErrorCodes,
  NomosError,
  notFound,
  validationError,
} from "../../domain/shared/errors";

type Dict = Record<string, unknown>;
const parse = <T>(v: unknown, f: T): T => {
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return f;
  }
};
const required = <T extends Dict>(
  db: DbConnection | DbSession,
  table: string,
  id: string,
  requestId: string,
): T => {
  const r = db.get<T>(`SELECT * FROM ${table} WHERE id=?`, id);
  if (!r) throw notFound(`${table}/${id}`, requestId);
  return r;
};
const audit = (
  s: DbSession,
  requestId: string,
  action: string,
  summary: string,
  type: string,
  id: string,
) =>
  new AuditLogger(s).append({
    action,
    summary,
    actor: { type: "user", id: null, name: "本机 Owner" },
    targetType: type,
    targetId: id,
    requestId,
  });
const confirmInput = createDtoValidator<Dict>({
  employeeId: { type: "string", minLength: 1 },
});
const receiptInput = createDtoValidator<Dict>({
  status: {
    type: "string",
    enum: ["progress", "completed", "blocked", "failed"],
  },
  summary: { type: "string", minLength: 1, maxLength: 4000 },
  deliverables: { type: "array", default: [], optional: true },
  tests: { type: "array", default: [], optional: true },
  risks: { type: "array", default: [], optional: true },
  nextActions: { type: "array", default: [], optional: true },
});
const acceptanceInput = createDtoValidator<Dict>({
  reviewerEmployeeId: { type: "string", minLength: 1 },
  result: { type: "string", enum: ["accepted", "rejected", "rework"] },
  againstCriteria: { type: "array", minLength: 1 },
  comment: { type: "string", minLength: 2, maxLength: 4000 },
});
function valid(result: ReturnType<typeof confirmInput>, requestId: string) {
  if (!result.success || !result.data)
    throw validationError("请求字段不符合合同", requestId, result.errors);
  return result.data;
}
function mapWork(row: Dict) {
  return {
    id: row.id,
    projectId: row.project_id,
    nodeInstanceId: row.node_instance_id,
    positionSlotId: row.position_slot_id,
    title: row.title,
    requirements: row.requirements || "",
    requiredPositionId: row.required_position_id,
    assigneeEmployeeId: row.assignee_employee_id,
    actingPositionId: row.acting_position_id,
    status: row.status,
    attempt: row.attempt,
    acceptanceCriteriaSnapshot: parse(row.acceptance_criteria_snapshot, []),
    dependencyIds: parse(row.dependency_ids, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}
function candidate(db: DbConnection | DbSession, employee: Dict, work: Dict) {
  const positionMatch =
    employee.primary_position_id === work.required_position_id ||
    Boolean(
      db.get(
        "SELECT 1 FROM employee_positions WHERE employee_id=? AND position_id=?",
        String(employee.id),
        String(work.required_position_id),
      ),
    );
  const profile = employee.connection_profile_id
    ? db.get<Dict>(
        "SELECT * FROM connection_profiles WHERE id=?",
        String(employee.connection_profile_id),
      )
    : undefined;
  const active = Number(profile?.active_sessions || 0),
    capacity = Number(
      profile?.concurrency_capacity || (employee.type === "carbon" ? 1 : 0),
    );
  const reasons: string[] = [],
    ineligible: string[] = [];
  if (!positionMatch) ineligible.push("岗位不匹配");
  else reasons.push("岗位匹配");
  if (employee.status !== "schedulable" || !employee.schedulable)
    ineligible.push("员工当前不可调度");
  else reasons.push("员工状态可调度");
  if (employee.type !== "carbon") {
    if (!profile || profile.status !== "connected" || !profile.manageable)
      ineligible.push("技术连接不可管理");
    else reasons.push("技术连接正常");
  }
  if (capacity <= active) ineligible.push("连接容量已满");
  else reasons.push("存在可用容量");
  const eligible = ineligible.length === 0;
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    actingPositionId: work.required_position_id,
    positionName:
      db.get<Dict>(
        "SELECT name FROM positions WHERE id=?",
        String(work.required_position_id),
      )?.name || "",
    connectionProfileId: employee.connection_profile_id,
    connectionStatus: profile?.status || null,
    workload: {
      active,
      capacity,
      utilization: capacity > 0 ? active / capacity : null,
    },
    eligible,
    score: eligible ? 100 - active * 10 : null,
    reasons,
    ineligibleReasons: ineligible,
  };
}
function mapReceipt(db: DbConnection | DbSession, row: Dict) {
  return {
    id: row.id,
    executionId: row.execution_id,
    workItemId: row.work_item_id,
    attempt: row.attempt,
    status: row.status,
    summary: row.summary || "",
    deliverables: db
      .all<Dict>(
        "SELECT id,type,label,uri FROM deliverables WHERE receipt_id=? ORDER BY created_at",
        String(row.id),
      )
      .map((d) => ({ id: d.id, type: d.type, label: d.label, uri: d.uri })),
    tests: parse(row.tests, []),
    risks: parse(row.risks, []),
    nextActions: parse(row.next_actions, []),
    createdAt: row.created_at,
  };
}
function idem(req: IncomingMessage, requestId: string) {
  const value = req.headers["idempotency-key"];
  const key = Array.isArray(value) ? value[0] : value;
  if (!key || key.length < 8)
    throw validationError(
      "确认派发必须提供至少 8 位 Idempotency-Key",
      requestId,
    );
  return key;
}

export function dispatchRouter(db: DbConnection, tx: TransactionManager) {
  const preview: NomosHandler = async (_req, res, ctx) => {
    const work = required<Dict>(db, "work_items", ctx.params.id, ctx.requestId);
    if (work.status !== "pending_dispatch")
      throw new NomosError({
        title: "工作项当前不可派发",
        status: 409,
        code: ErrorCodes.INVALID_STATE_TRANSITION,
        detail: `当前状态 ${work.status}`,
        requestId: ctx.requestId,
      });
    const candidates = db
      .all<Dict>("SELECT * FROM employees ORDER BY created_at")
      .map((e) => candidate(db, e, work))
      .sort((a, b) => (b.score || -1) - (a.score || -1));
    if (candidates.length === 0)
      throw validationError("组织中尚无员工候选", ctx.requestId);
    const selected = candidates.find((c) => c.eligible) || candidates[0];
    const dispatchId = await tx.run((s) => {
      const id = randomUUID(),
        now = new Date(),
        expires = new Date(now.getTime() + 5 * 60_000).toISOString();
      s.run(
        "INSERT INTO dispatches(id,work_item_id,employee_id,acting_position_id,idempotency_key,status,capacity_leased,preview_expires_at,created_at,updated_at,version) VALUES(?,?,?,?,?,'previewed',0,?,?,?,1)",
        id,
        work.id,
        selected.employeeId,
        work.required_position_id,
        `preview:${id}`,
        expires,
        now.toISOString(),
        now.toISOString(),
      );
      for (const c of candidates)
        s.run(
          "INSERT INTO candidate_scores(id,dispatch_id,employee_id,acting_position_id,score,eligible,reasons,ineligible_reasons,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
          randomUUID(),
          id,
          c.employeeId,
          c.actingPositionId,
          c.score,
          c.eligible ? 1 : 0,
          JSON.stringify(c.reasons),
          JSON.stringify(c.ineligibleReasons),
          now.toISOString(),
        );
      audit(
        s,
        ctx.requestId,
        "dispatch.previewed",
        "计算派发候选，不占用容量",
        "dispatch",
        id,
      );
      return id;
    });
    const dispatch = required<Dict>(
      db,
      "dispatches",
      dispatchId,
      ctx.requestId,
    );
    sendSuccess(
      res,
      200,
      {
        dispatchId,
        workItemSnapshot: mapWork(work),
        candidates,
        selectedEmployeeId: selected.eligible ? selected.employeeId : null,
        recommendationReason: selected.eligible
          ? selected.reasons.join("；")
          : "当前没有合格候选",
        riskSummary: candidates.some((c) => !c.eligible)
          ? ["部分候选因状态、连接、岗位或容量不合格"]
          : [],
        expiresAt: dispatch.preview_expires_at,
      },
      ctx.requestId,
    );
  };
  const confirm: NomosHandler = async (req, res, ctx) => {
    const input = valid(confirmInput(ctx.body), ctx.requestId),
      key = idem(req, ctx.requestId);
    const existing = db.get<Dict>(
      "SELECT e.*,d.employee_id FROM executions e JOIN dispatches d ON d.id=e.dispatch_id WHERE d.idempotency_key=?",
      key,
    );
    if (existing) {
      if (existing.employee_id !== input.employeeId) {
        throw new NomosError({
          title: "幂等键冲突",
          status: 409,
          code: ErrorCodes.IDEMPOTENCY_CONFLICT,
          detail: "同一 Idempotency-Key 不能确认不同员工",
          requestId: ctx.requestId,
        });
      }
      sendSuccess(
        res,
        200,
        {
          dispatchId: existing.dispatch_id,
          executionId: existing.id,
          status: existing.status,
          idempotentReplay: true,
        },
        ctx.requestId,
      );
      return;
    }
    const result = await tx.run((s) => {
      const d = required<Dict>(s, "dispatches", ctx.params.id, ctx.requestId);
      if (d.status !== "previewed")
        throw new NomosError({
          title: "派发状态不允许确认",
          status: 409,
          code: ErrorCodes.INVALID_STATE_TRANSITION,
          detail: `当前状态 ${d.status}`,
          requestId: ctx.requestId,
        });
      if (String(d.preview_expires_at) <= new Date().toISOString())
        throw new NomosError({
          title: "派发预览已过期",
          status: 409,
          code: ErrorCodes.PREVIEW_EXPIRED,
          detail: "请重新计算候选",
          requestId: ctx.requestId,
        });
      const score = s.get<Dict>(
        "SELECT * FROM candidate_scores WHERE dispatch_id=? AND employee_id=?",
        d.id,
        String(input.employeeId),
      );
      if (!score || !score.eligible)
        throw new NomosError({
          title: "候选已不再合格",
          status: 409,
          code: ErrorCodes.CANDIDATE_NO_LONGER_ELIGIBLE,
          detail: score
            ? parse<string[]>(score.ineligible_reasons, []).join("；")
            : "候选不在预览中",
          requestId: ctx.requestId,
        });
      const employee = required<Dict>(
          s,
          "employees",
          String(input.employeeId),
          ctx.requestId,
        ),
        work = required<Dict>(
          s,
          "work_items",
          String(d.work_item_id),
          ctx.requestId,
        );
      const fresh = candidate(s, employee, work);
      if (!fresh.eligible)
        throw new NomosError({
          title: "候选已不再合格",
          status: 409,
          code: ErrorCodes.CANDIDATE_NO_LONGER_ELIGIBLE,
          detail: fresh.ineligibleReasons.join("；"),
          requestId: ctx.requestId,
        });
      const now = new Date().toISOString(),
        executionId = randomUUID();
      s.run(
        "UPDATE dispatches SET employee_id=?,idempotency_key=?,status='running',capacity_leased=1,confirmed_at=?,updated_at=?,version=version+1 WHERE id=?",
        input.employeeId,
        key,
        now,
        now,
        d.id,
      );
      if (employee.connection_profile_id) {
        s.run(
          "UPDATE connection_profiles SET active_sessions=active_sessions+1,updated_at=?,version=version+1 WHERE id=?",
          now,
          employee.connection_profile_id,
        );
        s.run(
          "INSERT INTO capacity_leases(id,connection_profile_id,dispatch_id,leased_at,created_at) VALUES(?,?,?,?,?)",
          randomUUID(),
          employee.connection_profile_id,
          d.id,
          now,
          now,
        );
      }
      s.run(
        "INSERT INTO executions(id,dispatch_id,status,started_at,connector_ref,created_at) VALUES(?,?,'running',?,?,?)",
        executionId,
        d.id,
        now,
        `nomos-local:${executionId}`,
        now,
      );
      s.run(
        "UPDATE work_items SET assignee_employee_id=?,acting_position_id=?,status='running',updated_at=?,version=version+1 WHERE id=?",
        input.employeeId,
        d.acting_position_id,
        now,
        d.work_item_id,
      );
      audit(
        s,
        ctx.requestId,
        "dispatch.confirmed",
        "幂等确认派发并占用容量",
        "dispatch",
        String(d.id),
      );
      return {
        dispatchId: d.id,
        executionId,
        status: "running",
        idempotentReplay: false,
      };
    });
    sendSuccess(res, 200, result, ctx.requestId);
  };
  const list: NomosHandler = (_req, res, ctx) =>
    sendSuccess(
      res,
      200,
      db
        .all<Dict>(
          "SELECT d.*,e.id AS execution_id,e.status AS execution_status,w.title AS work_title,em.name AS employee_name FROM dispatches d LEFT JOIN executions e ON e.dispatch_id=d.id JOIN work_items w ON w.id=d.work_item_id JOIN employees em ON em.id=d.employee_id ORDER BY d.created_at DESC",
        )
        .map((d) => ({
          id: d.id,
          workItemId: d.work_item_id,
          workTitle: d.work_title,
          employeeId: d.employee_id,
          employeeName: d.employee_name,
          actingPositionId: d.acting_position_id,
          status: d.status,
          executionId: d.execution_id,
          executionStatus: d.execution_status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          version: d.version,
        })),
      ctx.requestId,
    );
  const addReceipt: NomosHandler = async (_req, res, ctx) => {
    const input = valid(receiptInput(ctx.body), ctx.requestId);
    const execution = required<Dict>(
        db,
        "executions",
        ctx.params.id,
        ctx.requestId,
      ),
      dispatch = required<Dict>(
        db,
        "dispatches",
        String(execution.dispatch_id),
        ctx.requestId,
      ),
      work = required<Dict>(
        db,
        "work_items",
        String(dispatch.work_item_id),
        ctx.requestId,
      );
    const id = await tx.run((s) => {
      const receiptId = randomUUID(),
        now = new Date().toISOString();
      s.run(
        "INSERT INTO receipts(id,execution_id,work_item_id,attempt,status,summary,deliverables,tests,risks,next_actions,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        receiptId,
        execution.id,
        work.id,
        work.attempt,
        input.status,
        input.summary,
        JSON.stringify(input.deliverables),
        JSON.stringify(input.tests),
        JSON.stringify(input.risks),
        JSON.stringify(input.nextActions),
        now,
      );
      for (const d of input.deliverables as Dict[]) {
        if (!d.type || !d.label || !d.uri)
          throw validationError("交付物字段不完整", ctx.requestId);
        s.run(
          "INSERT INTO deliverables(id,receipt_id,type,label,uri,created_at) VALUES(?,?,?,?,?,?)",
          randomUUID(),
          receiptId,
          d.type,
          d.label,
          d.uri,
          now,
        );
      }
      if (input.status !== "progress") {
        s.run(
          "UPDATE executions SET status=?,completed_at=? WHERE id=?",
          input.status === "completed" ? "completed" : input.status,
          now,
          execution.id,
        );
        s.run(
          "UPDATE dispatches SET status=?,capacity_leased=0,updated_at=?,version=version+1 WHERE id=?",
          input.status === "completed" ? "completed" : "failed",
          now,
          dispatch.id,
        );
        if (dispatch.capacity_leased) {
          s.run(
            "UPDATE capacity_leases SET released_at=? WHERE dispatch_id=? AND released_at IS NULL",
            now,
            dispatch.id,
          );
          const employee = required<Dict>(
            s,
            "employees",
            String(dispatch.employee_id),
            ctx.requestId,
          );
          if (employee.connection_profile_id)
            s.run(
              "UPDATE connection_profiles SET active_sessions=MAX(0,active_sessions-1),updated_at=?,version=version+1 WHERE id=?",
              now,
              employee.connection_profile_id,
            );
        }
        s.run(
          "UPDATE work_items SET status=?,updated_at=?,version=version+1 WHERE id=?",
          input.status === "completed" ? "review_pending" : "failed",
          now,
          work.id,
        );
      }
      audit(
        s,
        ctx.requestId,
        "receipt.created",
        `记录结构化回执 ${input.status}`,
        "receipt",
        receiptId,
      );
      return receiptId;
    });
    sendSuccess(
      res,
      201,
      mapReceipt(db, required(db, "receipts", id, ctx.requestId)),
      ctx.requestId,
    );
  };
  const receipts: NomosHandler = (_req, res, ctx) =>
    sendSuccess(
      res,
      200,
      db
        .all<Dict>(
          "SELECT * FROM receipts WHERE work_item_id=? ORDER BY created_at DESC",
          ctx.params.id,
        )
        .map((r) => mapReceipt(db, r)),
      ctx.requestId,
    );
  const accept: NomosHandler = async (_req, res, ctx) => {
    const input = valid(acceptanceInput(ctx.body), ctx.requestId),
      receipt = required<Dict>(db, "receipts", ctx.params.id, ctx.requestId),
      work = required<Dict>(
        db,
        "work_items",
        String(receipt.work_item_id),
        ctx.requestId,
      );
    if (work.status !== "review_pending")
      throw new NomosError({
        title: "工作项不在待验收状态",
        status: 409,
        code: ErrorCodes.INVALID_STATE_TRANSITION,
        detail: `当前状态 ${work.status}`,
        requestId: ctx.requestId,
      });
    const reviewer = required<Dict>(
      db,
      "employees",
      String(input.reviewerEmployeeId),
      ctx.requestId,
    );
    if (reviewer.status !== "schedulable")
      throw validationError("验收员工当前不可用", ctx.requestId);
    const id = await tx.run((s) => {
      const aid = randomUUID(),
        now = new Date().toISOString();
      s.run(
        "INSERT INTO acceptances(id,receipt_id,node_instance_id,reviewer_employee_id,result,against_criteria,comment,created_at) VALUES(?,?,?,?,?,?,?,?)",
        aid,
        receipt.id,
        work.node_instance_id,
        input.reviewerEmployeeId,
        input.result,
        JSON.stringify(input.againstCriteria),
        input.comment,
        now,
      );
      if (input.result === "accepted") {
        s.run(
          "UPDATE work_items SET status='done',updated_at=?,version=version+1 WHERE id=?",
          now,
          work.id,
        );
        if (work.node_instance_id)
          s.run(
            "UPDATE node_instances SET status='done',updated_at=? WHERE id=?",
            now,
            work.node_instance_id,
          );
        const dependents = s.all<{ work_item_id: string }>(
          "SELECT work_item_id FROM work_item_dependencies WHERE dependency_id=?",
          String(work.id),
        );
        for (const dep of dependents) {
          const pending = s.get<{ count: number }>(
            "SELECT COUNT(*) AS count FROM work_item_dependencies d JOIN work_items w ON w.id=d.dependency_id WHERE d.work_item_id=? AND w.status!='done'",
            dep.work_item_id,
          );
          if (Number(pending?.count || 0) === 0) {
            s.run(
              "UPDATE work_items SET status='pending_dispatch',updated_at=?,version=version+1 WHERE id=? AND status='draft'",
              now,
              dep.work_item_id,
            );
            const next = s.get<{ node_instance_id: string }>(
              "SELECT node_instance_id FROM work_items WHERE id=?",
              dep.work_item_id,
            );
            if (next?.node_instance_id)
              s.run(
                "UPDATE node_instances SET status='ready',updated_at=? WHERE id=? AND status='pending'",
                now,
                next.node_instance_id,
              );
          }
        }
      } else if (input.result === "rework")
        s.run(
          "UPDATE work_items SET status='pending_dispatch',attempt=attempt+1,assignee_employee_id=NULL,acting_position_id=NULL,updated_at=?,version=version+1 WHERE id=?",
          now,
          work.id,
        );
      else
        s.run(
          "UPDATE work_items SET status='blocked',updated_at=?,version=version+1 WHERE id=?",
          now,
          work.id,
        );
      audit(
        s,
        ctx.requestId,
        "acceptance.created",
        `人工验收结果 ${input.result}`,
        "acceptance",
        aid,
      );
      return aid;
    });
    sendSuccess(
      res,
      201,
      {
        id,
        receiptId: receipt.id,
        nodeInstanceId: work.node_instance_id,
        reviewerEmployeeId: input.reviewerEmployeeId,
        result: input.result,
        againstCriteria: input.againstCriteria,
        comment: input.comment,
        createdAt: new Date().toISOString(),
      },
      ctx.requestId,
    );
  };
  return { preview, confirm, list, addReceipt, receipts, accept };
}
