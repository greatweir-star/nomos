/**
 * Nomos V0.0.3 新后端服务器入口
 * 提供 /api/v1 路由和统一中间件，与旧 backend/server.js 渐进共存
 */

import { createServer } from "node:http";
import type { DbConfig } from "../infrastructure/database/connection";
import { DbConnection } from "../infrastructure/database/connection";
import { MigrationRunner, CORE_MIGRATIONS } from "../infrastructure/database/migrations";
import { TransactionManager } from "../infrastructure/database/transaction";
import { Router } from "./middleware/router";
import {
  requestIdMiddleware,
  localHostMiddleware,
  trustedOriginMiddleware,
  requestLogMiddleware,
  errorHandlerMiddleware,
} from "./middleware/core";
import { healthRouter } from "./routes/health";
import { integrationRouter } from "./routes/integration";
import { dashboardRouter } from "./routes/dashboard";
import { organizationRouter } from "./routes/organization";
import { workflowRouter } from "./routes/workflow";
import { dispatchRouter } from "./routes/dispatch";
import { systemRouter } from "./routes/system";
import { recoverInterruptedExecutions } from "../application/system/service";
import { staticRendererMiddleware } from "./middleware/static";
import { seedAdapterTemplates } from "../application/integration/service";

export interface NomosServerOptions {
  dataDir: string;
  port?: number;
  rendererDir?: string;
}

export interface NomosServer {
  start(): Promise<{ url: string; port: number }>;
  stop(): Promise<void>;
  db(): DbConnection;
}

export function createNomosServerV1(options: NomosServerOptions): NomosServer {
  const dbConfig: DbConfig = { dataDir: options.dataDir, dbName: "nomos-v1.sqlite" };
  const db = new DbConnection(dbConfig);
  const txManager = new TransactionManager(db);
  let server: ReturnType<typeof createServer> | null = null;
  let port = options.port ?? 0;

  const router = new Router();

  // 全局中间件
  router.use(requestIdMiddleware());
  router.use(requestLogMiddleware());
  router.use(errorHandlerMiddleware());
  router.use(localHostMiddleware());
  router.use(trustedOriginMiddleware());

  // Health
  router.get("/api/v1/health", healthRouter());
  router.get("/api/v1/dashboard", dashboardRouter(db));

  // Integration (占位，逐步填充)
  const integration = integrationRouter(db, txManager);
  router.get("/api/v1/adapter-templates", integration.listTemplates);
  router.get("/api/v1/connection-profiles", integration.listProfiles);
  router.post("/api/v1/connection-profiles/discover", integration.discover);
  router.post("/api/v1/connection-profiles", integration.create);
  router.post("/api/v1/connection-profiles/:id/test", integration.test);
  router.patch("/api/v1/connection-profiles/:id", integration.update);
  router.post("/api/v1/connection-profiles/:id/disable", integration.disable);
  const organization = organizationRouter(db, txManager);
  router.get("/api/v1/skills", organization.listSkills);
  router.post("/api/v1/skills", organization.addSkill);
  router.patch("/api/v1/skills/:id", organization.editSkill);
  router.get("/api/v1/positions", organization.listPositions);
  router.post("/api/v1/positions", organization.addPosition);
  router.get("/api/v1/positions/:id", organization.getPosition);
  router.patch("/api/v1/positions/:id", organization.editPosition);
  router.get("/api/v1/employees", organization.listEmployees);
  router.post("/api/v1/employees", organization.addEmployee);
  router.get("/api/v1/employees/:id", organization.getEmployee);
  router.post("/api/v1/employees/:id/materialize", organization.materialize);
  router.post("/api/v1/employees/:id/onboarding-check", organization.checkOnboarding);
  router.post("/api/v1/employees/:id/suspend", organization.suspendEmployee);
  router.post("/api/v1/employees/:id/resume", organization.resumeEmployee);
  router.post("/api/v1/employees/:id/offboard", organization.offboardEmployee);
  router.get("/api/v1/permission-requests", organization.listPermissionRequests);
  router.post("/api/v1/permission-requests", organization.addPermissionRequest);
  router.post("/api/v1/permission-requests/:id/approve", organization.approvePermissionRequest);
  router.post("/api/v1/permission-requests/:id/reject", organization.rejectPermissionRequest);
  router.post("/api/v1/permission-requests/:id/revoke", organization.revokePermissionRequest);
  const workflow = workflowRouter(db, txManager);
  router.get("/api/v1/flows", workflow.listFlows);
  router.post("/api/v1/flows", workflow.addFlow);
  router.post("/api/v1/flows/:id/versions", workflow.addVersion);
  router.post("/api/v1/flows/:id/versions/:version/validate", workflow.validateVersion);
  router.post("/api/v1/flows/:id/versions/:version/publish", workflow.publishVersion);
  router.get("/api/v1/projects", workflow.listProjects);
  router.post("/api/v1/projects", workflow.addProject);
  router.post("/api/v1/projects/:id/start", workflow.startProject);
  router.get("/api/v1/projects/:id/runtime", workflow.runtime);
  const dispatch = dispatchRouter(db, txManager);
  router.post("/api/v1/work-items/:id/dispatch/preview", dispatch.preview);
  router.post("/api/v1/dispatches/:id/confirm", dispatch.confirm);
  router.get("/api/v1/dispatches", dispatch.list);
  router.post("/api/v1/executions/:id/receipts", dispatch.addReceipt);
  router.get("/api/v1/work-items/:id/receipts", dispatch.receipts);
  router.post("/api/v1/receipts/:id/acceptances", dispatch.accept);
  const system = systemRouter(db, txManager);
  router.get("/api/v1/system/backups", system.listBackups);
  router.post("/api/v1/system/backups", system.createBackup);
  router.get("/api/v1/system/backups/:fileName/inspect", system.inspectBackup);
  router.post("/api/v1/system/backups/:fileName/restore", system.restoreBackup);
  router.get("/api/v1/system/diagnostics", system.diagnostics);
  router.get("/api/v1/system/audits", system.audits);
  router.get("/api/v1/migration/legacy", system.migrationStatus);
  router.post("/api/v1/migration/legacy/dry-run", system.migrationPreview);
  router.post("/api/v1/migration/legacy/confirm", system.migrationConfirm);
  router.use(staticRendererMiddleware(options.rendererDir));

  return {
    async start() {
      // 打开数据库，但不自动迁移旧 JSON
      db.open();

      // 运行迁移（新库）
      const runner = new MigrationRunner(db);
      const result = runner.migrate(CORE_MIGRATIONS, false);
      if (result.errors.length > 0) {
        console.error("Migration failed:", result.errors);
        throw new Error(`Migration failed: ${result.errors[0].error.message}`);
      }
      seedAdapterTemplates(db);
      const recovered = recoverInterruptedExecutions(db);
      if (recovered > 0) console.warn(`Recovered ${recovered} interrupted executions`);
      console.log(`Migrations applied: ${result.applied.length}, skipped: ${result.skipped.length}`);

      return new Promise<{ url: string; port: number }>((resolve) => {
        server = createServer(router.handler());
        server.listen(port, "127.0.0.1", () => {
          const addr = server!.address();
          if (addr && typeof addr === "object") {
            port = addr.port;
          }
          const url = `http://127.0.0.1:${port}`;
          console.log(`Nomos V1 server listening at ${url}`);
          resolve({ url, port });
        });
      });
    },

    async stop() {
      if (server) {
        server.close();
        server = null;
      }
      db.close();
    },

    db() {
      return db;
    },
  };
}
