/**
 * Mock fixtures — 仅在 VITE_USE_MOCK=true 时激活。
 * 所有字段严格遵循 API 字段合同 V0.0.3，禁止添加虚构员工、虚假负载、伪更新时间。
 * 空列表是合法的 mock 响应，不得用示例数据填充生产模式。
 */

import type {
  DashboardDto,
  ConnectionProfileDto,
  SkillDto,
  PositionDto,
  EmployeeDto,
  FlowVersionDto,
  WorkItemDto,
  Success,
  Problem,
} from "@/types/api";

function ok<T>(data: T, nextCursor?: string): Success<T> {
  return {
    data,
    meta: { requestId: `mock-${Math.random().toString(36).slice(2)}`, nextCursor: nextCursor ?? null },
  };
}

// Dashboard — empty state (真实空库)
export const mockDashboard: Success<DashboardDto> = ok<DashboardDto>({
  counts: {
    schedulableEmployees: 0,
    runningWorkItems: 0,
    pendingDispatches: 0,
    pendingAcceptances: 0,
    pendingPermissionRequests: 0,
  },
  exceptions: [],
  updatedAt: new Date(0).toISOString(),
});

// ConnectionProfile list — empty
export const mockConnections: Success<ConnectionProfileDto[]> = ok<ConnectionProfileDto[]>([]);

// Skill list — empty
export const mockSkills: Success<SkillDto[]> = ok<SkillDto[]>([]);

// Position list — empty
export const mockPositions: Success<PositionDto[]> = ok<PositionDto[]>([]);

// Employee list — empty
export const mockEmployees: Success<EmployeeDto[]> = ok<EmployeeDto[]>([]);

// FlowVersion list — empty
export const mockFlowVersions: Success<FlowVersionDto[]> = ok<FlowVersionDto[]>([]);

// WorkItem list — empty
export const mockWorkItems: Success<WorkItemDto[]> = ok<WorkItemDto[]>([]);

// 标准 404 mock
export const mock404: Problem = {
  type: "about:blank",
  title: "资源不存在",
  status: 404,
  code: "NOT_FOUND",
  detail: "请求的资源不存在",
  requestId: "mock-404",
};

// 标准 409 VERSION_CONFLICT mock
export const mock409Conflict: Problem = {
  type: "about:blank",
  title: "版本冲突",
  status: 409,
  code: "VERSION_CONFLICT",
  detail: "数据已被其他操作修改，请刷新后重试",
  requestId: "mock-409",
};

// 标准 403 mock
export const mock403: Problem = {
  type: "about:blank",
  title: "权限不足",
  status: 403,
  code: "FORBIDDEN",
  detail: "当前岗位权限不允许执行此操作",
  requestId: "mock-403",
};
