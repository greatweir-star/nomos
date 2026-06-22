import { createHash, randomUUID } from "node:crypto";
import type { DbConnection, DbSession } from "../../infrastructure/database/connection";
import { ErrorCodes, NomosError, invalidStateTransition, notFound, validationError, versionConflict } from "../../domain/shared/errors";

const json = <T>(value: unknown, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};

function referenceConflict(detail: string, requestId: string): never {
  throw new NomosError({ title: "资源仍被引用", status: 409, code: ErrorCodes.REFERENCE_CONFLICT, detail, requestId });
}

export function mapSkill(db: DbConnection | DbSession, row: Record<string, unknown>) {
  const ref = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM position_skills WHERE skill_id = ?", String(row.id));
  return { id: row.id, name: row.name, category: row.category, level: row.level, source: row.source,
    status: row.status, referenceCount: Number(ref?.count || 0), createdAt: row.created_at, updatedAt: row.updated_at, version: row.version };
}

export function mapPosition(db: DbConnection | DbSession, row: Record<string, unknown>) {
  const skills = db.all<{ skill_id: string }>("SELECT skill_id FROM position_skills WHERE position_id = ? ORDER BY skill_id", String(row.id));
  const employees = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM employees WHERE primary_position_id = ?", String(row.id));
  const flowNodes = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM position_slots WHERE required_position_id = ?", String(row.id));
  return { id: row.id, name: row.name, family: row.family,
    responsibilities: json<string[]>(row.responsibilities, []), acceptanceCriteria: json<string[]>(row.acceptance_criteria, []),
    skillIds: skills.map((s) => s.skill_id), managementPermission: json(row.management_permission, {
      dataScopes: [], visibility: [], actions: [], responsibilityBoundary: "", approvalPolicy: "none",
    }), status: row.status, referenceSummary: { employees: Number(employees?.count || 0), flowNodes: Number(flowNodes?.count || 0) },
    createdAt: row.created_at, updatedAt: row.updated_at, version: row.version };
}

export function mapEmployee(db: DbConnection | DbSession, row: Record<string, unknown>) {
  const binding = db.get<Record<string, unknown>>("SELECT * FROM runtime_bindings WHERE employee_id = ?", String(row.id));
  const additional = db.all<{ position_id: string }>("SELECT position_id FROM employee_positions WHERE employee_id = ? ORDER BY position_id", String(row.id));
  const checks = db.all<Record<string, unknown>>("SELECT key, status, message FROM onboarding_checks WHERE employee_id = ? ORDER BY key", String(row.id));
  const profile = row.connection_profile_id ? db.get<Record<string, unknown>>("SELECT concurrency_capacity, active_sessions FROM connection_profiles WHERE id = ?", String(row.connection_profile_id)) : undefined;
  const active = Number(profile?.active_sessions || 0); const capacity = Number(profile?.concurrency_capacity || (row.type === "carbon" ? 1 : 0));
  return { id: row.id, employeeNo: row.employee_no, name: row.name, type: row.type,
    primaryPositionId: row.primary_position_id, additionalPositionIds: additional.map((p) => p.position_id),
    connectionProfileId: row.connection_profile_id, runtimeBinding: binding ? {
      sessionKeyMasked: binding.session_key_masked, isolationLevel: binding.isolation_level, promptSnapshotId: binding.prompt_snapshot_id,
    } : null, status: row.status, schedulable: Boolean(row.schedulable),
    workload: { active, capacity, utilization: capacity > 0 ? active / capacity : null },
    onboardingChecks: checks, createdAt: row.created_at, updatedAt: row.updated_at, version: row.version };
}

function requireRow(db: DbConnection | DbSession, table: string, id: string, requestId: string) {
  const row = db.get<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, id);
  if (!row) throw notFound(`${table}/${id}`, requestId);
  return row;
}

export function createSkill(session: DbSession, input: { name: string; category: string; level: number; source: string }, requestId: string) {
  const duplicate = session.get("SELECT id FROM skills WHERE lower(name) = lower(?) AND status != 'inactive'", input.name);
  if (duplicate) throw validationError("同名 Skill 已存在", requestId);
  const id = randomUUID(); const now = new Date().toISOString();
  session.run("INSERT INTO skills(id,name,category,level,source,status,created_at,updated_at,version) VALUES(?,?,?,?,?,'active',?,?,1)",
    id, input.name, input.category, input.level, input.source, now, now);
  return id;
}

export function updateSkill(session: DbSession, id: string, input: { name?: string; category?: string; level?: number; status?: string; version: number }, requestId: string) {
  const current = requireRow(session, "skills", id, requestId);
  if (input.status === "inactive") {
    const ref = session.get<{ count: number }>("SELECT COUNT(*) AS count FROM position_skills WHERE skill_id = ?", id);
    if (Number(ref?.count || 0) > 0) referenceConflict(`Skill 被 ${ref?.count} 个岗位引用，请先解除引用`, requestId);
  }
  const result = session.run("UPDATE skills SET name=?,category=?,level=?,status=?,updated_at=?,version=version+1 WHERE id=? AND version=?",
    input.name ?? current.name, input.category ?? current.category, input.level ?? current.level, input.status ?? current.status,
    new Date().toISOString(), id, input.version);
  if (Number(result.changes) !== 1) throw versionConflict(requestId);
}

export function createPosition(session: DbSession, input: { name: string; family: string; responsibilities: string[]; acceptanceCriteria: string[]; skillIds: string[]; managementPermission: Record<string, unknown> }, requestId: string) {
  if (input.responsibilities.length === 0 || input.acceptanceCriteria.length === 0) throw validationError("岗位至少需要一项职责和验收标准", requestId);
  for (const skillId of input.skillIds) {
    const skill = requireRow(session, "skills", skillId, requestId);
    if (skill.status !== "active") throw validationError("岗位只能引用启用中的 Skill", requestId);
  }
  const id = randomUUID(); const now = new Date().toISOString();
  session.run("INSERT INTO positions(id,name,family,responsibilities,acceptance_criteria,management_permission,status,created_at,updated_at,version) VALUES(?,?,?,?,?,?,'active',?,?,1)",
    id, input.name, input.family, JSON.stringify(input.responsibilities), JSON.stringify(input.acceptanceCriteria), JSON.stringify(input.managementPermission), now, now);
  for (const skillId of input.skillIds) session.run("INSERT INTO position_skills(position_id,skill_id) VALUES(?,?)", id, skillId);
  return id;
}

export function updatePosition(session: DbSession, id: string, input: { name?: string; family?: string; responsibilities?: string[]; acceptanceCriteria?: string[]; skillIds?: string[]; managementPermission?: Record<string, unknown>; status?: string; version: number }, requestId: string) {
  const current = requireRow(session, "positions", id, requestId);
  if (input.status === "inactive") {
    const employees = session.get<{ count: number }>("SELECT COUNT(*) AS count FROM employees WHERE primary_position_id = ? AND status != 'offboarded'", id);
    const slots = session.get<{ count: number }>("SELECT COUNT(*) AS count FROM position_slots WHERE required_position_id = ?", id);
    if (Number(employees?.count || 0) + Number(slots?.count || 0) > 0) referenceConflict("岗位仍被员工或流程节点引用", requestId);
  }
  if (input.skillIds) for (const skillId of input.skillIds) requireRow(session, "skills", skillId, requestId);
  const result = session.run("UPDATE positions SET name=?,family=?,responsibilities=?,acceptance_criteria=?,management_permission=?,status=?,updated_at=?,version=version+1 WHERE id=? AND version=?",
    input.name ?? current.name, input.family ?? current.family, JSON.stringify(input.responsibilities ?? json(current.responsibilities, [])),
    JSON.stringify(input.acceptanceCriteria ?? json(current.acceptance_criteria, [])), JSON.stringify(input.managementPermission ?? json(current.management_permission, {})),
    input.status ?? current.status, new Date().toISOString(), id, input.version);
  if (Number(result.changes) !== 1) throw versionConflict(requestId);
  if (input.skillIds) { session.run("DELETE FROM position_skills WHERE position_id = ?", id); for (const skillId of input.skillIds) session.run("INSERT INTO position_skills(position_id,skill_id) VALUES(?,?)", id, skillId); }
}

export function createEmployee(session: DbSession, input: { name: string; type: string; primaryPositionId?: string; additionalPositionIds: string[]; connectionProfileId?: string }, requestId: string) {
  if (input.type === "silicon" && (!input.primaryPositionId || !input.connectionProfileId)) throw validationError("硅基员工必须选择主岗位和技术连接", requestId);
  if (input.type !== "carbon" && input.additionalPositionIds.length > 0) throw validationError("V0.0.3 仅碳基员工可身兼多岗", requestId);
  if (input.primaryPositionId) { const p = requireRow(session, "positions", input.primaryPositionId, requestId); if (p.status !== "active") throw validationError("主岗位未启用", requestId); }
  if (input.connectionProfileId) { const p = requireRow(session, "connection_profiles", input.connectionProfileId, requestId); if (p.status !== "connected" || !p.manageable) throw new NomosError({ title: "连接不可管理", status: 409, code: ErrorCodes.CONNECTION_UNMANAGEABLE, detail: "请选择已连接且可管理的技术连接", requestId }); }
  for (const positionId of input.additionalPositionIds) requireRow(session, "positions", positionId, requestId);
  const id = randomUUID(); const now = new Date().toISOString(); const no = `NM-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
  session.run("INSERT INTO employees(id,employee_no,name,type,primary_position_id,connection_profile_id,status,schedulable,created_at,updated_at,version) VALUES(?,?,?,?,?,?,'draft',0,?,?,1)",
    id, no, input.name, input.type, input.primaryPositionId ?? null, input.connectionProfileId ?? null, now, now);
  for (const positionId of input.additionalPositionIds) session.run("INSERT INTO employee_positions(employee_id,position_id) VALUES(?,?)", id, positionId);
  return id;
}

export function materializeEmployee(session: DbSession, id: string, requestId: string) {
  const employee = requireRow(session, "employees", id, requestId);
  if (employee.type !== "silicon") throw invalidStateTransition(String(employee.status), "onboarding", requestId);
  if (employee.status !== "draft") throw invalidStateTransition(String(employee.status), "onboarding", requestId);
  const position = requireRow(session, "positions", String(employee.primary_position_id), requestId);
  const profile = requireRow(session, "connection_profiles", String(employee.connection_profile_id), requestId);
  if (profile.status !== "connected" || !profile.manageable) throw new NomosError({ title: "连接不可管理", status: 409, code: ErrorCodes.CONNECTION_UNMANAGEABLE, detail: "连接未通过检查", requestId });
  const skillNames = session.all<{ name: string }>("SELECT s.name FROM skills s JOIN position_skills ps ON ps.skill_id=s.id WHERE ps.position_id=? ORDER BY s.name", String(position.id)).map((s) => s.name);
  const content = [`你是 Nomos 中的${position.name}。`, `职责：${json<string[]>(position.responsibilities, []).join("；")}`, `技能：${skillNames.join("、")}`, `验收：${json<string[]>(position.acceptance_criteria, []).join("；")}`].join("\n");
  const promptId = randomUUID(); const sessionKey = `nomos:${id}:${randomUUID()}`; const masked = `session_••••${sessionKey.slice(-6)}`; const now = new Date().toISOString();
  session.run("INSERT INTO prompt_snapshots(id,employee_id,position_id,content,content_hash,created_at) VALUES(?,?,?,?,?,?)", promptId, id, String(position.id), content, createHash("sha256").update(content).digest("hex"), now);
  session.run("INSERT INTO runtime_bindings(id,employee_id,session_key_masked,isolation_level,prompt_snapshot_id,created_at,updated_at) VALUES(?,?,?,'session',?,?,?)", randomUUID(), id, masked, promptId, now, now);
  // 原始 sessionKey 仅在物化瞬间存在于内存；SQLite 与备份只保存脱敏引用。
  session.run("UPDATE employees SET session_key=NULL,prompt_snapshot_id=?,status='onboarding',updated_at=?,version=version+1 WHERE id=?", promptId, now, id);
}

export function onboardingCheck(session: DbSession, id: string, requestId: string) {
  const employee = requireRow(session, "employees", id, requestId);
  if (employee.status !== "onboarding") throw invalidStateTransition(String(employee.status), "schedulable", requestId);
  const profile = requireRow(session, "connection_profiles", String(employee.connection_profile_id), requestId);
  const binding = session.get("SELECT id FROM runtime_bindings WHERE employee_id = ?", id);
  const checks = [
    { key: "connection", passed: profile.status === "connected" && Boolean(profile.manageable), message: profile.status === "connected" && Boolean(profile.manageable) ? "技术连接可管理" : "技术连接不可用" },
    { key: "runtime_binding", passed: Boolean(binding), message: binding ? "独立会话已物化" : "缺少独立会话" },
    { key: "position_snapshot", passed: Boolean(employee.prompt_snapshot_id), message: employee.prompt_snapshot_id ? "岗位提示词快照完整" : "缺少岗位提示词快照" },
  ];
  const now = new Date().toISOString();
  for (const check of checks) session.run("INSERT INTO onboarding_checks(employee_id,key,status,message,checked_at) VALUES(?,?,?,?,?) ON CONFLICT(employee_id,key) DO UPDATE SET status=excluded.status,message=excluded.message,checked_at=excluded.checked_at", id, check.key, check.passed ? "passed" : "failed", check.message, now);
  const passed = checks.every((c) => c.passed);
  session.run("UPDATE employees SET status=?,schedulable=?,updated_at=?,version=version+1 WHERE id=?", passed ? "schedulable" : "onboarding", passed ? 1 : 0, now, id);
  return passed;
}

export function transitionEmployee(session: DbSession, id: string, action: "suspend" | "resume" | "offboard", expectedVersion: number, requestId: string) {
  const current = requireRow(session, "employees", id, requestId); const from = String(current.status);
  const allowed = action === "suspend" ? ["schedulable", "unavailable"] : action === "resume" ? ["suspended"] : ["draft", "onboarding", "schedulable", "unavailable", "suspended", "on_leave"];
  if (!allowed.includes(from)) throw invalidStateTransition(from, action, requestId);
  const to = action === "suspend" ? "suspended" : action === "resume" ? "schedulable" : "offboarded";
  const result = session.run("UPDATE employees SET status=?,schedulable=?,updated_at=?,version=version+1 WHERE id=? AND version=?", to, to === "schedulable" ? 1 : 0, new Date().toISOString(), id, expectedVersion);
  if (Number(result.changes) !== 1) throw versionConflict(requestId);
}
