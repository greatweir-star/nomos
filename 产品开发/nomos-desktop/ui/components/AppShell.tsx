import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type NavItem = { path: string; label: string; icon: string; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "控制台", icon: "◎", exact: true },
  { path: "/organization", label: "组织", icon: "⊞" },
  { path: "/capability", label: "能力池", icon: "◈" },
  { path: "/flow", label: "流程", icon: "⊳" },
  { path: "/dispatch", label: "派发", icon: "⊡" },
  { path: "/project", label: "项目", icon: "⊟" },
  { path: "/settings", label: "设置", icon: "⊙" },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navWidth = collapsed ? "56px" : "200px";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <nav
        aria-label="主导航"
        style={{
          width: navWidth,
          minWidth: navWidth,
          background: "var(--paper)",
          borderRight: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s, min-width 0.2s",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "16px 0" : "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            borderBottom: "1px solid var(--line)",
            height: 56,
          }}
        >
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)", color: "var(--green)", letterSpacing: "-0.3px" }}>
              Nomos
            </span>
          )}
          <button
            aria-label={collapsed ? "展开导航" : "折叠导航"}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav items */}
        <ul
          role="list"
          style={{ listStyle: "none", margin: 0, padding: "8px 0", flex: 1, overflowY: "auto" }}
        >
          {NAV_ITEMS.map(({ path, label, icon, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname === path || location.pathname.startsWith(`${path}/`);

            return (
              <li key={path}>
                <NavLink
                  to={path}
                  end={exact}
                  aria-label={collapsed ? label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "10px 0" : "9px 16px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    margin: "1px 8px",
                    borderRadius: "var(--radius-sm)",
                    textDecoration: "none",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "var(--font-size-sm)",
                    color: isActive ? "var(--green)" : "var(--ink)",
                    background: isActive ? "var(--green-soft)" : "transparent",
                    transition: "background 0.1s, color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--paper-soft)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span aria-hidden style={{ fontSize: 15, flexShrink: 0, fontStyle: "normal" }}>
                    {icon}
                  </span>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Version badge */}
        {!collapsed && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--line)",
              fontSize: "var(--font-size-xs)",
              color: "var(--muted)",
            }}
          >
            V0.0.3 · Sprint 1
          </div>
        )}
      </nav>

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg)",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
