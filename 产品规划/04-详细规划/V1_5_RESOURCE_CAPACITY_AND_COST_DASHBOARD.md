# Nomos v1.5 资源、产能、成本与组合看板详细设计

> 状态：Draft for implementation
> 日期：2026-06-07
> 上游依赖：v1.3 工作项、v1.4 Agent 派发日志
> 下游承接：v1.6 知识/决策/模板治理，v2.0 Workflow 引擎准备度

## 1. 版本目标

v1.5 要把 Nomos 从“项目执行系统”推进到“可解释的经营看板”。当工作项和 Agent 派发已经沉淀后，用户需要知道：

- 哪些人、岗位、Agent 正在超载。
- 哪些项目在消耗最多资源。
- 哪些阶段、工作项或 Agent 带来最高成本和风险。
- 当前项目组合是否值得继续投入。
- 下一周或下一个迭代的产能缺口在哪里。

v1.5 的重点是指标口径、聚合查询、冲突提示和快照，而不是自动排班或财务结算。

## 2. 范围与非范围

### 2.1 本版范围

- 资源和执行者画像。
- 产能计划和容量占用。
- 工作项估算、实际耗时和成本记录。
- Agent 执行成本和失败成本。
- 项目组合健康看板。
- 资源冲突、超载、逾期、阻塞预测。
- 成本与 ROI 草算。
- 指标快照和口径说明。

### 2.2 本版不做

- 不做自动排班优化。
- 不做工资、税务、会计凭证等财务账务。
- 不做多人权限和云端协同。
- 不做复杂 BI 自定义建模。
- 不做跨公司 Benchmark。
- 不让成本指标自动决定项目停止或继续，必须由用户确认。

## 3. 角色场景

| 角色 | 场景 | 目标 |
|------|------|------|
| OPC 创业者 | 一屏查看多个项目本周资源和成本 | 判断今天该盯哪个项目、哪个 Agent、哪个风险 |
| 项目经理 | 看单项目是否延期、超成本、无人负责 | 找到阻塞工作项并改派 |
| 数字员工管理员 | 看 Agent 负载、失败率和成本 | 决定是否调整派发策略或切换 Agent |
| 流程 Owner | 对比不同流程模板的资源消耗 | 找到高成本阶段和低效模板 |
| 投资/经营视角用户 | 看项目组合 ROI 草算 | 判断投入是否合理 |

## 4. 核心指标口径

### 4.1 工作项口径

| 指标 | 公式 | 说明 |
|------|------|------|
| 工作项完成率 | `done / (total - cancelled)` | cancelled 不计入分母 |
| 工时完成率 | `doneEstimateHours / activeEstimateHours` | 未估算工作项进入 unknown |
| 阻塞率 | `blocked / active` | active 排除 done/cancelled |
| 逾期数 | `dueAt < now && status not in done/cancelled` | 按当前时间计算 |
| 返工次数 | `workItemEvents` 中 return/reopen 类事件计数 | v1.5 不要求复杂原因归因 |

### 4.2 资源口径

| 指标 | 公式 | 说明 |
|------|------|------|
| 计划容量 | `capacityPlans.capacityHours` | 员工/Agent/角色在周期内可用小时 |
| 已分配容量 | `sum(resourceAllocations.allocatedHours)` | 来自工作项估算或手工分配 |
| 利用率 | `allocated / capacity` | capacity 为 0 时返回 unknown |
| 超载小时 | `max(0, allocated - capacity)` | 仅提示，不自动排班 |
| 可用余量 | `capacity - allocated - reserved` | reserved 为保留容量 |

### 4.3 成本口径

| 指标 | 公式 | 说明 |
|------|------|------|
| 人工估算成本 | `hours * hourlyRate` | hourlyRate 可为空，空则 unknown |
| Agent 执行成本 | `costEntries` 或派发 metrics 汇总 | 支持 token、命令、固定单价 |
| 阻塞成本 | `blockedHours * hourlyRate` | 经营估算，不是财务账 |
| 返工成本 | 返工工作项实际/估算成本 | 缺实际值时用 estimate |
| 项目总成本 | 人工 + Agent + 外部成本 | unknown 单独展示 |
| ROI 草算 | `(expectedValue - estimatedCost) / estimatedCost` | expectedValue 由用户输入 |

## 5. 数据模型增量

### 5.1 `capacityPlans[]`

```js
capacityPlan: {
  id,
  scope: 'employee | agent | role | team',
  scopeId,
  period: 'week | month | custom',
  startDate,
  endDate,
  capacityHours,
  reservedHours,
  notes,
  createdAt,
  updatedAt
}
```

### 5.2 `resourceAllocations[]`

```js
resourceAllocation: {
  id,
  projectId,
  workItemId: null,
  assigneeType: 'employee | agent | role | unassigned',
  assigneeId: null,
  source: 'work_item_estimate | manual | dispatch | retrospective',
  allocatedHours,
  actualHours: null,
  status: 'planned | active | completed | cancelled',
  startDate: null,
  endDate: null,
  createdAt,
  updatedAt
}
```

### 5.3 `costEntries[]`

```js
costEntry: {
  id,
  projectId,
  workItemId: null,
  dispatchId: null,
  type: 'human_time | agent_usage | external_service | tooling | other',
  amount,
  currency: 'CNY',
  quantity: null,
  unit: 'hour | token | call | fixed | other',
  rate: null,
  source: 'estimate | actual | imported | manual',
  confidence: 'low | medium | high',
  occurredAt,
  createdAt,
  updatedAt
}
```

### 5.4 `dashboardSnapshots[]`

```js
dashboardSnapshot: {
  id,
  scope: 'global | project | portfolio | flow_template | resource',
  scopeId: null,
  metricVersion: 1,
  filters,
  metrics,
  generatedAt,
  generatedBy
}
```

### 5.5 `portfolioViews[]`

```js
portfolioView: {
  id,
  name,
  projectIds: [],
  filters,
  targetMetrics: {
    budget: null,
    expectedValue: null,
    targetDate: null
  },
  createdAt,
  updatedAt
}
```

## 6. API 与聚合查询

| API | 方法 | 用途 |
|-----|------|------|
| `/api/capacity-plans` | GET/POST | 查询和维护产能计划 |
| `/api/capacity-plans/:id` | PATCH/DELETE | 更新或删除产能计划 |
| `/api/resource-allocations` | GET/POST | 查询和维护资源分配 |
| `/api/cost-entries` | GET/POST | 查询和维护成本记录 |
| `/api/dashboards/resources` | GET | 资源负载看板 |
| `/api/dashboards/capacity` | GET | 产能和超载看板 |
| `/api/dashboards/costs` | GET | 成本看板 |
| `/api/dashboards/portfolio` | GET | 项目组合看板 |
| `/api/dashboard-snapshots` | POST | 固化当前指标快照 |
| `/api/dashboard-snapshots/:id` | GET | 查看历史快照 |

### 6.1 聚合查询原则

- 聚合 API 不直接修改业务数据。
- 指标中 unknown 必须显式返回，不能当作 0。
- 所有聚合返回 `metricDefinitions`，说明口径。
- 快照保存的是计算结果和口径版本，不是实时引用。
- 过滤器必须进入快照，保证复盘可解释。

### 6.2 资源看板返回示例

```js
{
  data: {
    range: { startDate, endDate },
    totals: {
      capacityHours,
      allocatedHours,
      overloadedHours,
      blockedWorkItems,
      overdueWorkItems
    },
    resources: [
      {
        assigneeType,
        assigneeId,
        name,
        capacityHours,
        allocatedHours,
        utilization,
        overloadedHours,
        workItemCounts,
        topRisks: []
      }
    ],
    metricDefinitions: []
  }
}
```

## 7. 资源冲突与产能预测

### 7.1 冲突类型

| 冲突 | 判断 |
|------|------|
| 超载 | 已分配小时超过计划容量 |
| 同期关键任务冲突 | 同一执行者多个 high/urgent 工作项截止时间重叠 |
| 角色缺口 | 工作项绑定角色但无员工或 Agent 可执行 |
| Agent 过载 | Agent 运行中派发超过阈值或失败率高 |
| 未估算风险 | high/urgent 工作项缺少 estimateHours |

### 7.2 预测口径

v1.5 只做轻量预测：

- 基于未来 7/14/30 天到期工作项计算需求。
- 基于 `capacityPlans` 计算供给。
- 基于历史完成小时估算偏差区间。
- 输出风险提示，不自动调整排期。

## 8. 项目组合视图

项目组合看板至少包含：

- 项目健康：green/yellow/red。
- 工作项完成率。
- 阶段进度。
- 阻塞项和逾期项。
- 已估算成本、已发生成本、unknown 成本。
- 资源超载风险。
- Agent 失败风险。
- 预期价值、成本、ROI 草算。

健康判断：

| 状态 | 条件 |
|------|------|
| red | 有 P0 阻塞、关键关口未过且逾期、成本超预算超过阈值 |
| yellow | 有逾期、资源超载、成本偏差或 Agent 失败偏高 |
| green | 无关键阻塞，进度和成本在阈值内 |

## 9. 成本与 ROI 视图

成本视图分三层：

1. 项目总览：按项目汇总成本和预期价值。
2. 阶段/工作项下钻：看成本集中在哪些阶段和工作项。
3. 执行者下钻：看员工、Agent、外部工具成本。

ROI 草算只用于经营判断：

- `expectedValue` 必须由用户输入或从项目字段读取。
- `estimatedCost` 来自成本记录和工时估算。
- unknown 成本必须单独展示。
- ROI 不自动触发项目终止。

## 10. 本地优先与隐私边界

- 成本、产能、单价默认只保存在本地。
- 不向 Agent 任务信封自动注入成本和薪资数据。
- 导出报表时默认脱敏个人 hourlyRate。
- 备份恢复必须包含 v1.5 数据。
- 系统诊断显示数量和完整性，不显示敏感金额明细。

## 11. UI 页面与交互

### 11.1 资源看板

布局：

- 顶部时间范围。
- 左侧资源列表。
- 中间容量/分配对比。
- 右侧风险和工作项列表。

操作：

- 调整周期。
- 新建产能计划。
- 给工作项补 estimateHours。
- 改派工作项。
- 生成快照。

### 11.2 成本看板

布局：

- 项目成本排行。
- 成本类型拆分。
- Agent 成本与失败成本。
- unknown 成本提示。

操作：

- 新增成本记录。
- 标记 estimate/actual。
- 导出 CSV。
- 保存快照。

### 11.3 项目组合看板

布局：

- 项目组合筛选。
- 健康状态矩阵。
- 风险 Top 列表。
- 资源瓶颈。
- 成本与 ROI 草算。

操作：

- 创建 portfolio view。
- 调整项目集合。
- 保存组合快照。
- 从风险项跳转到工作项、派发或成本记录。

## 12. 迁移策略

v1.4 v10 -> v1.5 v11：

- 新增 `capacityPlans: []`。
- 新增 `resourceAllocations: []`。
- 新增 `costEntries: []`。
- 新增 `dashboardSnapshots: []`。
- 新增 `portfolioViews: []`。
- 可从已有 `workItems.estimateHours` 生成虚拟聚合，不强制写入 allocation。
- 可从 `agentDispatches.metrics` 生成成本建议，但必须由用户确认后才成为 actual cost。

## 13. 验收标准

### P0

- unknown 成本或容量不得被当作 0。
- 资源聚合不得跨项目、跨执行者错算。
- 删除或取消工作项后，资源/成本看板不得崩溃。
- 成本敏感字段不得自动注入 Agent 信封。
- 快照必须保留当时口径和过滤器。

### P1

- 能为员工/Agent/角色配置周期容量。
- 能按工作项估算生成资源占用。
- 能识别超载、逾期、未估算和角色缺口。
- 能录入人工、Agent、外部服务成本。
- 项目组合看板能按健康状态排序。

### P2

- ROI 草算可先是简单公式。
- Agent 成本可先支持手工或估算导入。
- 产能预测可先只覆盖 7/14/30 天窗口。

## 14. 测试计划

- v10 数据迁移到 v11 后新增数组存在。
- capacity 为 0 时 utilization 返回 unknown。
- 10 个工作项按员工聚合，已完成/阻塞/逾期计数正确。
- 未估算 high 工作项进入风险列表。
- 成本记录按项目、类型、执行者汇总正确。
- dashboard snapshot 保存后，后续工作项变化不改变快照内容。
- 旧项目无 v1.5 数据时看板显示空态而非报错。
- 导出不包含被标记为敏感的 hourlyRate 明细。

## 15. 风险与后续演进

| 风险 | 应对 |
|------|------|
| 用户误把估算成本当财务账 | UI 和文档明确“经营估算” |
| 资源利用率因缺估算失真 | unknown 独立展示，提示补估算 |
| Agent 成本口径不统一 | 成本记录保留 source/confidence/unit |
| 自动排班诱惑太强 | v1.5 只提示冲突，不自动重排 |
| v2.0 需要节点级成本 | 通过 workItem/dispatch 关联为节点成本迁移做准备 |
