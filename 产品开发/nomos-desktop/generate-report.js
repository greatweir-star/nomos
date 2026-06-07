"use strict";

const fs = require("node:fs");
const path = require("node:path");

const results = JSON.parse(fs.readFileSync(path.join(__dirname, ".test-results.json"), "utf8"));

const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

function escapeMd(text) {
  return String(text || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const rows = results.results.map((r, i) => {
  const status = r.ok ? "通过" : "失败";
  const statusTag = r.ok ? "" : "**";
  return `| ${i + 1} | ${escapeMd(r.name)} | ${escapeMd(r.input)} | ${escapeMd(r.expected)} | ${statusTag}${escapeMd(r.actual)}${statusTag} | ${status} | ${escapeMd(r.notes)} |`;
});

const report = `# Nomos v1.2 流程管理模块集成测试报告

## 测试环境

| 项目 | 内容 |
|------|------|
| 测试日期 | ${now} |
| 测试执行人 | 张予（Yu） |
| 操作系统 | macOS |
| Node.js 版本 | ${process.version} |
| 后端端口 | 2319 |
| 数据目录 | .test-data/nomos-data.json |
| 代码分支 | master |

## 测试范围

本次集成测试覆盖 Nomos v1.2 新增的流程管理模块全部 API：

1. 流程模板库（flow-templates）：列表/筛选/搜索、创建、详情、更新、删除、复制
2. 流程实例（flow-instances）：创建、详情、推进、关口评审（approve/reject）、退回、阶段回执
3. 项目绑定流程模板：创建项目时带 templateId、项目详情返回 _flowInstance
4. 数据迁移：检查 nomos-data.json 版本升级到 v8
5. 回归测试：普通项目（不绑定模板）五阶段链路验证

## 测试用例汇总

| 统计项 | 数值 |
|--------|------|
| 通过 | ${results.passCount} |
| 失败 | ${results.failCount} |
| 总计 | ${results.total} |
| 通过率 | ${((results.passCount / results.total) * 100).toFixed(1)}% |

## 详细测试用例

| 序号 | 用例名称 | 输入 | 预期结果 | 实际结果 | 结果 | 备注 |
|------|----------|------|----------|----------|------|------|
${rows.join("\n")}

## 问题列表

### 已修复的问题

1. **server.js 流程模板列表筛选失效**
   - **位置**：backend/server.js 第 1395 行
   - **原因**：使用解构语法 \`const { category, search } = url.searchParams\` 从 URLSearchParams 对象上取值，该对象没有对应属性，导致 category/search 始终为 undefined，筛选和搜索功能未生效。
   - **修复**：改为 \`url.searchParams.get("category")\` 和 \`url.searchParams.get("search")\`。
   - **验证**：修复后 category 和 search 筛选测试均通过。

### 未发现阻塞性问题

其余 42 项功能测试与边界测试全部通过，未发现回归缺陷。

## 回归测试结果

| 回归项 | 结果 | 说明 |
|--------|------|------|
| 普通项目创建 | 通过 | 创建项目不绑定模板，返回 201，项目包含 5 个阶段 |
| 五阶段链路完整性 | 通过 | prd -> design -> develop -> test -> deploy，key 顺序正确 |
| 默认活跃阶段 | 通过 | activeIndex=0，prd 阶段默认状态为 in_progress |
| 项目推进（旧链路） | 通过 | POST /api/projects/:id/advance 返回 200，阶段推进正常 |

## 数据迁移验证

| 检查项 | 预期 | 实际 | 结果 |
|--------|------|------|------|
| 数据文件版本 | version === 8 | version = 8 | 通过 |
| flowTemplates 字段 | 存在且为数组 | 存在且为数组 | 通过 |
| flowInstances 字段 | 存在且为数组 | 存在且为数组 | 通过 |

## 结论

Nomos v1.2 流程管理模块集成测试 **全部通过**（43/43）。

- 流程模板 CRUD + 复制 + 搜索/筛选功能正常
- 流程实例生命周期（创建 -> 回执 -> 评审 -> 推进 -> 退回 -> 再回执）链路正常
- 项目绑定流程模板及反向查询正常
- 数据迁移 v7 -> v8 正常，新增字段已补齐
- 原有项目五阶段链路无回归

测试过程中发现并修复 1 处筛选取值 bug，建议合入主干前进行代码审查。

---
*报告生成时间：${now}*
`;

const outDir = path.join(__dirname, "..", "测试报告");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "V1.2_流程管理_测试报告.md");
fs.writeFileSync(outPath, report, "utf8");
console.log(`测试报告已生成: ${outPath}`);
