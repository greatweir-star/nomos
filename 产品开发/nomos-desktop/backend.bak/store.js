"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createDefaultData } = require("./default-data");
const { mergeDefaultAgents, normalizeAdapterConfigs } = require("./agent-registry");
const { ensureProjectWorkflow } = require("./workflow");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateData(data) {
  data.version = Math.max(Number(data.version || 1), 8);
  data.projects = Array.isArray(data.projects) ? data.projects : [];
  data.agents = Array.isArray(data.agents) ? data.agents : [];
  data.audit = Array.isArray(data.audit) ? data.audit : [];
  data.executions = Array.isArray(data.executions) ? data.executions : [];
  data.skills = Array.isArray(data.skills) ? data.skills : [];
  data.roles = Array.isArray(data.roles) ? data.roles : [];
  data.employees = Array.isArray(data.employees) ? data.employees : [];
  data.flowTemplates = Array.isArray(data.flowTemplates) ? data.flowTemplates : [];
  data.flowInstances = Array.isArray(data.flowInstances) ? data.flowInstances : [];
  data.bridge = data.bridge || {
    id: "desktop-bridge",
    status: "offline",
    command: "nomos bridge pair --workspace local",
  };
  data.bridge.allowedWorkspaces = Array.isArray(data.bridge.allowedWorkspaces)
    ? data.bridge.allowedWorkspaces
    : [];
  data.bridge.adapterCommands = data.bridge.adapterCommands && typeof data.bridge.adapterCommands === "object"
    ? data.bridge.adapterCommands
    : {};
  data.agentAdapters = normalizeAdapterConfigs(data.agentAdapters);
  data.agents = mergeDefaultAgents(data.agents);
  for (const project of data.projects) ensureProjectWorkflow(project);
  return data;
}

function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup content is not a valid data object.");
  if (!Array.isArray(data.projects)) throw new Error("Backup projects are invalid.");
  if (!Array.isArray(data.agents)) throw new Error("Backup agents are invalid.");
  if (!Array.isArray(data.skills)) throw new Error("Backup skills are invalid.");
  if (!Array.isArray(data.roles)) throw new Error("Backup roles are invalid.");
  if (!Array.isArray(data.employees)) throw new Error("Backup employees are invalid.");
  if (!Array.isArray(data.flowTemplates)) throw new Error("Backup flow templates are invalid.");
  if (!Array.isArray(data.flowInstances)) throw new Error("Backup flow instances are invalid.");
  if (data.projects.some((project) => !project || typeof project.id !== "string" || typeof project.title !== "string")) {
    throw new Error("Backup contains an invalid project.");
  }
  return data;
}

function validateBackupShapeForMigration(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Backup content is not a valid data object.");
  const requiredArrays = {
    projects: "Backup projects are invalid.",
    agents: "Backup agents are invalid.",
    skills: "Backup skills are invalid.",
    roles: "Backup roles are invalid.",
    employees: "Backup employees are invalid.",
  };
  for (const [field, message] of Object.entries(requiredArrays)) {
    if (!Array.isArray(data[field])) throw new Error(message);
  }
  const optionalArrays = {
    audit: "Backup audit entries are invalid.",
    executions: "Backup executions are invalid.",
    flowTemplates: "Backup flow templates are invalid.",
    flowInstances: "Backup flow instances are invalid.",
  };
  for (const [field, message] of Object.entries(optionalArrays)) {
    if (data[field] !== undefined && !Array.isArray(data[field])) throw new Error(message);
  }
  return data;
}

function readBackupData(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateBackupShapeForMigration(data);
  return validateData(migrateData(data));
}

class JsonStore {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, "nomos-data.json");
    this.data = null;
  }

  load() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.data = createDefaultData();
      this.save();
      return this.snapshot();
    }

    try {
      this.data = migrateData(JSON.parse(fs.readFileSync(this.filePath, "utf8")));
    } catch (error) {
      const backupPath = `${this.filePath}.invalid-${Date.now()}`;
      fs.copyFileSync(this.filePath, backupPath);
      this.data = createDefaultData();
      this.audit("system.recover", `数据文件损坏，已备份为 ${path.basename(backupPath)}`);
      this.save();
    }
    return this.snapshot();
  }

  ensureLoaded() {
    if (!this.data) this.load();
  }

  snapshot() {
    this.ensureLoaded();
    return clone(this.data);
  }

  save() {
    this.ensureLoaded();
    this.data.updatedAt = new Date().toISOString();
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(this.data, null, 2)}\n`, "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  update(mutator) {
    this.ensureLoaded();
    const result = mutator(this.data);
    this.save();
    return clone(result);
  }

  audit(action, summary, metadata = {}) {
    this.ensureLoaded();
    const entry = {
      id: randomUUID(),
      action,
      summary,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.data.audit.unshift(entry);
    this.data.audit = this.data.audit.slice(0, 300);
    return entry;
  }

  reset() {
    this.data = createDefaultData();
    this.save();
    return this.snapshot();
  }

  backup({ confirm = false, reason = "manual" } = {}) {
    if (confirm !== true) throw new Error("Creating a local backup requires explicit confirmation.");
    this.ensureLoaded();
    this.save();
    const backupDir = path.join(this.dataDir, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const createdAt = new Date().toISOString();
    const safeTimestamp = createdAt.replace(/[:.]/g, "-");
    const safeReason = String(reason || "manual").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40) || "manual";
    const fileName = `nomos-data-${safeTimestamp}-${safeReason}.json`;
    const filePath = path.join(backupDir, fileName);
    fs.copyFileSync(this.filePath, filePath);
    this.audit("system.backup", `Create local backup: ${fileName}`, { fileName });
    this.save();
    return { fileName, filePath, createdAt };
  }

  listBackups() {
    const backupDir = path.join(this.dataDir, "backups");
    if (!fs.existsSync(backupDir)) return [];
    return fs
      .readdirSync(backupDir)
      .filter((fileName) => /^nomos-data-.*\.json$/i.test(fileName))
      .map((fileName) => {
        const filePath = path.join(backupDir, fileName);
        const stat = fs.statSync(filePath);
        return { fileName, filePath, createdAt: stat.mtime.toISOString(), size: stat.size };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 20);
  }

  resolveBackup(fileName) {
    const normalizedName = path.basename(String(fileName || "").trim());
    if (!/^nomos-data-.*\.json$/i.test(normalizedName)) throw new Error("Backup file name is invalid.");
    const filePath = path.join(this.dataDir, "backups", normalizedName);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error("Backup file does not exist.");
    return { fileName: normalizedName, filePath };
  }

  inspectBackup({ fileName } = {}) {
    const backup = this.resolveBackup(fileName);
    const data = readBackupData(backup.filePath);
    return {
      ...backup,
      dataVersion: data.version,
      projectCount: data.projects.length,
      agentCount: data.agents.length,
      executionCount: data.executions.length,
      updatedAt: data.updatedAt || null,
    };
  }

  restoreBackup({ fileName, confirm = false } = {}) {
    if (confirm !== true) throw new Error("Restoring a local backup requires explicit confirmation.");
    if (
      (this.data.executions || []).some((execution) =>
        ["pending_confirmation", "running", "cancelling"].includes(execution.status)
      )
    ) {
      throw new Error("Cannot restore a backup while local executions are active.");
    }
    const backup = this.resolveBackup(fileName);
    const restoredData = readBackupData(backup.filePath);
    const protectionBackup = this.backup({ confirm: true, reason: "pre-restore" });
    this.data = restoredData;
    this.audit("system.backup.restore", `Restore local backup: ${backup.fileName}`, {
      fileName: backup.fileName,
      protectionBackup: protectionBackup.fileName,
    });
    this.save();
    return {
      restored: true,
      fileName: backup.fileName,
      protectionBackup,
      dataVersion: this.data.version,
      projectCount: this.data.projects.length,
    };
  }
}

module.exports = { JsonStore, migrateData, validateData };
