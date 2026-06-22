import React from "react";
import type { ConnectionStatus, EmployeeStatus, WorkItemStatus } from "@/types/api";

type TagVariant = "success" | "warning" | "error" | "neutral" | "info" | "draft";

const VARIANT_STYLES: Record<TagVariant, React.CSSProperties> = {
  success: { background: "var(--green-soft)", color: "var(--green)" },
  warning: { background: "var(--amber-soft)", color: "var(--amber)" },
  error: { background: "var(--red-soft)", color: "var(--red)" },
  neutral: { background: "var(--line)", color: "var(--muted)" },
  info: { background: "var(--blue-soft)", color: "var(--blue)" },
  draft: { background: "var(--paper-soft)", color: "var(--muted)", border: "1px dashed var(--line-strong)" },
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 100,
  fontSize: "var(--font-size-xs)",
  fontWeight: 500,
  whiteSpace: "nowrap",
  lineHeight: "18px",
};

// 状态文本映射 — 不依赖服务端中文文本做逻辑分支
const CONNECTION_STATUS_MAP: Record<ConnectionStatus, { label: string; variant: TagVariant }> = {
  draft: { label: "草稿", variant: "draft" },
  testing: { label: "检测中", variant: "info" },
  connected: { label: "已连接", variant: "success" },
  degraded: { label: "降级", variant: "warning" },
  offline: { label: "离线", variant: "error" },
  unmanageable: { label: "不可管理", variant: "error" },
  disabled: { label: "已禁用", variant: "neutral" },
};

const EMPLOYEE_STATUS_MAP: Record<EmployeeStatus, { label: string; variant: TagVariant }> = {
  draft: { label: "草稿", variant: "draft" },
  onboarding: { label: "入职中", variant: "info" },
  schedulable: { label: "可调度", variant: "success" },
  unavailable: { label: "不可用", variant: "warning" },
  suspended: { label: "暂停", variant: "warning" },
  on_leave: { label: "休假", variant: "neutral" },
  offboarded: { label: "已离职", variant: "neutral" },
};

const WORK_ITEM_STATUS_MAP: Record<WorkItemStatus, { label: string; variant: TagVariant }> = {
  draft: { label: "草稿", variant: "draft" },
  ready: { label: "待启动", variant: "neutral" },
  pending_dispatch: { label: "待派发", variant: "info" },
  pending_confirmation: { label: "待确认", variant: "warning" },
  running: { label: "执行中", variant: "info" },
  review_pending: { label: "待验收", variant: "warning" },
  done: { label: "已完成", variant: "success" },
  blocked: { label: "阻塞", variant: "error" },
  failed: { label: "失败", variant: "error" },
  retrying: { label: "重试中", variant: "warning" },
  cancelled: { label: "已取消", variant: "neutral" },
};

interface StatusTagProps {
  type: "connection" | "employee" | "workitem";
  status: ConnectionStatus | EmployeeStatus | WorkItemStatus;
}

export function StatusTag({ type, status }: StatusTagProps) {
  let label: string;
  let variant: TagVariant;

  if (type === "connection") {
    const m = CONNECTION_STATUS_MAP[status as ConnectionStatus];
    label = m?.label ?? status;
    variant = m?.variant ?? "neutral";
  } else if (type === "employee") {
    const m = EMPLOYEE_STATUS_MAP[status as EmployeeStatus];
    label = m?.label ?? status;
    variant = m?.variant ?? "neutral";
  } else {
    const m = WORK_ITEM_STATUS_MAP[status as WorkItemStatus];
    label = m?.label ?? status;
    variant = m?.variant ?? "neutral";
  }

  return (
    <span
      style={{ ...baseStyle, ...VARIANT_STYLES[variant] }}
      role="status"
      aria-label={label}
    >
      {label}
    </span>
  );
}

// 通用自定义标签
interface TagProps {
  variant?: TagVariant;
  children: React.ReactNode;
}

export function Tag({ variant = "neutral", children }: TagProps) {
  return (
    <span style={{ ...baseStyle, ...VARIANT_STYLES[variant] }}>
      {children}
    </span>
  );
}
