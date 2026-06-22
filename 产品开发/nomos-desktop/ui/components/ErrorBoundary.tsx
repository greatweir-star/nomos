import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "64px 24px",
            textAlign: "center",
            fontFamily: "monospace",
            background: "#f7e7e2",
            minHeight: "100vh",
          }}
        >
          <span style={{ fontSize: 32 }}>⚠</span>
          <p style={{ fontWeight: 700, margin: 0 }}>渲染错误</p>
          <pre style={{ fontSize: 12, color: "#c25e51", maxWidth: 600, whiteSpace: "pre-wrap", textAlign: "left" }}>
            {error.message}
            {"\n"}
            {error.stack}
          </pre>
          <button
            onClick={this.reset}
            style={{ padding: "8px 20px", background: "#28644f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
