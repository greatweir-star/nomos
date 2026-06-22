import React from "react";
import type { ApiError, NetworkError } from "@/api/client";
import { ERROR_CODES } from "@/types/api";

interface ErrorStateProps {
  error: ApiError | NetworkError | Error | unknown;
  onRetry?: () => void;
  onReload?: () => void;
}

function getConflictAction(code: string, onReload?: () => void): React.ReactNode {
  if (!onReload) return null;
  switch (code) {
    case ERROR_CODES.VERSION_CONFLICT:
    case ERROR_CODES.PREVIEW_EXPIRED:
    case ERROR_CODES.CANDIDATE_NO_LONGER_ELIGIBLE:
      return (
        <button onClick={onReload} style={btnStyle("warning")}>
          重新加载后重试
        </button>
      );
    case ERROR_CODES.REFERENCE_CONFLICT:
      return <span style={{ fontSize: "var(--font-size-sm)", color: "var(--amber)" }}>请先解除相关引用</span>;
    case ERROR_CODES.FORBIDDEN:
      return <span style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>请联系组织 Owner 申请权限</span>;
    default:
      return null;
  }
}

function btnStyle(variant: "primary" | "warning" | "neutral"): React.CSSProperties {
  const colors: Record<string, React.CSSProperties> = {
    primary: { background: "var(--green)", color: "#fff" },
    warning: { background: "var(--amber-soft)", color: "var(--amber)" },
    neutral: { background: "var(--line)", color: "var(--ink)" },
  };
  return {
    padding: "6px 14px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 500,
    fontSize: "var(--font-size-sm)",
    cursor: "pointer",
    border: "none",
    ...colors[variant],
  };
}

export function ErrorState({ error, onRetry, onReload }: ErrorStateProps) {
  const isApiError = (e: unknown): e is ApiError => (e as ApiError)?.problem != null;
  const isNetworkError = (e: unknown): e is NetworkError => (e as NetworkError)?.name === "NetworkError";

  let title = "出现错误";
  let detail = "请稍后重试";
  let code = "";
  let isConflict = false;

  if (isApiError(error)) {
    code = error.problem.code;
    title = error.problem.title;
    detail = error.problem.detail;
    isConflict = error.status === 409 || error.status === 403;
  } else if (isNetworkError(error)) {
    title = "连接失败";
    detail = (error as Error).message;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  const conflictAction = isConflict ? getConflictAction(code, onReload) : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--red)",
      }}
    >
      <span style={{ fontSize: 28 }} aria-hidden>⚠</span>
      <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-size-md)", color: "var(--ink)" }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--muted)", maxWidth: 360 }}>
        {detail}
      </p>
      {code && (
        <code style={{ fontSize: "var(--font-size-xs)", color: "var(--muted)", background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>
          {code}
        </code>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {conflictAction}
        {onRetry && !isConflict && (
          <button onClick={onRetry} style={btnStyle("primary")}>
            重试
          </button>
        )}
      </div>
    </div>
  );
}
