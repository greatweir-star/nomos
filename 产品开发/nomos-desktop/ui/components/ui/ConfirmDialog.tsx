import React, { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  targetLabel?: string;
  irreversible?: boolean;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  targetLabel,
  irreversible,
  confirmLabel = "确认",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // 焦点进入弹窗 — 危险操作默认聚焦取消
      if (confirmVariant === "danger") {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }
  }, [open, confirmVariant]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmStyle: React.CSSProperties =
    confirmVariant === "danger"
      ? { background: "var(--red)", color: "#fff" }
      : { background: "var(--green)", color: "#fff" };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,35,31,0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        style={{
          background: "var(--paper)",
          borderRadius: "var(--radius-lg)",
          padding: "28px 28px 24px",
          width: 400,
          maxWidth: "90vw",
          boxShadow: "var(--shadow)",
        }}
      >
        <h2 id="confirm-title" style={{ margin: "0 0 8px", fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
          {title}
        </h2>
        <p id="confirm-desc" style={{ margin: "0 0 4px", color: "var(--muted)", fontSize: "var(--font-size-sm)", lineHeight: 1.6 }}>
          {description}
        </p>
        {targetLabel && (
          <p style={{ margin: "8px 0 0", fontWeight: 600, fontSize: "var(--font-size-sm)", color: "var(--ink)" }}>
            对象：{targetLabel}
          </p>
        )}
        {irreversible && (
          <p style={{ margin: "8px 0 0", color: "var(--red)", fontSize: "var(--font-size-xs)", fontWeight: 500 }}>
            ⚠ 此操作不可撤销
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "7px 18px",
              borderRadius: "var(--radius-sm)",
              background: "var(--line)",
              color: "var(--ink)",
              fontWeight: 500,
              fontSize: "var(--font-size-sm)",
              border: "none",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            style={{
              padding: "7px 18px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 500,
              fontSize: "var(--font-size-sm)",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              ...confirmStyle,
            }}
          >
            {loading ? "处理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
