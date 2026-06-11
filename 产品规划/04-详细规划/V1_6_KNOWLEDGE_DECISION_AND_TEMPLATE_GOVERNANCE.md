# Nomos v1.6 知识沉淀、决策复盘与模板治理详细设计

> 状态：Draft for implementation
> 日期：2026-06-07
> 上游依赖：v1.3 工作项，v1.4 派发，v1.5 资源/成本快照
> 下游承接：v2.0 Workflow 引擎升级

## 1. 版本目标

v1.6 是 v1.x 基础设施阶段的收口版本。它要把项目执行中产生的事实、经验、决策和模板变化沉淀为可复用的组织资产，让 v2.0 不是从一堆散乱项目数据里直接生成引擎，而是从已经治理过的流程知识中升级。

v1.6 要回答：

- 哪些关键决策影响了项目结果？
- 哪些工作项、回执、成本和关口证据值得沉淀为知识？
- 哪些流程模板已经可复用，哪些仍是草稿或应废弃？
- 模板每次变更为什么发生，对新项目有什么影响？
- 当前数据是否已经具备升级 v2.0 Workflow 引擎的条件？

## 2. 范围与非范围

### 2.1 本版范围

- 决策记录和决策复盘。
- 项目、阶段、Agent、成本、关口复盘。
- 知识资产库：SOP、样例、提示词、验收准则、失败案例。
- 知识资产与工作项、派发、成本、模板的关联。
- 模板版本治理：baseline、draft、active、deprecated。
- 模板变更记录和新项目适用规则。
- v2.0 准备度检查。
- 导入导出、脱敏、备份恢复。

### 2.2 本版不做

- 不做云端知识库。
- 不做企业级权限系统。
- 不做自动改写流程模板。
- 不做运行中流程实例自动升级。
- 不做全文向量检索服务；本地关键字和结构化筛选足够。
- 不做复杂审批流；本地用户确认即可。

## 3. 角色场景

| 角色 | 场景 | 目标 |
|------|------|------|
| OPC 创业者 | 复盘一个项目为什么延期 | 看到关键决策、阻塞、成本和 Agent 失败证据 |
| 流程 Owner | 把成功项目的做法固化到 LTC 模板 | 创建模板版本和变更摘要，只影响新项目 |
| 数字员工管理员 | 从失败派发中提炼 Agent 使用边界 | 形成知识资产并更新派发策略建议 |
| 项目经理 | 查找类似项目的验收准则和 SOP | 能按流程、阶段、Skill、工作项搜索知识 |
| v2.0 架构负责人 | 判断哪些流程能升级为 L2-L5 引擎 | 查看准备度报告和缺口列表 |

## 4. 核心概念

| 概念 | 定义 |
|------|------|
| 决策记录 | 对关键取舍、方案选择、关口结论的结构化记录 |
| 复盘记录 | 对项目、阶段、Agent、成本、模板的总结和行动项 |
| 知识资产 | 可复用材料，包括 SOP、样例、提示词、验收准则、失败案例 |
| 模板版本 | 流程模板在某一时点的可复用基线 |
| 模板治理状态 | draft、active、deprecated 等生命周期 |
| 准备度检查 | 判断流程是否具备升级 v2.0 的数据和结构 |

## 5. 数据模型增量

### 5.1 `decisionRecords[]`

```js
decisionRecord: {
  id,
  projectId: null,
  flowTemplateId: null,
  flowInstanceId: null,
  workItemId: null,
  title,
  decisionType: 'scope | architecture | process | resource | cost | quality | release | other',
  context,
  options: [
    { title, pros: [], cons: [], estimatedCost: null, risk: '' }
  ],
  selectedOption,
  rationale,
  evidenceRefs: [],
  decidedBy,
  decidedAt,
  impact: {
    projectIds: [],
    templateIds: [],
    costImpact: null,
    scheduleImpact: null
  },
  reviewStatus: 'open | validated | invalidated | superseded',
  createdAt,
  updatedAt
}
```

### 5.2 `knowledgeAssets[]`

```js
knowledgeAsset: {
  id,
  title,
  type: 'sop | example | prompt | checklist | acceptance_criteria | failure_case | best_practice | note',
  summary,
  body,
  tags: [],
  skillIds: [],
  roleIds: [],
  flowTemplateIds: [],
  flowStageIds: [],
  workItemIds: [],
  dispatchIds: [],
  decisionRecordIds: [],
  source: 'manual | retrospective | dispatch_receipt | template_change | imported',
  sensitivity: 'public_local | internal | sensitive',
  status: 'draft | active | archived',
  createdAt,
  updatedAt
}
```

### 5.3 `retrospectives[]`

```js
retrospective: {
  id,
  scope: 'project | stage | work_item | agent | template | portfolio',
  scopeId,
  projectId: null,
  summary,
  outcomes: [],
  issues: [],
  rootCauses: [],
  lessons: [],
  actionItems: [
    {
      id,
      title,
      targetType: 'work_item | knowledge_asset | template_change | dispatch_policy | capacity_plan',
      targetId: null,
      status: 'open | in_progress | done | dismissed'
    }
  ],
  linkedDecisionRecordIds: [],
  linkedKnowledgeAssetIds: [],
  metricsSnapshotId: null,
  createdAt,
  updatedAt
}
```

### 5.4 `templateVersions[]`

```js
templateVersion: {
  id,
  flowTemplateId,
  versionLabel,
  status: 'draft | active | deprecated | archived',
  baselineSnapshot,
  changeSummary,
  changeReason,
  decisionRecordIds: [],
  knowledgeAssetIds: [],
  retrospectiveIds: [],
  migrationNotes,
  appliesTo: 'new_instances_only | manual_upgrade',
  createdBy,
  createdAt,
  activatedAt: null,
  deprecatedAt: null
}
```

### 5.5 `governanceChecks[]`

```js
governanceCheck: {
  id,
  scope: 'flow_template | project | v2_readiness',
  scopeId,
  severity: 'info | warning | blocking',
  type,
  title,
  description,
  evidenceRefs: [],
  status: 'open | resolved | dismissed',
  resolution: '',
  createdAt,
  updatedAt
}
```

## 6. API、搜索与关联设计

| API | 方法 | 用途 |
|-----|------|------|
| `/api/decision-records` | GET/POST | 查询和创建决策记录 |
| `/api/decision-records/:id` | GET/PATCH | 查看和更新决策记录 |
| `/api/knowledge-assets` | GET/POST | 查询和创建知识资产 |
| `/api/knowledge-assets/:id` | GET/PATCH | 查看和更新知识资产 |
| `/api/retrospectives` | GET/POST | 查询和创建复盘 |
| `/api/template-versions` | GET/POST | 查询和创建模板版本 |
| `/api/template-versions/:id/activate` | POST | 激活模板版本 |
| `/api/governance/v2-readiness` | GET | 生成 v2.0 准备度报告 |
| `/api/knowledge/export` | POST | 导出知识资产 |
| `/api/knowledge/import` | POST | 导入知识资产 |

### 6.1 搜索能力

v1.6 使用本地结构化搜索：

- `search`：标题、摘要、正文关键字。
- `type`：知识类型。
- `skillId`、`roleId`、`flowTemplateId`、`flowStageId`。
- `source`、`sensitivity`、`status`。
- `decisionType`、`reviewStatus`。

不做向量检索，但数据模型保留未来字段：

```js
embeddingRef: null
```

### 6.2 关联规则

- 知识资产可以关联多个流程模板、阶段、Skill、角色、工作项和派发记录。
- 决策记录必须至少有一个上下文：项目、流程模板、工作项或通用决策。
- 模板版本激活时必须关联变更摘要；重大变更建议关联决策记录。
- 复盘行动项可以转成 v1.3 工作项。

## 7. 模板版本治理

### 7.1 生命周期

```text
draft -> active -> deprecated -> archived
```

规则：

- 一个流程模板同一时间只能有一个 active 版本。
- draft 可编辑，active 需要生成新版本再变更。
- deprecated 不推荐新建项目，但历史项目可继续打开。
- archived 只读。
- 模板版本只影响新建实例，运行中实例不自动升级。

### 7.2 变更类型

| 类型 | 例子 | 是否需要决策记录 |
|------|------|------------------|
| minor | 文案、描述、标签 | 可选 |
| normal | 增加默认工作项、调整角色建议 | 建议 |
| major | 增删阶段、改变关口标准、影响 Agent 策略 | 必须 |

### 7.3 模板升级建议

系统可根据复盘和知识资产生成建议：

- 增加默认工作项。
- 补充验收准则。
- 增加失败案例。
- 调整派发策略。
- 标记某阶段为需要人工复核。

但系统不得自动应用建议，必须由用户创建模板版本并确认。

## 8. 流程复盘和最佳实践库

### 8.1 复盘来源

- 工作项完成率和返工事件。
- Agent 派发成功率、失败原因、复核结论。
- v1.5 成本和产能快照。
- 关口评审结果。
- 项目发布或验收结论。

### 8.2 复盘输出

- 事实摘要。
- 关键问题。
- 根因假设。
- 可复用经验。
- 行动项。
- 建议创建的知识资产。
- 建议创建的模板变更。

### 8.3 最佳实践库

知识资产中的 `best_practice` 和 `sop` 可以进入最佳实践库。进入条件：

- 状态为 active。
- 至少关联一个流程模板或 Skill。
- 通过一次复盘或决策验证。

## 9. 知识权限与脱敏

v1.6 仍是本地单机产品，权限采用软约束：

- `public_local`：可进入普通导出。
- `internal`：导出时默认包含，但有提示。
- `sensitive`：导出时默认排除，需显式确认。

脱敏规则：

- 不导出 Adapter token。
- 不导出本地绝对路径，除非用户选择原样导出。
- 成本和 hourlyRate 默认汇总，不导出个人明细。
- 派发回执中的密钥、cookie、token 样式字段需要扫描提示。

## 10. 本地优先、导入导出与备份

- 所有 v1.6 数据进入 `nomos-data.json`。
- 备份 inspect 显示知识资产数、决策记录数、模板版本数。
- 导出可以按知识资产、模板版本或 v2.0 准备度报告输出 Markdown/JSON。
- 导入时默认创建 draft，不直接覆盖 active 知识或模板版本。
- 同 ID 导入冲突时生成新 ID，并保留 `importedFrom`。

## 11. UI 页面与交互

### 11.1 知识中心

能力：

- 列表、搜索、标签、类型筛选。
- 资产详情、关联对象、来源证据。
- 从工作项回执一键沉淀为知识资产。
- 导入/导出。

### 11.2 决策台账

能力：

- 创建决策记录。
- 记录备选方案和取舍理由。
- 关联证据和影响范围。
- 后续验证：validated/invalidated/superseded。

### 11.3 复盘中心

能力：

- 选择项目/阶段/Agent/模板生成复盘。
- 引用 v1.5 快照。
- 创建行动项。
- 行动项转工作项或知识资产。

### 11.4 模板治理

能力：

- 查看模板版本。
- 创建新 draft 版本。
- 记录变更摘要和原因。
- 激活版本。
- 废弃旧版本。
- 查看新建项目默认使用哪个版本。

### 11.5 v2.0 准备度报告

检查：

- 是否有 active 模板版本。
- 是否有足够阶段和关口。
- 是否有默认工作项和依赖。
- 是否绑定岗位、Skill、Agent 派发策略。
- 是否有执行样本、成本样本、复盘样本。
- 是否存在阻断治理项。

## 12. 迁移策略

v1.5 v11 -> v1.6 v12：

- 新增 `decisionRecords: []`。
- 新增 `knowledgeAssets: []`。
- 新增 `retrospectives: []`。
- 新增 `templateVersions: []`。
- 新增 `governanceChecks: []`。
- 对已有 `flowTemplates[]` 生成 baseline `templateVersions[]`：
  - `versionLabel = "baseline-v1.6"`。
  - `status = active`。
  - `appliesTo = new_instances_only`。
- 不修改运行中 `flowInstances[]`。

## 13. 验收标准

### P0

- 激活模板版本不得静默改变运行中实例。
- sensitive 知识资产不得默认导出。
- 模板 major 变更必须有变更摘要和确认。
- v2.0 准备度报告不得把缺失关键数据误判为通过。
- 导入知识资产不得覆盖 active 本地资产。

### P1

- 能从工作项回执创建知识资产。
- 能创建决策记录并关联项目/模板/工作项。
- 能生成项目复盘并创建行动项。
- 能创建、激活、废弃模板版本。
- 能输出 v2.0 准备度缺口列表。

### P2

- 搜索可以先是关键字和结构化筛选。
- 最佳实践评分可以先由人工标记。
- 模板 diff 可以先用变更摘要，不要求可视化逐字段 diff。

## 14. 测试计划

- v11 数据迁移到 v12 后新增数组存在。
- 已有 flowTemplates 自动生成 baseline templateVersion。
- 激活新模板版本后，新建项目使用新版本，旧实例不变。
- sensitive 知识资产默认导出被排除。
- 决策记录缺上下文返回 400。
- 复盘行动项可转成工作项并保留来源。
- v2.0 准备度在缺工作项、缺派发策略、缺复盘样本时返回 warning/blocking。
- 导入同 ID 知识资产生成新 ID，不覆盖本地 active。

## 15. 风险与后续演进

| 风险 | 应对 |
|------|------|
| 知识库变成杂物箱 | 强制类型、来源、关联对象和状态 |
| 模板版本和运行实例混淆 | active 只影响新建实例，升级运行中实例另做动作 |
| 决策记录没人维护 | 从关口、复盘、模板 major 变更处提供快捷入口 |
| 导出泄露敏感信息 | sensitivity、脱敏扫描、默认排除敏感项 |
| v2.0 准备度过于主观 | 检查项用结构化数据和证据引用驱动 |
