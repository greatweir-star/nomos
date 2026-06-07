const { randomUUID } = require("crypto");
const {
  sendJson, sendError, readJson,
  findSkill, findRole, findEmployee,
  DRAFT_STATUS_ORDER, validateDraftTransition,
  skillsReferencingRoles, rolesReferencingEmployees,
} = require("../utils");

module.exports = async function handleOrg(request, response, url, segments, store) {
  // GET /api/skills
  if (url.pathname === "/api/skills" && request.method === "GET") {
  const data = store.snapshot();
  let result = data.skills;
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  if (category) result = result.filter((s) => s.category === category);
  if (search) {
  const q = search.toLowerCase();
  result = result.filter((s) =>
  s.name.toLowerCase().includes(q) ||
  (s.tags || []).some((t) => t.toLowerCase().includes(q))
  );
  }
  sendJson(response, 200, { data: result });
  return;
  }

  // POST /api/skills
  if (url.pathname === "/api/skills" && request.method === "POST") {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) {
  sendError(response, 400, "Skill 名称不能为空");
  return;
  }
  const data = store.snapshot();
  if (data.skills.some((s) => s.name === name)) {
  sendError(response, 409, "同名 Skill 已存在");
  return;
  }
  const now = new Date().toISOString();
  const newSkill = {
  id: randomUUID(),
  name,
  description: String(body.description || "").trim(),
  category: body.category || "general",
  level: Number(body.level) || 1,
  source: body.source || "org_practice",
  tags: Array.isArray(body.tags) ? body.tags : [],
  applicableFlows: Array.isArray(body.applicableFlows) ? body.applicableFlows : [],
  riskBoundary: String(body.riskBoundary || "").trim(),
  evidence: Array.isArray(body.evidence) ? body.evidence : [],
  createdAt: now,
  updatedAt: now,
  };
  store.update((data) => {
  data.skills.push(newSkill);
  store.audit("skill.create", `创建 Skill：${newSkill.name}`, { skillId: newSkill.id });
  return newSkill;
  });
  sendJson(response, 201, { data: newSkill });
  return;
  }

  // GET /api/skills/:id
  if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "GET") {
  const skill = findSkill(store.snapshot(), segments[2]);
  if (!skill) {
  sendError(response, 404, "Skill 不存在");
  return;
  }
  sendJson(response, 200, { data: skill });
  return;
  }

  // PATCH /api/skills/:id
  if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "PATCH") {
  const body = await readJson(request);
  const skillId = segments[2];
  const updated = store.update((data) => {
  const skill = findSkill(data, skillId);
  if (!skill) return null;
  if (body.name !== undefined) {
  const newName = String(body.name).trim();
  if (newName && newName !== skill.name) {
  const referencingRoles = skillsReferencingRoles(data, skill.id);
  if (referencingRoles.length > 0) {
  return { _error: "Skill 被岗位引用，不可修改名称", _statusCode: 409 };
  }
  if (data.skills.some((s) => s.id !== skill.id && s.name === newName)) {
  return { _error: "Skill 名称已被其他 Skill 使用", _statusCode: 409 };
  }
  skill.name = newName;
  }
  }
  if (body.description !== undefined) skill.description = String(body.description).trim();
  if (body.category !== undefined) skill.category = body.category;
  if (body.level !== undefined) skill.level = Number(body.level) || skill.level;
  if (body.source !== undefined) skill.source = body.source;
  if (body.tags !== undefined) skill.tags = Array.isArray(body.tags) ? body.tags : skill.tags;
  if (body.applicableFlows !== undefined) skill.applicableFlows = Array.isArray(body.applicableFlows) ? body.applicableFlows : skill.applicableFlows;
  if (body.riskBoundary !== undefined) skill.riskBoundary = String(body.riskBoundary).trim();
  if (body.evidence !== undefined) skill.evidence = Array.isArray(body.evidence) ? body.evidence : skill.evidence;
  skill.updatedAt = new Date().toISOString();
  store.audit("skill.update", `更新 Skill：${skill.name}`, { skillId: skill.id });
  return skill;
  });
  if (!updated) {
  sendError(response, 404, "Skill 不存在");
  return;
  }
  if (updated._error) {
  sendError(response, updated._statusCode || 409, updated._error);
  return;
  }
  sendJson(response, 200, { data: updated });
  return;
  }

  // DELETE /api/skills/:id
  if (segments[1] === "skills" && segments[2] && !segments[3] && request.method === "DELETE") {
  const skillId = segments[2];
  const data = store.snapshot();
  const skill = findSkill(data, skillId);
  if (!skill) {
  sendError(response, 404, "Skill 不存在");
  return;
  }
  const referencingRoles = skillsReferencingRoles(data, skillId);
  if (referencingRoles.length > 0) {
  sendJson(response, 409, { error: "Skill 被以下岗位引用", referencingRoles });
  return;
  }
  store.update((data) => {
  const index = data.skills.findIndex((s) => s.id === skillId);
  if (index !== -1) data.skills.splice(index, 1);
  store.audit("skill.delete", `删除 Skill：${skill.name}`, { skillId });
  return { deleted: true };
  });
  sendJson(response, 200, { data: { deleted: true } });
  return;
  }

  // GET /api/roles
  if (url.pathname === "/api/roles" && request.method === "GET") {
  const data = store.snapshot();
  let result = data.roles;
  const family = url.searchParams.get("family");
  const type = url.searchParams.get("type");
  if (family) result = result.filter((r) => r.family === family);
  if (type) result = result.filter((r) => r.type === type);
  sendJson(response, 200, { data: result });
  return;
  }

  // POST /api/roles
  if (url.pathname === "/api/roles" && request.method === "POST") {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) {
  sendError(response, 400, "岗位名称不能为空");
  return;
  }
  const data = store.snapshot();
  if (data.roles.some((r) => r.name === name)) {
  sendError(response, 409, "同名岗位已存在");
  return;
  }
  const validSkillIds = Array.isArray(body.skillIds)
  ? body.skillIds.filter((id) => data.skills.some((s) => s.id === id))
  : [];
  const now = new Date().toISOString();
  const newRole = {
  id: randomUUID(),
  name,
  description: String(body.description || "").trim(),
  family: String(body.family || "").trim(),
  type: body.type || "hybrid",
  isDefault: false,
  responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : [],
  skillIds: validSkillIds,
  skillLevelOverrides: body.skillLevelOverrides && typeof body.skillLevelOverrides === "object" ? body.skillLevelOverrides : {},
  permissions: body.permissions && typeof body.permissions === "object" ? body.permissions : {},
  acceptanceCriteria: String(body.acceptanceCriteria || "").trim(),
  flowNotes: String(body.flowNotes || "").trim(),
  flowMatrix: [],
  carbonSiliconRatio: body.carbonSiliconRatio && typeof body.carbonSiliconRatio === "object"
  ? body.carbonSiliconRatio
  : { carbon: 0, silicon: 0, hybrid: 0 },
  createdAt: now,
  updatedAt: now,
  };
  store.update((data) => {
  data.roles.push(newRole);
  store.audit("role.create", `创建岗位：${newRole.name}`, { roleId: newRole.id });
  return newRole;
  });
  sendJson(response, 201, { data: newRole });
  return;
  }

  // GET /api/roles/:id
  if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "GET") {
  const role = findRole(store.snapshot(), segments[2]);
  if (!role) {
  sendError(response, 404, "岗位不存在");
  return;
  }
  sendJson(response, 200, { data: role });
  return;
  }

  // PATCH /api/roles/:id
  if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "PATCH") {
  const body = await readJson(request);
  const roleId = segments[2];
  const updated = store.update((data) => {
  const role = findRole(data, roleId);
  if (!role) return null;
  if (body.name !== undefined) {
  const newName = String(body.name).trim();
  if (newName && newName !== role.name) {
  const referencingEmployees = rolesReferencingEmployees(data, roleId);
  if (referencingEmployees.length > 0) {
  return { _error: "岗位被员工绑定，不可修改名称", _statusCode: 409 };
  }
  if (data.roles.some((r) => r.id !== roleId && r.name === newName)) {
  return { _error: "岗位名称已被其他岗位使用", _statusCode: 409 };
  }
  role.name = newName;
  }
  }
  if (body.description !== undefined) role.description = String(body.description).trim();
  if (body.family !== undefined) role.family = String(body.family).trim();
  if (body.type !== undefined) role.type = body.type;
  if (body.responsibilities !== undefined) role.responsibilities = Array.isArray(body.responsibilities) ? body.responsibilities : role.responsibilities;
  if (body.skillIds !== undefined) {
  const validSkillIds = Array.isArray(body.skillIds)
  ? body.skillIds.filter((id) => data.skills.some((s) => s.id === id))
  : role.skillIds;
  const oldSkillIds = new Set(role.skillIds || []);
  const hasNewSkills = validSkillIds.some((id) => !oldSkillIds.has(id));
  role.skillIds = validSkillIds;
  if (hasNewSkills) {
  for (const emp of data.employees) {
  if ((emp.roleIds || []).includes(roleId) &&
  (emp.type === "silicon" || emp.type === "hybrid") &&
  emp.digitalEmployeeDraft) {
  emp.digitalEmployeeDraft.needsRematch = true;
  emp.updatedAt = new Date().toISOString();
  }
  }
  }
  }
  if (body.skillLevelOverrides !== undefined) role.skillLevelOverrides = typeof body.skillLevelOverrides === "object" ? body.skillLevelOverrides : role.skillLevelOverrides;
  if (body.permissions !== undefined) role.permissions = typeof body.permissions === "object" ? body.permissions : role.permissions;
  if (body.acceptanceCriteria !== undefined) role.acceptanceCriteria = String(body.acceptanceCriteria).trim();
  if (body.flowNotes !== undefined) role.flowNotes = String(body.flowNotes).trim();
  if (body.carbonSiliconRatio !== undefined) role.carbonSiliconRatio = typeof body.carbonSiliconRatio === "object" ? body.carbonSiliconRatio : role.carbonSiliconRatio;
  role.updatedAt = new Date().toISOString();
  store.audit("role.update", `更新岗位：${role.name}`, { roleId: role.id });
  return role;
  });
  if (!updated) {
  sendError(response, 404, "岗位不存在");
  return;
  }
  if (updated._error) {
  sendError(response, updated._statusCode || 409, updated._error);
  return;
  }
  sendJson(response, 200, { data: updated });
  return;
  }

  // DELETE /api/roles/:id
  if (segments[1] === "roles" && segments[2] && !segments[3] && request.method === "DELETE") {
  const roleId = segments[2];
  const data = store.snapshot();
  const role = findRole(data, roleId);
  if (!role) {
  sendError(response, 404, "岗位不存在");
  return;
  }
  if (role.isDefault) {
  sendError(response, 403, "系统预设岗位不可删除，仅可隐藏");
  return;
  }
  const referencingEmployees = rolesReferencingEmployees(data, roleId);
  if (referencingEmployees.length > 0) {
  sendJson(response, 409, { error: "岗位被以下员工绑定", referencingEmployees });
  return;
  }
  store.update((data) => {
  const index = data.roles.findIndex((r) => r.id === roleId);
  if (index !== -1) data.roles.splice(index, 1);
  store.audit("role.delete", `删除岗位：${role.name}`, { roleId });
  return { deleted: true };
  });
  sendJson(response, 200, { data: { deleted: true } });
  return;
  }

  // GET /api/employees
  if (url.pathname === "/api/employees" && request.method === "GET") {
  const data = store.snapshot();
  const statusParam = url.searchParams.get("status");
  const typeParam = url.searchParams.get("type");
  let employees = statusParam
  ? data.employees.filter((e) => e.status === statusParam)
  : data.employees.filter((e) => e.status !== "inactive");
  if (typeParam) employees = employees.filter((e) => e.type === typeParam);
  sendJson(response, 200, { data: employees });
  return;
  }

  // POST /api/employees
  if (url.pathname === "/api/employees" && request.method === "POST") {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) {
  sendError(response, 400, "员工姓名不能为空");
  return;
  }
  const empType = body.type || "carbon";
  const data = store.snapshot();
  if (empType === "silicon" || empType === "hybrid") {
  if (!body.agentId) {
  sendError(response, 400, "硅基员工必须关联已有 Agent");
  return;
  }
  if (!data.agents.some((a) => a.id === body.agentId)) {
  sendError(response, 400, "硅基员工必须关联已有 Agent");
  return;
  }
  }
  if (empType === "carbon" && body.agentId) {
  sendError(response, 400, "碳基员工不能关联 Agent");
  return;
  }
  if (body.adapterId) {
  if (!Object.prototype.hasOwnProperty.call(data.agentAdapters, body.adapterId)) {
  sendError(response, 400, "指定的适配器不存在");
  return;
  }
  }
  const validRoleIds = Array.isArray(body.roleIds)
  ? body.roleIds.filter((id) => data.roles.some((r) => r.id === id))
  : [];
  const now = new Date().toISOString();
  const newEmployee = {
  id: randomUUID(),
  name,
  type: empType,
  roleIds: validRoleIds,
  status: "active",
  agentId: (empType === "silicon" || empType === "hybrid") ? (body.agentId || null) : null,
  adapterId: (empType === "silicon" || empType === "hybrid") ? (body.adapterId || null) : null,
  digitalEmployeeDraft: (empType === "silicon" || empType === "hybrid")
  ? { status: "empty", targetRoleId: null, skillMatching: null, onboarding: null, mentorship: null }
  : null,
  createdAt: now,
  updatedAt: now,
  };
  store.update((data) => {
  data.employees.push(newEmployee);
  store.audit("employee.create", `创建员工：${newEmployee.name}`, { employeeId: newEmployee.id, type: empType });
  return newEmployee;
  });
  sendJson(response, 201, { data: newEmployee });
  return;
  }

  // GET /api/employees/:id
  if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "GET") {
  const employee = findEmployee(store.snapshot(), segments[2]);
  if (!employee) {
  sendError(response, 404, "员工不存在");
  return;
  }
  sendJson(response, 200, { data: employee });
  return;
  }

  // PATCH /api/employees/:id
  if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "PATCH") {
  const body = await readJson(request);
  const employeeId = segments[2];
  const updated = store.update((data) => {
  const employee = findEmployee(data, employeeId);
  if (!employee) return null;
  if (body.name !== undefined) employee.name = String(body.name).trim();
  if (body.roleIds !== undefined) {
  employee.roleIds = Array.isArray(body.roleIds)
  ? body.roleIds.filter((id) => data.roles.some((r) => r.id === id))
  : employee.roleIds;
  }
  if (body.status !== undefined) employee.status = body.status;
  if (body.digitalEmployeeDraft !== undefined && employee.digitalEmployeeDraft) {
  const newDraft = body.digitalEmployeeDraft;
  if (newDraft.status && newDraft.status !== employee.digitalEmployeeDraft.status) {
  const transitionError = validateDraftTransition(employee.digitalEmployeeDraft.status, newDraft.status);
  if (transitionError) {
  return { _error: transitionError, _statusCode: 400 };
  }
  }
  if (newDraft.status !== undefined) employee.digitalEmployeeDraft.status = newDraft.status;
  if (newDraft.targetRoleId !== undefined) employee.digitalEmployeeDraft.targetRoleId = newDraft.targetRoleId;
  if (newDraft.skillMatching !== undefined) employee.digitalEmployeeDraft.skillMatching = newDraft.skillMatching;
  if (newDraft.onboarding !== undefined) employee.digitalEmployeeDraft.onboarding = newDraft.onboarding;
  if (newDraft.mentorship !== undefined) employee.digitalEmployeeDraft.mentorship = newDraft.mentorship;
  if (newDraft.needsRematch !== undefined) employee.digitalEmployeeDraft.needsRematch = newDraft.needsRematch;
  }
  employee.updatedAt = new Date().toISOString();
  store.audit("employee.update", `更新员工：${employee.name}`, { employeeId: employee.id });
  return employee;
  });
  if (!updated) {
  sendError(response, 404, "员工不存在");
  return;
  }
  if (updated._error) {
  sendError(response, updated._statusCode || 400, updated._error);
  return;
  }
  sendJson(response, 200, { data: updated });
  return;
  }

  // DELETE /api/employees/:id
  if (segments[1] === "employees" && segments[2] && !segments[3] && request.method === "DELETE") {
  const employeeId = segments[2];
  const result = store.update((data) => {
  const employee = findEmployee(data, employeeId);
  if (!employee) return null;
  employee.status = "inactive";
  employee.updatedAt = new Date().toISOString();
  store.audit("employee.delete", `软删除员工：${employee.name}`, { employeeId: employee.id });
  return { deleted: true };
  });
  if (!result) {
  sendError(response, 404, "员工不存在");
  return;
  }
  sendJson(response, 200, { data: { deleted: true } });
  return;
  }

  // GET /api/adapters
  if (url.pathname === "/api/adapters" && request.method === "GET") {
  const data = store.snapshot();
  const localTools = await executionManager.listTools();
  const technicalAdapters = createAdapterDirectory({
  localTools,
  adapterConfigs: data.agentAdapters,
  });
  sendJson(response, 200, { data: technicalAdapters });
  return;
  }

  // GET /api/org/health
  if (url.pathname === "/api/org/health" && request.method === "GET") {
  const data = store.snapshot();
  const activeEmployees = data.employees.filter((e) => e.status !== "inactive");
  const carbonCount = activeEmployees.filter((e) => e.type === "carbon").length;
  const siliconCount = activeEmployees.filter((e) => e.type === "silicon").length;
  const hybridCount = activeEmployees.filter((e) => e.type === "hybrid").length;
  const totalEmployees = carbonCount + siliconCount + hybridCount;
  const siliconEmployees = activeEmployees.filter((e) => e.type === "silicon" || e.type === "hybrid");
  const siliconWithAgent = siliconEmployees.filter((e) => e.agentId).length;
  const agentCoverageRate = siliconEmployees.length > 0 ? siliconWithAgent / siliconEmployees.length : 0;
  const familyNames = ROLE_FAMILY_DEFAULTS.map((f) => f.family);
  const existingFamilies = new Set(data.roles.map((r) => r.family));
  const emptyFamilies = familyNames.filter((f) => !existingFamilies.has(f));
  const activeEmployeeRoleIds = new Set(activeEmployees.flatMap((e) => e.roleIds || []));
  const rolesWithoutEmployees = data.roles
  .filter((r) => !activeEmployeeRoleIds.has(r.id))
  .map((r) => ({ id: r.id, name: r.name }));
  const rolesWithoutSkills = data.roles
  .filter((r) => !r.skillIds || r.skillIds.length === 0)
  .map((r) => ({ id: r.id, name: r.name }));
  const draftEmployees = activeEmployees
  .filter((e) => e.digitalEmployeeDraft &&
  e.digitalEmployeeDraft.status !== "empty" &&
  e.digitalEmployeeDraft.status !== "draft_complete")
  .map((e) => ({ id: e.id, name: e.name, draftStatus: e.digitalEmployeeDraft.status }));
  sendJson(response, 200, {
  skillCount: data.skills.length,
  roleCount: data.roles.length,
  employeeCount: { carbon: carbonCount, silicon: siliconCount, hybrid: hybridCount, total: totalEmployees },
  agentCoverageRate,
  emptyFamilies,
  rolesWithoutEmployees,
  rolesWithoutSkills,
  draftEmployees,
  });
  return;
  }

  // POST /api/org/init-defaults
  if (url.pathname === "/api/org/init-defaults" && request.method === "POST") {
  const data = store.snapshot();
  if (data.roles.some((r) => r.isDefault)) {
  sendError(response, 409, "默认模板已初始化");
  return;
  }
  const orgResult = createDefaultOrgData(data.skills, data.roles);
  const skillsCreated = orgResult.skills.length - data.skills.length;
  const rolesCreated = orgResult.roles.length - data.roles.length;
  const flowTemplates = createDefaultFlowTemplates(orgResult.roles);
  store.update((data) => {
  data.skills = orgResult.skills;
  data.roles = orgResult.roles;
  data.flowTemplates = data.flowTemplates.concat(flowTemplates);
  store.audit("org.init-defaults", `初始化默认模板：新增 ${skillsCreated} 个 Skill、${rolesCreated} 个岗位、${flowTemplates.length} 个流程模板`, {
  skillsCreated,
  rolesCreated,
  flowTemplatesCreated: flowTemplates.length,
  });
  return { skillsCreated, rolesCreated, flowTemplatesCreated: flowTemplates.length };
  });
  sendJson(response, 201, { data: { skillsCreated, rolesCreated, flowTemplatesCreated: flowTemplates.length } });
  return;
  }

  // ─── End Organization Management API ───────────────────────────
  return false;
};
