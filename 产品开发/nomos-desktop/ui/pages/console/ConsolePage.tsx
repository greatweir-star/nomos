import React from "react";
import { Link } from "react-router-dom";
import { get } from "@/api/client";
import { useAsync } from "@/hooks/useAsync";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardDto, Success } from "@/types/api";

const MOCK_MODE = import.meta.env.VITE_USE_MOCK === "true";

async function fetchDashboard(): Promise<DashboardDto> {
  if (MOCK_MODE) {
    const { mockDashboard } = await import("@/api/mock");
    return mockDashboard.data;
  }
  const res: Success<DashboardDto> = await get<DashboardDto>("/dashboard");
  return res.data;
}

const countCard = (label: string, value: number, href: string): React.ReactNode => (
  <Link
    key={label}
    to={href}
    aria-label={`${label}：${value}`}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "20px 24px",
      background: "var(--paper)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--line)",
      textDecoration: "none",
      color: "inherit",
      transition: "box-shadow 0.15s",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-soft)"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
  >
    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)", fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.5px" }}>{value}</span>
    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--primary)" }}>查看明细 →</span>
  </Link>
);

export function ConsolePage() {
  const { state, reload } = useAsync<DashboardDto>(fetchDashboard, []);

  if (state.status === "loading" || state.status === "idle") return <LoadingState label="加载控制台…" />;
  if (state.status === "error") return <ErrorState error={state.error} onRetry={reload} />;

  const { counts, exceptions, updatedAt } = state.data;
  const hasData = Object.values(counts).some((v) => v > 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-size-xl)", fontWeight: 700 }}>控制台</h1>
        {updatedAt !== new Date(0).toISOString() && (
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>
            更新于 {new Date(updatedAt).toLocaleString("zh-CN")}
          </span>
        )}
      </div>

      {!hasData && exceptions.length === 0 ? (
        <EmptyState
          title="暂无运行数据"
          description="系统尚未有员工、工作项或待办事项。完成组织配置和流程发布后，真实数据将在这里展示。"
        />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {countCard("可调度员工", counts.schedulableEmployees, "/organization")}
            {countCard("进行中工作项", counts.runningWorkItems, "/dispatch")}
            {countCard("待确认派发", counts.pendingDispatches, "/dispatch")}
            {countCard("待验收", counts.pendingAcceptances, "/dispatch")}
            {countCard("待审批", counts.pendingPermissionRequests, "/organization")}
          </div>

          {exceptions.length > 0 && (
            <section aria-label="异常列表">
              <h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-md)", fontWeight: 600 }}>异常</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {exceptions.map((ex, i) => (
                  <div
                    key={`${ex.targetId}-${i}`}
                    role="alert"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: "var(--radius-sm)",
                      background: ex.severity === "critical" ? "var(--red-soft)" : "var(--amber-soft)",
                      border: `1px solid ${ex.severity === "critical" ? "var(--red)" : "var(--amber)"}22`,
                    }}
                  >
                    <span
                      aria-label={ex.severity === "critical" ? "严重" : "警告"}
                      style={{ fontSize: 16, flexShrink: 0 }}
                    >
                      {ex.severity === "critical" ? "🔴" : "🟡"}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{ex.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "var(--font-size-xs)", color: "var(--muted)" }}>{ex.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
