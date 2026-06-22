import { useCallback, useMemo, useState } from "react";
import { get, post, newIdempotencyKey } from "@/api/client";
import { useAsync } from "@/hooks/useAsync";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusTag, Tag } from "@/components/ui/StatusTag";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ConnectionProfileDto, DiscoveredConnectionDto } from "@/types/api";
import { AppearancePanel, BackupPanel, DataPanel, SecurityPanel, SystemPanel } from "./SystemPanels";

const TABS = ["Agent 集成", "系统", "数据", "备份", "安全", "外观"] as const;
const primaryButton = { padding: "8px 15px", borderRadius: "var(--radius-sm)", background: "var(--green)", color: "#fff", fontWeight: 600 } as const;
const secondaryButton = { padding: "7px 12px", borderRadius: "var(--radius-sm)", background: "var(--paper-soft)", border: "1px solid var(--line)", fontWeight: 500 } as const;

async function fetchProfiles(): Promise<ConnectionProfileDto[]> {
  return (await get<ConnectionProfileDto[]>("/connection-profiles")).data;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Agent 集成");
  const loadProfiles = useCallback(fetchProfiles, []);
  const { state, reload } = useAsync(loadProfiles, []);
  const [discoveries, setDiscoveries] = useState<DiscoveredConnectionDto[]>([]);
  const [selected, setSelected] = useState<DiscoveredConnectionDto | null>(null);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [disableTarget, setDisableTarget] = useState<ConnectionProfileDto | null>(null);

  const discover = async () => {
    setBusy(true); setActionError(null); setMessage(""); setSelected(null);
    try {
      const result = await post<DiscoveredConnectionDto[]>("/connection-profiles/discover", {});
      setDiscoveries(result.data);
      setMessage(result.data.length ? `发现 ${result.data.length} 个本机智能体` : "没有发现可用命令，可先安装或配置智能体 CLI");
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };

  const choose = (item: DiscoveredConnectionDto) => {
    setSelected(item); setName(item.label); setCapacity(1); setActionError(null); setMessage("");
  };

  const saveAndTest = async () => {
    if (!selected || !name.trim()) return;
    setBusy(true); setActionError(null); setMessage("");
    try {
      const created = await post<ConnectionProfileDto>("/connection-profiles", {
        templateId: selected.templateId, name: name.trim(), scope: "local",
        commandOrEndpoint: selected.commandOrEndpoint, concurrencyCapacity: capacity,
      }, { "Idempotency-Key": newIdempotencyKey() });
      const tested = await post<ConnectionProfileDto>(`/connection-profiles/${created.data.id}/test`, {});
      setMessage(tested.data.manageable ? `${tested.data.name} 已通过可管理性检查并保存` : `${tested.data.name} 已保存，但检查未通过`);
      setSelected(null); setDiscoveries([]); reload();
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };

  const retest = async (profile: ConnectionProfileDto) => {
    setBusy(true); setActionError(null); setMessage("");
    try {
      const result = await post<ConnectionProfileDto>(`/connection-profiles/${profile.id}/test`, {});
      setMessage(result.data.manageable ? `${profile.name} 检查通过` : `${profile.name} 当前不可管理`);
      reload();
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    setBusy(true); setActionError(null);
    try {
      await post<ConnectionProfileDto>(`/connection-profiles/${disableTarget.id}/disable`, { version: disableTarget.version, confirm: true });
      setMessage(`${disableTarget.name} 已禁用`); setDisableTarget(null); reload();
    } catch (error) { setActionError(error); }
    finally { setBusy(false); }
  };

  const columns = useMemo<Column<ConnectionProfileDto>[]>(() => [
    { key: "name", header: "连接", render: (row) => <div><strong>{row.name}</strong><div style={{ color: "var(--muted)", fontSize: "var(--font-size-xs)", marginTop: 3 }}>{row.templateId} · {row.versionLabel || "未检测版本"}</div></div> },
    { key: "status", header: "状态", width: 110, render: (row) => <StatusTag type="connection" status={row.status} /> },
    { key: "capacity", header: "并发", width: 90, render: (row) => `${row.activeSessions} / ${row.concurrencyCapacity}` },
    { key: "checked", header: "最近检查", width: 170, render: (row) => row.lastCheckAt ? new Date(row.lastCheckAt).toLocaleString("zh-CN") : "尚未检查" },
    { key: "actions", header: "操作", width: 170, render: (row) => <div style={{ display: "flex", gap: 8 }}><button style={secondaryButton} disabled={busy || row.status === "disabled"} onClick={(event) => { event.stopPropagation(); void retest(row); }}>重新检查</button><button style={{ ...secondaryButton, color: "var(--red)" }} disabled={busy || row.status === "disabled"} onClick={(event) => { event.stopPropagation(); setDisableTarget(row); }}>禁用</button></div> },
  ], [busy]);

  const profiles = state.status === "success" ? state.data : [];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1240 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div><h1 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>设置</h1><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>管理技术连接、数据和系统安全。连接不等于员工。</p></div>
        <Tag variant="info">V0.0.3 · ConnectionProfile</Tag>
      </div>
      <nav aria-label="设置分类" style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--line)" }}>
        {TABS.map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} style={{ padding: "9px 16px", color: activeTab === tab ? "var(--green)" : "var(--muted)", borderBottom: activeTab === tab ? "2px solid var(--green)" : "2px solid transparent" }}>{tab}</button>)}
      </nav>

      {activeTab === "系统" ? <SystemPanel /> : null}
      {activeTab === "数据" ? <DataPanel /> : null}
      {activeTab === "备份" ? <BackupPanel /> : null}
      {activeTab === "安全" ? <SecurityPanel /> : null}
      {activeTab === "外观" ? <AppearancePanel /> : null}
      {activeTab === "Agent 集成" ? (
        <div role="tabpanel" aria-label="Agent 集成" style={{ display: "grid", gap: 20 }}>
          <section style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}><div><h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>Agent 集成</h2><p style={{ margin: "6px 0 0", color: "var(--muted)" }}>只检查“连得上、可被管理”，不会创建员工或授予执行权限。</p></div><button style={primaryButton} disabled={busy} onClick={() => void discover()}>{busy ? "检查中…" : "发现本机智能体"}</button></div>
            {message ? <p role="status" style={{ margin: "14px 0 0", color: "var(--green)" }}>{message}</p> : null}
            {actionError ? <ErrorState error={actionError} onRetry={() => void discover()} /> : null}
          </section>

          {discoveries.length > 0 ? <section style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 20 }}><h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-md)" }}>发现结果</h2><div style={{ display: "grid", gap: 10 }}>{discoveries.map((item) => <div key={item.discoveryId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}><div><strong>{item.label}</strong><div style={{ color: "var(--muted)", marginTop: 4 }}>{item.commandOrEndpoint} · {item.versionLabel || "版本未知"}</div></div><button style={secondaryButton} onClick={() => choose(item)}>接入</button></div>)}</div></section> : null}

          {selected ? <section aria-label="连接配置" style={{ background: "var(--paper)", border: "1px solid var(--green)", borderRadius: "var(--radius-md)", padding: 20 }}><div style={{ display: "flex", gap: 8, marginBottom: 18 }}>{["选择位置", "选择类型", "检测连接", "可管理性", "连接测试", "命名保存"].map((step, index) => <Tag key={step} variant={index < 3 ? "success" : index === 3 ? "info" : "neutral"}>{index + 1}. {step}</Tag>)}</div><div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 140px", gap: 14 }}><label>连接名称<input aria-label="连接名称" value={name} onChange={(event) => setName(event.target.value)} style={{ width: "100%", marginTop: 6, padding: 9, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }} /></label><label>并发容量<input aria-label="并发容量" type="number" min={1} max={32} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} style={{ width: "100%", marginTop: 6, padding: 9, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }} /></label></div><p style={{ color: "var(--muted)" }}>命令入口：{selected.commandOrEndpoint}</p><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button style={secondaryButton} onClick={() => setSelected(null)}>取消</button><button style={primaryButton} disabled={busy || !name.trim()} onClick={() => void saveAndTest()}>{busy ? "测试中…" : "测试并保存"}</button></div></section> : null}

          <section style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 20 }}><h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-md)" }}>已保存连接</h2><DataTable columns={columns} rows={profiles} rowKey={(row) => row.id} loading={state.status === "loading" || state.status === "idle"} error={state.status === "error" ? state.error : undefined} onRetry={reload} emptyTitle="还没有技术连接" emptyDescription="点击“发现本机智能体”开始检测；系统不会自动创建员工。" /></section>
        </div>
      ) : null}

      <ConfirmDialog open={disableTarget !== null} title="禁用技术连接" description="禁用后，依赖此连接的员工将不能接收新任务，历史记录不会删除。" targetLabel={disableTarget?.name} confirmLabel="确认禁用" confirmVariant="danger" loading={busy} onCancel={() => setDisableTarget(null)} onConfirm={() => void confirmDisable()} />
    </div>
  );
}
