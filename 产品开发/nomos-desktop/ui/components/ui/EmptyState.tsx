import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "64px 24px",
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      {icon && (
        <div style={{ fontSize: 32, opacity: 0.5, marginBottom: 4 }} aria-hidden>
          {icon}
        </div>
      )}
      <p style={{ margin: 0, fontWeight: 500, color: "var(--ink)", fontSize: "var(--font-size-md)" }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
