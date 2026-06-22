import { useCallback, useEffect, useState } from "react";
import { get, patch, post } from "@/api/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "@/components/ui/StatusTag";
import type { SkillDto } from "@/types/api";

const button: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, background: "var(--green)", color: "white", fontWeight: 600 };
const input: React.CSSProperties = { padding: "8px 10px", border: "1px solid var(--line-strong)", borderRadius: 8, background: "white" };

export function CapabilityPage() {
  const [skills, setSkills] = useState<SkillDto[]>([]); const [name, setName] = useState(""); const [category, setCategory] = useState<SkillDto["category"]>("position_specific");
  const [level, setLevel] = useState(2); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await get<SkillDto[]>("/skills"); setSkills(response.data); }, []);
  useEffect(() => { void load().catch((e: Error) => setMessage(e.message)); }, [load]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setMessage(""); try { await post<SkillDto>("/skills", { name, category, level, source: "manual" }); setName(""); await load(); setMessage("Skill 已创建"); } catch (e) { setMessage(e instanceof Error ? e.message : "创建失败"); } finally { setBusy(false); } };
  const deactivate = async (skill: SkillDto) => { setBusy(true); setMessage(""); try { await patch<SkillDto>(`/skills/${skill.id}`, { status: "inactive", version: skill.version }); await load(); setMessage(`${skill.name} 已停用`); } catch (e) { setMessage(e instanceof Error ? e.message : "停用失败"); } finally { setBusy(false); } };
  return <div style={{ padding: "28px 32px", overflow: "auto", height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}><div><h1 style={{ margin: 0, fontSize: 20 }}>能力池</h1><p style={{ color: "var(--muted)" }}>Skill 是岗位能力要求的可复用原子单元。</p></div><Tag variant="success">V0.0.3 · FE-201</Tag></div>
    <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px auto", gap: 10, background: "var(--paper)", padding: 16, borderRadius: 12, boxShadow: "var(--shadow-soft)" }}>
      <label>Skill 名称<input aria-label="Skill 名称" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, display: "block", width: "100%", marginTop: 6 }} /></label>
      <label>分类<select aria-label="Skill 分类" value={category} onChange={(e) => setCategory(e.target.value as SkillDto["category"])} style={{ ...input, display: "block", width: "100%", marginTop: 6 }}><option value="general">通用</option><option value="domain">领域</option><option value="position_specific">岗位专项</option></select></label>
      <label>等级<select aria-label="Skill 等级" value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ ...input, display: "block", width: "100%", marginTop: 6 }}>{[0,1,2,3,4].map((v) => <option key={v}>{v}</option>)}</select></label>
      <button disabled={busy} style={{ ...button, alignSelf: "end" }}>创建 Skill</button>
    </form>
    {message && <p role="status" style={{ color: message.includes("失败") || message.includes("引用") ? "var(--red)" : "var(--green)" }}>{message}</p>}
    {skills.length === 0 ? <EmptyState title="尚无 Skill" description="创建第一个 Skill 后，可将它关联到岗位。" /> : <div style={{ marginTop: 18, background: "var(--paper)", borderRadius: 12, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["名称","分类","等级","引用","状态","操作"].map((h) => <th key={h} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid var(--line)" }}>{h}</th>)}</tr></thead><tbody>{skills.map((skill) => <tr key={skill.id}><td style={{ padding: 12 }}>{skill.name}</td><td>{skill.category}</td><td>L{skill.level}</td><td>{skill.referenceCount}</td><td><Tag variant={skill.status === "active" ? "success" : "neutral"}>{skill.status === "active" ? "启用" : "停用"}</Tag></td><td><button disabled={busy || skill.status === "inactive"} onClick={() => void deactivate(skill)} style={{ color: "var(--red)" }}>停用</button></td></tr>)}</tbody></table></div>}
  </div>;
}
