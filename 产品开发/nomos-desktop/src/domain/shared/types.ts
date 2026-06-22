/**
 * Nomos 共享领域类型与合约
 * 冻结 DTO 约束：所有资源对象具有 id/createdAt/updatedAt/version
 */

export type NomosId = string;

export interface EntityBase {
  id: NomosId;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
  version: number;
}

export type ConnectionStatus =
  | "draft"
  | "testing"
  | "connected"
  | "degraded"
  | "offline"
  | "unmanageable"
  | "disabled";

export type EmployeeStatus =
  | "draft"
  | "onboarding"
  | "schedulable"
  | "unavailable"
  | "suspended"
  | "on_leave"
  | "offboarded";

export type EmployeeType = "carbon" | "silicon" | "hybrid";

export type WorkItemStatus =
  | "draft"
  | "ready"
  | "pending_dispatch"
  | "pending_confirmation"
  | "running"
  | "review_pending"
  | "done"
  | "blocked"
  | "failed"
  | "retrying"
  | "cancelled";

export type FlowVersionStatus = "draft" | "published" | "inactive";

export type DispatchStatus =
  | "previewed"
  | "confirmed"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ReceiptStatus = "progress" | "completed" | "blocked" | "failed";

export type AcceptanceResult = "accepted" | "rejected" | "rework";

export type SkillCategory = "general" | "domain" | "position_specific";
export type SkillSource = "manual" | "retrospective" | "imported";
export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export type ApprovalPolicy = "none" | "owner";

export type ExecutionType = "carbon" | "silicon" | "hybrid";
export type RoutingStrategy = "auto" | "fixed_employee" | "position_pool" | "manual";

export interface PageMeta {
  requestId: string;
  nextCursor?: string | null;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface AuditActor {
  type: "user" | "employee" | "agent" | "system";
  id: NomosId | null;
  name: string;
}

export interface AuditEvent {
  id: NomosId;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  actor: AuditActor;
  targetType: string;
  targetId: NomosId;
  reason?: string;
  createdAt: string;
}
