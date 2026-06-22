// 通用响应结构 — 来自 API 字段合同 §1
export type Success<T> = {
  data: T;
  meta: { requestId: string; nextCursor?: string | null };
};

export type Problem = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
  requestId: string;
};

// Integration — §2
export type ConnectionStatus =
  | "draft"
  | "testing"
  | "connected"
  | "degraded"
  | "offline"
  | "unmanageable"
  | "disabled";

export type ConnectionProfileDto = {
  id: string;
  templateId: "alice" | "codex-cli" | "claude-code" | "kimi" | "openclaw";
  name: string;
  scope: "local" | "remote";
  reachRef: string;
  status: ConnectionStatus;
  manageable: boolean;
  versionLabel: string | null;
  concurrencyCapacity: number;
  activeSessions: number;
  credentialState: "not_required" | "system_managed" | "missing" | "invalid";
  lastCheckAt: string | null;
  lastError: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type DiscoveredConnectionDto = {
  discoveryId: string;
  templateId: ConnectionProfileDto["templateId"];
  label: string;
  commandOrEndpoint: string;
  versionLabel: string | null;
  detectedAt: string;
};

export type AdapterTemplateDto = {
  id: ConnectionProfileDto["templateId"];
  name: string;
  provider: string;
  scope: "local" | "remote";
  connectorType: string;
  dispatchMode: string;
  receiptMode: string;
  supportsDispatch: boolean;
  supportsExecution: boolean;
  configurable: boolean;
  capabilities: string[];
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

// Organization — §3
export type SkillDto = {
  id: string;
  name: string;
  category: "general" | "domain" | "position_specific";
  level: 0 | 1 | 2 | 3 | 4;
  source: "manual" | "retrospective" | "imported";
  status: "active" | "inactive";
  referenceCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type PositionDto = {
  id: string;
  name: string;
  family: string;
  responsibilities: string[];
  acceptanceCriteria: string[];
  skillIds: string[];
  managementPermission: {
    dataScopes: string[];
    visibility: string[];
    actions: string[];
    responsibilityBoundary: string;
    approvalPolicy: "none" | "owner";
  };
  status: "active" | "inactive";
  referenceSummary: { employees: number; flowNodes: number };
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type EmployeeStatus =
  | "draft"
  | "onboarding"
  | "schedulable"
  | "unavailable"
  | "suspended"
  | "on_leave"
  | "offboarded";

export type EmployeeDto = {
  id: string;
  employeeNo: string;
  name: string;
  type: "carbon" | "silicon" | "hybrid";
  primaryPositionId: string | null;
  additionalPositionIds: string[];
  connectionProfileId: string | null;
  runtimeBinding: null | {
    sessionKeyMasked: string;
    isolationLevel: "session";
    promptSnapshotId: string;
  };
  status: EmployeeStatus;
  schedulable: boolean;
  workload: { active: number; capacity: number; utilization: number | null };
  onboardingChecks: Array<{
    key: string;
    status: "pending" | "passed" | "failed";
    message: string;
  }>;
  createdAt: string;
  updatedAt: string;
  version: number;
};

// Flow / Project / Work — §4
export type PositionSlotDto = {
  id: string;
  name: string;
  requiredPositionId: string;
  executionType: "carbon" | "silicon" | "hybrid";
  routingStrategy: "auto" | "fixed_employee" | "position_pool" | "manual";
  fixedEmployeeId: string | null;
};

export type FlowNodeDto = {
  id: string;
  key: string;
  name: string;
  goal: string;
  inputs: string[];
  outputs: string[];
  positionSlots: PositionSlotDto[];
  acceptance: {
    required: boolean;
    reviewerPositionId: string | null;
    criteria: string[];
  };
  failurePolicy: { maxAttempts: number; reworkNodeKey: string | null };
};

export type FlowVersionDto = {
  id: string;
  flowDefinitionId: string;
  versionLabel: string;
  status: "draft" | "published" | "inactive";
  nodes: FlowNodeDto[];
  edges: Array<{ fromNodeId: string; toNodeId: string; condition: string | null }>;
  validation: Array<{
    severity: "error" | "warning";
    code: string;
    nodeId: string | null;
    message: string;
  }>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type FlowDefinitionDto = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published" | "inactive";
  versions: FlowVersionDto[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ProjectDto = {
  id: string;
  name: string;
  goal: string;
  ownerEmployeeId: string;
  flowVersionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

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

export type WorkItemDto = {
  id: string;
  projectId: string;
  nodeInstanceId: string | null;
  positionSlotId: string | null;
  title: string;
  requirements: string;
  requiredPositionId: string;
  assigneeEmployeeId: string | null;
  actingPositionId: string | null;
  status: WorkItemStatus;
  attempt: number;
  acceptanceCriteriaSnapshot: string[];
  dependencyIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ProjectRuntimeDto = {
  project: {
    id: string;
    name: string;
    goal: string;
    ownerEmployeeId: string;
    status: string;
  };
  flowSnapshot: {
    flowVersionId: string;
    versionLabel: string;
    nodes: FlowNodeDto[];
  } | null;
  nodeInstances: Array<{
    id: string;
    flowNodeId: string;
    status: string;
    workItemIds: string[];
  }>;
  workItems: WorkItemDto[];
  participants: EmployeeDto[];
};

// Dispatch / Evidence — §5
export type DispatchCandidateDto = {
  employeeId: string;
  employeeName: string;
  actingPositionId: string;
  positionName: string;
  connectionProfileId: string | null;
  connectionStatus: ConnectionStatus | null;
  workload: EmployeeDto["workload"];
  eligible: boolean;
  score: number | null;
  reasons: string[];
  ineligibleReasons: string[];
};

export type DispatchPreviewDto = {
  dispatchId: string;
  workItemSnapshot: WorkItemDto;
  candidates: DispatchCandidateDto[];
  selectedEmployeeId: string | null;
  recommendationReason: string;
  riskSummary: string[];
  expiresAt: string;
};

export type ReceiptDto = {
  id: string;
  executionId: string;
  workItemId: string;
  attempt: number;
  status: "progress" | "completed" | "blocked" | "failed";
  summary: string;
  deliverables: Array<{
    id: string;
    type: "file" | "url" | "text";
    label: string;
    uri: string;
  }>;
  tests: Array<{
    name: string;
    status: "passed" | "failed" | "skipped";
    detail: string;
  }>;
  risks: string[];
  nextActions: string[];
  createdAt: string;
};

export type AcceptanceDto = {
  id: string;
  receiptId: string;
  nodeInstanceId: string | null;
  reviewerEmployeeId: string;
  result: "accepted" | "rejected" | "rework";
  againstCriteria: Array<{
    criterion: string;
    result: "passed" | "failed";
    comment: string;
  }>;
  comment: string;
  createdAt: string;
};

// Dashboard — §6
export type DashboardDto = {
  counts: {
    schedulableEmployees: number;
    runningWorkItems: number;
    pendingDispatches: number;
    pendingAcceptances: number;
    pendingPermissionRequests: number;
  };
  exceptions: Array<{
    type: "connection" | "work_item" | "dispatch" | "acceptance" | "permission";
    severity: "warning" | "critical";
    targetId: string;
    title: string;
    reason: string;
  }>;
  updatedAt: string;
};

// 稳定错误码 — §7
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  REFERENCE_CONFLICT: "REFERENCE_CONFLICT",
  PREVIEW_EXPIRED: "PREVIEW_EXPIRED",
  CANDIDATE_NO_LONGER_ELIGIBLE: "CANDIDATE_NO_LONGER_ELIGIBLE",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  CONNECTION_UNMANAGEABLE: "CONNECTION_UNMANAGEABLE",
  CAPACITY_EXHAUSTED: "CAPACITY_EXHAUSTED",
  CREDENTIAL_UNAVAILABLE: "CREDENTIAL_UNAVAILABLE",
  FLOW_VALIDATION_FAILED: "FLOW_VALIDATION_FAILED",
  MIGRATION_REVIEW_REQUIRED: "MIGRATION_REVIEW_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// 列表查询参数
export type ListParams = {
  cursor?: string;
  limit?: number;
  search?: string;
};
