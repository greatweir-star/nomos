import { useCallback, useEffect, useMemo, useState } from "react";
import { get, post } from "@/api/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "@/components/ui/StatusTag";
import type { FlowDefinitionDto, FlowVersionDto, PositionDto } from "@/types/api";

const STAGES = [
  { key: "clarify", name: "需求澄清", goal: "消除需求歧义并冻结范围", output: "需求澄清记录", criterion: "范围、目标和非范围明确" },
  { key: "product", name: "产品设计", goal: "形成可验证的产品方案", output: "产品设计", criterion: "用户旅程和验收标准完整" },
  { key: "architecture", name: "技术方案", goal: "冻结架构、接口和数据设计", output: "技术方案", criterion: "关键技术风险已有处理方案" },
  { key: "development", name: "开发实现", goal: "按合同完成前后端实现", output: "可运行构建", criterion: "类型检查与开发自测通过" },
  { key: "review", name: "代码评审", goal: "识别正确性、安全和维护性问题", output: "评审记录", criterion: "阻断级评审意见已关闭" },
  { key: "testing", name: "测试验证", goal: "执行功能、异常和回归验证", output: "测试报告", criterion: "P0/P1 缺陷为零" },
  { key: "release", name: "发布验收", goal: "核对发布门禁并形成结论", output: "发布结论", criterion: "发布门禁全部通过" },
] as const;
const button: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, background: "var(--green)", color: "white", fontWeight: 600 };
const select: React.CSSProperties = { width: "100%", padding: "7px 9px", border: "1px solid var(--line-strong)", borderRadius: 7, background: "white" };

export function FlowPage() {
  const [flows, setFlows] = useState<FlowDefinitionDto[]>([]); const [positions, setPositions] = useState<PositionDto[]>([]); const [mapping, setMapping] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const load = useCallback(async () => { const [flowResult, positionResult] = await Promise.all([get<FlowDefinitionDto[]>("/flows"), get<PositionDto[]>("/positions")]); setFlows(flowResult.data); setPositions(positionResult.data.filter((p) => p.status === "active")); setMapping((current) => { if (Object.keys(current).length || !positionResult.data[0]) return current; return Object.fromEntries(STAGES.map((stage) => [stage.key, positionResult.data[0].id])); }); }, []);
  useEffect(() => { void load().catch((e: Error) => setMessage(e.message)); }, [load]);
  const completeMapping = useMemo(() => STAGES.every((stage) => Boolean(mapping[stage.key])), [mapping]);
  const importGolden = async () => { setBusy(true); setMessage(""); try {
    const flow = await post<{id:string}>("/flows", { name: "软件需求到交付", description: "Nomos V0.0.3 黄金流程；由用户主动导入" });
    const nodes = STAGES.map((stage) => ({ key: stage.key, name: stage.name, goal: stage.goal, inputs: stage.key === "clarify" ? ["原始需求"] : ["上游交付物"], outputs: [stage.output], positionSlots: [{ name: `${stage.name}负责人`, requiredPositionId: mapping[stage.key], executionType: "silicon", routingStrategy: "auto", fixedEmployeeId: null }], acceptance: { required: true, reviewerPositionId: mapping[stage.key], criteria: [stage.criterion] }, failurePolicy: { maxAttempts: 2, reworkNodeKey: null } }));
    const edges = STAGES.slice(0,-1).map((stage,index) => ({ fromNodeKey: stage.key, toNodeKey: STAGES[index+1].key, condition: null }));
    const version = await post<FlowVersionDto>(`/flows/${flow.data.id}/versions`, { versionLabel: "1.0.0", nodes, edges });
    const checked = await post<{valid:boolean;issues:unknown[]}>(`/flows/${flow.data.id}/versions/${version.data.id}/validate`, {}); if (!checked.data.valid) throw new Error("黄金流程未通过发布校验");
    await post<FlowVersionDto>(`/flows/${flow.data.id}/versions/${version.data.id}/publish`, {}); await load(); setMessage("黄金流程 1.0.0 已校验并发布");
  } catch (e) { setMessage(e instanceof Error ? e.message : "流程发布失败"); } finally { setBusy(false); } };
  return <div style={{ padding: "28px 32px", overflow: "auto", height: "100%" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><h1 style={{ margin: 0, fontSize: 20 }}>流程</h1><p style={{ color: "var(--muted)" }}>流程按岗位槽位组织工作；发布版本不可修改，项目启动后使用独立快照。</p></div><Tag variant="success">V0.0.3 · FE-301/302</Tag></div>
    {message ? <p role="status" style={{ padding: 10, background: "var(--green-soft)", borderRadius: 8 }}>{message}</p> : null}
    <section style={{ background: "var(--paper)", padding: 18, borderRadius: 12, marginBottom: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 style={{ margin: 0, fontSize: 16 }}>导入软件交付黄金流程</h2><p style={{ color: "var(--muted)" }}>为七个阶段指定负责岗位后，系统将创建、校验并发布 1.0.0。</p></div><button disabled={busy || !completeMapping || flows.some((f) => f.name === "软件需求到交付")} onClick={() => void importGolden()} style={button}>{busy ? "正在发布…" : "校验并发布"}</button></div>
      {positions.length === 0 ? <p style={{ color: "var(--amber)" }}>请先在组织中创建至少一个启用岗位。</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>{STAGES.map((stage,index) => <label key={stage.key} style={{ padding: 10, background: "var(--paper-soft)", borderRadius: 8 }}><span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{index+1}. {stage.name}</span><select aria-label={`${stage.name}岗位`} value={mapping[stage.key] || ""} onChange={(e) => setMapping((m) => ({...m,[stage.key]:e.target.value}))} style={select}><option value="">请选择岗位</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}</div>}
    </section>
    {flows.length === 0 ? <EmptyState title="尚无流程" description="完成岗位映射并主动导入第一条黄金流程。" /> : <div style={{ display: "grid", gap: 12 }}>{flows.map((flow) => <article key={flow.id} style={{ background: "var(--paper)", padding: 18, borderRadius: 12 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><strong>{flow.name}</strong><p style={{ color: "var(--muted)", margin: "5px 0" }}>{flow.description}</p></div><Tag variant={flow.status === "published" ? "success" : "draft"}>{flow.status === "published" ? "已发布" : "草稿"}</Tag></div>{flow.versions.map((version) => <div key={version.id} style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}><b>版本 {version.versionLabel}</b> · {version.nodes.length} 个节点 · {version.edges.length} 条依赖<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>{version.nodes.map((node,index) => <span key={node.id} style={{ padding: "5px 9px", background: "var(--green-soft)", borderRadius: 99 }}>{index+1}. {node.name}</span>)}</div></div>)}</article>)}</div>}
  </div>;
}
