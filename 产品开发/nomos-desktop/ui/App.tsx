import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const ConsolePage = lazy(() => import("@/pages/console/ConsolePage").then((m) => ({ default: m.ConsolePage })));
const OrganizationPage = lazy(() => import("@/pages/organization/OrganizationPage").then((m) => ({ default: m.OrganizationPage })));
const CapabilityPage = lazy(() => import("@/pages/capability/CapabilityPage").then((m) => ({ default: m.CapabilityPage })));
const FlowPage = lazy(() => import("@/pages/flow/FlowPage").then((m) => ({ default: m.FlowPage })));
const DispatchPage = lazy(() => import("@/pages/dispatch/DispatchPage").then((m) => ({ default: m.DispatchPage })));
const ProjectPage = lazy(() => import("@/pages/project/ProjectPage").then((m) => ({ default: m.ProjectPage })));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

export function App() {
  return (
    <AppShell>
      <ErrorBoundary>
      <Suspense fallback={<LoadingState label="页面加载中…" />}>
        <Routes>
          <Route path="/" element={<ConsolePage />} />
          <Route path="/organization/*" element={<OrganizationPage />} />
          <Route path="/capability/*" element={<CapabilityPage />} />
          <Route path="/flow/*" element={<FlowPage />} />
          <Route path="/dispatch/*" element={<DispatchPage />} />
          <Route path="/project/*" element={<ProjectPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
