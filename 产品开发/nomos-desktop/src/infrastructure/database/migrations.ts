/**
 * Nomos V0.0.3 SQLite Migration Runner
 * 显式迁移、版本追踪、不自动静默修改旧数据
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { DbConnection } from "./connection";

export interface Migration {
  id: string; // 格式: YYYYMMDD_HHMMSS_description
  version: number;
  up: string;
  down?: string;
}

export interface MigrationRecord {
  version: number;
  id: string;
  appliedAt: string;
}

export class MigrationRunner {
  private readonly schemaTable = "schema_migrations";

  constructor(private db: DbConnection) {}

  /** 初始化迁移表 */
  ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.schemaTable} (
        version INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      );
    `);
  }

  /** 获取已应用的迁移版本 */
  appliedVersions(): number[] {
    this.ensureTable();
    const rows = this.db
      .prepare(`SELECT version FROM ${this.schemaTable} ORDER BY version ASC;`)
      .all() as Array<{ version: number }>;
    return rows.map((r) => r.version);
  }

  /** 检查是否存在迁移表 */
  hasMigrationsTable(): boolean {
    try {
      const row = this.db
        .prepare(
          `SELECT 1 FROM sqlite_master WHERE type='table' AND name=?;`
        )
        .get(this.schemaTable) as { "1": number } | undefined;
      return row !== undefined;
    } catch {
      return false;
    }
  }

  /** 运行迁移；dryRun 模式下只返回计划不执行 */
  migrate(migrations: Migration[], dryRun = false): {
    applied: Migration[];
    skipped: number[];
    errors: Array<{ migration: Migration; error: Error }>;
  } {
    this.ensureTable();
    const applied = this.appliedVersions();
    const pending = migrations.filter((m) => !applied.includes(m.version));
    const result: {
      applied: Migration[];
      skipped: number[];
      errors: Array<{ migration: Migration; error: Error }>;
    } = { applied: [], skipped: applied, errors: [] };

    if (dryRun) {
      return { ...result, applied: pending };
    }

    for (const migration of pending) {
      try {
        this.db.exec("BEGIN TRANSACTION;");
        this.db.exec(migration.up);
        this.db
          .prepare(
            `INSERT INTO ${this.schemaTable} (version, id, applied_at) VALUES (?, ?, ?);`
          )
          .run(migration.version, migration.id, new Date().toISOString());
        this.db.exec("COMMIT;");
        result.applied.push(migration);
      } catch (error) {
        try {
          this.db.exec("ROLLBACK;");
        } catch {
          /* ignore rollback failure */ }
        result.errors.push({
          migration,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        break; // 严格：失败即停止，后续不继续
      }
    }

    return result;
  }

  /** 从目录加载 .sql 迁移文件 */
  static loadFromDir(migrationsDir: string): Migration[] {
    if (!fs.existsSync(migrationsDir)) return [];
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const migrations: Migration[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = file.match(
        /^(\d{4}\d{2}\d{2}_\d{2}\d{2}\d{2})_(.+)\.sql$/
      );
      if (!match) continue;
      const [, id] = match;
      const upPath = path.join(migrationsDir, file);
      const downPath = path.join(
        migrationsDir,
        file.replace(".sql", ".down.sql")
      );
      const up = fs.readFileSync(upPath, "utf8");
      const down = fs.existsSync(downPath)
        ? fs.readFileSync(downPath, "utf8")
        : undefined;
      migrations.push({ id, version: i + 1, up, down });
    }
    return migrations;
  }

  /** 创建迁移目录结构 */
  static initDir(migrationsDir: string): void {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
}

export const CORE_MIGRATIONS: Migration[] = [
  {
    id: "20250621_000000_init",
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_events(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        request_hash TEXT NOT NULL,
        response_status INTEGER NOT NULL,
        response_body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
    `,
  },
  {
    id: "20250621_000001_core_tables",
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS adapter_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        scope TEXT NOT NULL,
        connector_type TEXT NOT NULL,
        dispatch_mode TEXT NOT NULL,
        receipt_mode TEXT NOT NULL,
        supports_dispatch INTEGER NOT NULL DEFAULT 1,
        supports_execution INTEGER NOT NULL DEFAULT 0,
        configurable INTEGER NOT NULL DEFAULT 1,
        capabilities TEXT NOT NULL DEFAULT '[]',
        risk_level TEXT NOT NULL DEFAULT 'medium',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS connection_profiles (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES adapter_templates(id),
        name TEXT NOT NULL UNIQUE,
        scope TEXT NOT NULL,
        reach_ref TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        manageable INTEGER NOT NULL DEFAULT 0,
        version_label TEXT,
        concurrency_capacity INTEGER NOT NULL DEFAULT 1,
        active_sessions INTEGER NOT NULL DEFAULT 0,
        credential_state TEXT NOT NULL DEFAULT 'not_required',
        last_check_at TEXT,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS health_checks (
        id TEXT PRIMARY KEY,
        connection_profile_id TEXT NOT NULL REFERENCES connection_profiles(id),
        status TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_health_checks_profile ON health_checks(connection_profile_id);
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        level INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        family TEXT NOT NULL,
        responsibilities TEXT NOT NULL DEFAULT '[]',
        acceptance_criteria TEXT NOT NULL DEFAULT '[]',
        management_permission TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS position_skills (
        position_id TEXT NOT NULL REFERENCES positions(id),
        skill_id TEXT NOT NULL REFERENCES skills(id),
        PRIMARY KEY (position_id, skill_id)
      );
      CREATE TABLE IF NOT EXISTS position_permissions (
        position_id TEXT NOT NULL REFERENCES positions(id),
        data_scope TEXT NOT NULL,
        visibility TEXT NOT NULL,
        actions TEXT NOT NULL,
        responsibility_boundary TEXT NOT NULL,
        approval_policy TEXT NOT NULL DEFAULT 'none',
        PRIMARY KEY (position_id, data_scope)
      );
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        employee_no TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        primary_position_id TEXT REFERENCES positions(id),
        connection_profile_id TEXT REFERENCES connection_profiles(id),
        session_key TEXT,
        prompt_snapshot_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        schedulable INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(primary_position_id);
      CREATE INDEX IF NOT EXISTS idx_employees_profile ON employees(connection_profile_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_session_key ON employees(connection_profile_id, session_key);
      CREATE TABLE IF NOT EXISTS runtime_bindings (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL UNIQUE REFERENCES employees(id),
        session_key_masked TEXT NOT NULL,
        isolation_level TEXT NOT NULL DEFAULT 'session',
        prompt_snapshot_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS permission_requests (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL REFERENCES employees(id),
        target_position_id TEXT NOT NULL REFERENCES positions(id),
        requested_scopes TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer_employee_id TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS flow_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS flow_versions (
        id TEXT PRIMARY KEY,
        flow_definition_id TEXT NOT NULL REFERENCES flow_definitions(id),
        version_label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        validation TEXT NOT NULL DEFAULT '[]',
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_flow_versions_def ON flow_versions(flow_definition_id);
      CREATE TABLE IF NOT EXISTS flow_nodes (
        id TEXT PRIMARY KEY,
        flow_version_id TEXT NOT NULL REFERENCES flow_versions(id),
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        goal TEXT,
        inputs TEXT NOT NULL DEFAULT '[]',
        outputs TEXT NOT NULL DEFAULT '[]',
        acceptance_required INTEGER NOT NULL DEFAULT 1,
        acceptance_reviewer_position_id TEXT,
        acceptance_criteria TEXT NOT NULL DEFAULT '[]',
        failure_policy TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_flow_nodes_version ON flow_nodes(flow_version_id);
      CREATE TABLE IF NOT EXISTS flow_edges (
        id TEXT PRIMARY KEY,
        flow_version_id TEXT NOT NULL REFERENCES flow_versions(id),
        from_node_id TEXT NOT NULL REFERENCES flow_nodes(id),
        to_node_id TEXT NOT NULL REFERENCES flow_nodes(id),
        condition TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_flow_edges_version ON flow_edges(flow_version_id);
      CREATE TABLE IF NOT EXISTS position_slots (
        id TEXT PRIMARY KEY,
        flow_node_id TEXT NOT NULL REFERENCES flow_nodes(id),
        name TEXT NOT NULL,
        required_position_id TEXT NOT NULL REFERENCES positions(id),
        execution_type TEXT NOT NULL DEFAULT 'silicon',
        routing_strategy TEXT NOT NULL DEFAULT 'auto',
        fixed_employee_id TEXT REFERENCES employees(id),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT NOT NULL,
        owner_employee_id TEXT NOT NULL REFERENCES employees(id),
        flow_version_id TEXT REFERENCES flow_versions(id),
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS flow_instances (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
        flow_version_id TEXT NOT NULL REFERENCES flow_versions(id),
        status TEXT NOT NULL DEFAULT 'running',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS node_instances (
        id TEXT PRIMARY KEY,
        flow_instance_id TEXT NOT NULL REFERENCES flow_instances(id),
        flow_node_id TEXT NOT NULL REFERENCES flow_nodes(id),
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_node_instances_flow ON node_instances(flow_instance_id);
      CREATE TABLE IF NOT EXISTS work_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        node_instance_id TEXT REFERENCES node_instances(id),
        position_slot_id TEXT REFERENCES position_slots(id),
        title TEXT NOT NULL,
        requirements TEXT,
        required_position_id TEXT REFERENCES positions(id),
        assignee_employee_id TEXT REFERENCES employees(id),
        acting_position_id TEXT REFERENCES positions(id),
        status TEXT NOT NULL DEFAULT 'draft',
        attempt INTEGER NOT NULL DEFAULT 1,
        acceptance_criteria_snapshot TEXT NOT NULL DEFAULT '[]',
        dependency_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(project_id);
      CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
      CREATE TABLE IF NOT EXISTS work_item_dependencies (
        work_item_id TEXT NOT NULL REFERENCES work_items(id),
        dependency_id TEXT NOT NULL REFERENCES work_items(id),
        PRIMARY KEY (work_item_id, dependency_id)
      );
      CREATE TABLE IF NOT EXISTS dispatches (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL REFERENCES work_items(id),
        employee_id TEXT NOT NULL REFERENCES employees(id),
        acting_position_id TEXT NOT NULL REFERENCES positions(id),
        idempotency_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'previewed',
        capacity_leased INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_dispatches_work_item ON dispatches(work_item_id);
      CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
      CREATE TABLE IF NOT EXISTS candidate_scores (
        id TEXT PRIMARY KEY,
        dispatch_id TEXT NOT NULL REFERENCES dispatches(id),
        employee_id TEXT NOT NULL REFERENCES employees(id),
        acting_position_id TEXT NOT NULL REFERENCES positions(id),
        score REAL,
        eligible INTEGER NOT NULL DEFAULT 1,
        reasons TEXT NOT NULL DEFAULT '[]',
        ineligible_reasons TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_candidate_scores_dispatch ON candidate_scores(dispatch_id);
      CREATE TABLE IF NOT EXISTS capacity_leases (
        id TEXT PRIMARY KEY,
        connection_profile_id TEXT NOT NULL REFERENCES connection_profiles(id),
        dispatch_id TEXT NOT NULL REFERENCES dispatches(id),
        leased_at TEXT NOT NULL,
        released_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_capacity_leases_profile ON capacity_leases(connection_profile_id);
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        dispatch_id TEXT NOT NULL REFERENCES dispatches(id),
        status TEXT NOT NULL DEFAULT 'running',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_executions_dispatch ON executions(dispatch_id);
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL REFERENCES executions(id),
        work_item_id TEXT NOT NULL REFERENCES work_items(id),
        attempt INTEGER NOT NULL,
        status TEXT NOT NULL,
        summary TEXT,
        deliverables TEXT NOT NULL DEFAULT '[]',
        tests TEXT NOT NULL DEFAULT '[]',
        risks TEXT NOT NULL DEFAULT '[]',
        next_actions TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_receipts_execution ON receipts(execution_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_work_item ON receipts(work_item_id);
      CREATE TABLE IF NOT EXISTS deliverables (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL REFERENCES receipts(id),
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        uri TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS acceptances (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL REFERENCES receipts(id),
        node_instance_id TEXT REFERENCES node_instances(id),
        reviewer_employee_id TEXT NOT NULL REFERENCES employees(id),
        result TEXT NOT NULL,
        against_criteria TEXT NOT NULL DEFAULT '[]',
        comment TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_acceptances_receipt ON acceptances(receipt_id);
    `,
  },
  {
    id: "20250621_000002_organization_runtime",
    version: 3,
    up: `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_name_active ON skills(name) WHERE status != 'inactive';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_name_active ON positions(name) WHERE status != 'inactive';
      CREATE TABLE IF NOT EXISTS employee_positions (
        employee_id TEXT NOT NULL REFERENCES employees(id),
        position_id TEXT NOT NULL REFERENCES positions(id),
        PRIMARY KEY (employee_id, position_id)
      );
      CREATE TABLE IF NOT EXISTS prompt_snapshots (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL UNIQUE REFERENCES employees(id),
        position_id TEXT NOT NULL REFERENCES positions(id),
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS onboarding_checks (
        employee_id TEXT NOT NULL REFERENCES employees(id),
        key TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        PRIMARY KEY (employee_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_employee_positions_position ON employee_positions(position_id);
    `,
  },
  {
    id: "20250621_000003_dispatch_evidence",
    version: 4,
    up: `
      ALTER TABLE dispatches ADD COLUMN preview_expires_at TEXT;
      ALTER TABLE dispatches ADD COLUMN confirmed_at TEXT;
      ALTER TABLE executions ADD COLUMN connector_ref TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptances_receipt_once ON acceptances(receipt_id);
    `,
  },
  {
    id: "20250621_000004_release_hardening",
    version: 5,
    up: `
      UPDATE employees SET session_key = NULL WHERE session_key IS NOT NULL;
      CREATE TABLE IF NOT EXISTS legacy_imports (
        id TEXT PRIMARY KEY,
        source_path TEXT NOT NULL,
        source_hash TEXT NOT NULL UNIQUE,
        source_version INTEGER NOT NULL,
        report TEXT NOT NULL,
        imported_at TEXT NOT NULL
      );
    `,
  },
];
