

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "加载中…" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "64px 24px",
      }}
    >
      <Spinner />
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--line-strong)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--green)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
