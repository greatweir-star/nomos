# Nomos v1.4 智能体任务调度与协作执行详细设计

> 状态：Draft for implementation
> 日期：2026-06-07
> 上游依赖：v1.3 `workItems[]`、`workItemEvents[]`
> 下游承接：v1.5 资源/产能/成本看板，v2.0 硅节点与碳硅节点调度

## 1. 版本目标

v1.4 要把 Agent 从“项目或阶段旁边的工具调用”升级为“围绕工作项的受控执行者”。系统需要知道：

- 哪个工作项被派发给了哪个 Agent。
- 派发时携带了什么上下文、验收标准和输入材料。
- 派发是由谁确认的，是否可重复，是否已取消或重试。
- Agent 返回了什么结构化结果，是否需要人工复核。
- 多个 Agent 之间是否发生过复核、交接或仲裁。

v1.4 仍然不是 Workflow 引擎。它不做自动抢单、不做动态编排、不让 Agent 自主决定下一步流程。所有执行仍以工作项为边界，以人工确认、策略约束和事件账本为核心。

## 2. 范围与非范围

### 2.1 本版范围

- 工作项级派发预览。
- 工作项级派发确认、取消、重试。
- Agent 推荐和派发策略。
- 任务信封 v2。
- 结构化回执 v2。
- Agent 健康状态。
- 多 Agent 协作记录：主执行、复核、交接、仲裁。
- 派发事件写入 `workItemEvents[]`。
- 派发队列和工作项状态联动。
- 安全确认、Adapter 脱敏、工作目录边界。

### 2.2 本版不做

- 不做 Agent 自主选择任务。
- 不做跨项目自动调度。
- 不做完整 DAG 编排。
- 不做模型训练、微调或知识库检索引擎。
- 不做 v2.0 的 L5 硅节点自动运行。
- 不替换现有 Alice、Claude Code、Codex CLI 接入，只增强派发上下文和记录。

## 3. 目标用户和关键场景

| 用户 | 场景 | 成功标准 |
|------|------|----------|
| OPC 创业者 | 将“生成竞品分析”工作项派发给 Alice | 派发前能看到上下文预览，确认后工作项进入执行中 |
| 项目经理 | 将同一工作项先给 Agent 产出草稿，再给人工复核 | 系统记录 Agent 预审和人工终审，不混成一个完成状态 |
| 数字员工管理员 | 配置“方案设计 + prompt-engineering skill”默认交给 Claude Code | 派发推荐可解释，用户可覆盖 |
| 质量负责人 | 查看某个 Agent 失败率和回执质量 | 能从派发记录跳到工作项、回执、错误和复核结论 |

## 4. 核心概念

| 概念 | 定义 |
|------|------|
| 工作项 | v1.3 引入的执行颗粒，v1.4 的唯一派发入口 |
| 派发预览 | 根据工作项和策略生成任务信封，但尚未执行 |
| 派发确认 | 用户显式确认执行，生成不可否认的派发事实 |
| 任务信封 v2 | 给 Agent 的结构化上下文包 |
| 结构化回执 v2 | Agent 返回的状态、产物、问题、建议和复核需求 |
| 派发策略 | 角色、Skill、流程阶段到 Agent/Adapter 的推荐规则 |
| 协作记录 | 多 Agent 或人机之间的复核、交接、仲裁记录 |
| 幂等键 | 阻止重复点击、重复回调或旧 attempt 覆盖新 attempt 的唯一键 |

## 5. 数据模型增量

### 5.1 `dispatchPolicies[]`

```js
dispatchPolicy: {
  id,
  name,
  enabled,
  priority,
  roleId,
  skillIds: [],
  flowTemplateId: null,
  flowStageId: null,
  workItemSourceType: null,
  preferredAgentId,
  fallbackAgentIds: [],
  requireHumanConfirm: true,
  requireHumanReview: false,
  maxRetries: 1,
  createdAt,
  updatedAt
}
```

规则：

- 多条策略命中时按 `priority` 降序选择。
- `requireHumanConfirm` 默认 `true`。
- 不可用 Agent 不进入推荐结果，只作为降级原因显示。
- 策略缺失时系统仍允许手动选择 Agent，但必须确认。

### 5.2 `agentDispatches[]`

```js
agentDispatch: {
  id,
  projectId,
  workItemId,
  flowInstanceId: null,
  flowStageId: null,
  policyId: null,
  agentId,
  adapterId,
  employeeId: null,
  attempt: 1,
  status: 'previewed | queued | running | succeeded | failed | cancelled | review_required',
  envelopeVersion: 2,
  envelope,
  confirmation: {
    required: true,
    confirmedBy: null,
    confirmedAt: null,
    tokenHash: null
  },
  receipt: null,
  error: null,
  idempotencyKey,
  externalExecutionId: null,
  startedAt: null,
  completedAt: null,
  createdAt,
  updatedAt
}
```

约束：

- 同一 `workItemId + agentId + attempt` 只能有一个进行中派发。
- `tokenHash` 不得出现在列表接口和前端日志中。
- 失败重试必须 `attempt + 1`，不能覆盖旧派发的错误和回执。
- 已取消派发收到迟到回执时，只记录为 ignored receipt，不改变工作项状态。

### 5.3 `agentHealth[]`

```js
agentHealth: {
  agentId,
  adapterId,
  status: 'available | degraded | unavailable | unknown',
  lastCheckedAt,
  lastSuccessAt: null,
  lastFailureAt: null,
  recentFailureReason: '',
  runningDispatchCount: 0,
  successCount7d: 0,
  failureCount7d: 0
}
```

### 5.4 `workItemEvents[]` 新事件

| 事件 | 说明 |
|------|------|
| `dispatch.previewed` | 生成派发预览 |
| `dispatch.confirmed` | 用户确认派发 |
| `dispatch.started` | 执行开始 |
| `dispatch.cancelled` | 用户取消 |
| `dispatch.failed` | 执行失败 |
| `dispatch.retry_requested` | 发起重试 |
| `dispatch.receipt_submitted` | 收到 Agent 回执 |
| `dispatch.review_required` | 需要人工复核 |
| `collaboration.handoff` | 一个 Agent 将上下文交给另一个执行者 |
| `collaboration.reviewed` | 复核者给出结论 |
| `collaboration.arbitrated` | 多方结论冲突后人工仲裁 |

## 6. API 设计

| API | 方法 | 用途 |
|-----|------|------|
| `/api/work-items/:id/dispatch/preview` | POST | 基于工作项生成派发预览 |
| `/api/work-item-dispatches/:id/confirm` | POST | 确认派发并进入队列 |
| `/api/work-item-dispatches/:id/cancel` | POST | 取消尚未完成的派发 |
| `/api/work-item-dispatches/:id/retry` | POST | 基于失败派发创建下一次 attempt |
| `/api/work-item-dispatches/:id/receipt` | POST | 提交或同步结构化回执 |
| `/api/work-item-dispatches` | GET | 查询派发队列和历史 |
| `/api/dispatch-policies` | GET/POST | 查询和创建派发策略 |
| `/api/dispatch-policies/:id` | PATCH/DELETE | 更新和停用派发策略 |
| `/api/agent-health` | GET | 查询 Agent 健康状态 |

### 6.1 派发预览

入参：

```js
{
  agentId: 'alice',
  adapterId: 'mcp',
  policyId: null,
  mode: 'execute | review | handoff',
  inputRefs: [],
  note: ''
}
```

返回：

```js
{
  data: {
    dispatchId,
    recommendedAgent,
    alternatives,
    envelope,
    warnings,
    confirmationRequired: true
  }
}
```

预览不得启动执行。预览只生成可审阅的任务信封，并写入 `dispatch.previewed`。

### 6.2 派发确认

入参：

```js
{
  confirm: true,
  confirmationToken,
  idempotencyKey
}
```

成功后：

- `agentDispatch.status = queued` 或 `running`。
- `workItem.status = in_progress`。
- 写入 `dispatch.confirmed` 和 `status.changed`。
- 如果已有进行中派发，返回 409，并带出已有 dispatch。

### 6.3 回执提交

回执结构：

```js
{
  status: 'completed | failed | blocked | partial | review_required',
  summary,
  outputRefs: [],
  artifactRefs: [],
  blocker: '',
  confidence: 0.0,
  recommendedNextAction: 'mark_done | request_review | retry | handoff | block',
  reviewNotes: '',
  metrics: {
    durationMs: null,
    tokenUsage: null,
    commandCount: null
  }
}
```

联动规则：

- `completed + mark_done`：工作项进入 `review_pending` 或 `done`，取决于工作项是否需要人工验收。
- `failed`：派发失败，工作项进入 `blocked` 或保持 `in_progress` 并显示重试。
- `blocked`：工作项进入 `blocked`，必须记录原因。
- `review_required`：工作项进入 `review_pending`，并创建人工复核记录。

## 7. 调度状态机

```text
previewed
  -> queued
    -> running
      -> succeeded
      -> failed
      -> review_required
      -> cancelled
  -> cancelled
```

非法状态：

- `succeeded` 不可回到 `running`。
- `cancelled` 不可提交有效完成回执。
- `failed` 重试必须创建新 attempt，不改原记录。
- 未确认的 `previewed` 不可被执行器消费。

工作项状态联动：

| 派发状态 | 工作项状态 |
|----------|------------|
| `previewed` | 不变 |
| `queued/running` | `in_progress` |
| `succeeded` | `review_pending` 或 `done` |
| `failed` | `blocked` 或 `in_progress` |
| `review_required` | `review_pending` |
| `cancelled` | 回到派发前状态或 `ready` |

## 8. 多 Agent 协作机制

v1.4 支持协作记录，但不做自动编排。

### 8.1 主执行 + 复核

示例：

1. Alice 生成方案草稿。
2. Codex CLI 复核可执行性。
3. 人工最终确认。

数据记录：

- 主执行派发：`mode = execute`。
- 复核派发：`mode = review`，`parentDispatchId` 指向主执行。
- 人工结论：写入 `collaboration.reviewed` 或 `collaboration.arbitrated`。

### 8.2 交接

当 Agent 返回 `recommendedNextAction = handoff`：

- 用户选择接收 Agent。
- 系统创建新 dispatch，`handoffFromDispatchId` 指向原派发。
- 原派发状态为 `review_required` 或 `succeeded`，不能被覆盖。

### 8.3 仲裁

多 Agent 结论冲突时：

- 系统不自动选择正确结论。
- 工作项进入 `review_pending`。
- 人工仲裁后写入 `collaboration.arbitrated`，并决定是否完成、返工或重试。

## 9. 权限、安全与审计

- 所有派发必须来自本地用户确认，除非策略明确允许自动确认且处于未来版本白名单。
- Adapter token 不得进入任务信封、回执、事件或前端响应。
- workspace-write、外部命令、本地文件写入必须沿用现有确认机制。
- confirmation token 只存 hash，不可明文持久化。
- 每次派发确认、取消、重试、回执、人工复核都写入系统 `audit[]` 和 `workItemEvents[]`。
- 派发只能访问工作项所在项目允许的工作目录和输入材料。

## 10. 本地优先与失败恢复

- 所有派发事实先写入本地 JSON，再启动外部执行。
- 启动外部执行失败时，派发记录保留为 `failed`，不删除。
- 应用重启后，`queued/running` 派发进入恢复扫描：
  - 可查询外部状态的执行器尝试同步。
  - 不可查询状态的执行器标记为 `review_required`，提示人工确认。
- 备份恢复时，运行中派发默认不可继续执行，必须人工确认后重试。

## 11. UI 页面与交互

### 11.1 工作项详情派发面板

显示：

- 推荐 Agent。
- 推荐理由：岗位、Skill、阶段、历史成功率、健康状态。
- 任务信封预览。
- 风险提示：缺输入、缺验收标准、Agent 不可用、需要人工复核。
- 操作：预览、确认派发、取消、重试、改派。

### 11.2 派发队列

筛选：

- 项目、Agent、状态、attempt、是否需要复核、是否失败。

列：

- 工作项、Agent、状态、开始时间、耗时、失败原因、下一步动作。

### 11.3 Agent 健康面板

显示：

- 最近成功/失败。
- 运行中任务数。
- 7 日成功率。
- Adapter 状态。
- 最近错误。

### 11.4 协作时间线

在工作项事件流中展示：

- 主执行。
- 复核。
- 交接。
- 仲裁。
- 最终验收。

## 12. 迁移策略

v1.3 v9 -> v1.4 v10：

- 新增 `dispatchPolicies: []`。
- 新增 `agentDispatches: []`。
- 新增 `agentHealth: []`。
- 旧 `executions[]`、`aliceDispatches[]` 或同类结构不强制迁移，只在详情中做兼容引用。
- 若旧执行记录能确定 `workItemId`，可建立只读关联；不能确定时保留项目/阶段级历史。

## 13. 验收标准

### P0

- 未确认派发不得启动执行。
- 同一工作项重复确认不得创建多个进行中派发。
- confirmation token/tokenHash 不得泄露到列表接口。
- Agent 成功/失败回执必须正确联动工作项状态。
- 取消后迟到回执不得覆盖当前工作项状态。
- 备份恢复不能自动继续运行中派发。

### P1

- 派发信封必须包含项目、流程阶段、工作项、验收标准、输入材料、idempotencyKey。
- Agent 推荐必须给出可解释理由。
- 失败重试必须创建新 attempt。
- 多 Agent 复核和交接必须能追溯父子关系。
- 派发队列支持按项目、Agent、状态筛选。

### P2

- Agent 健康状态可以先按最近执行记录估算。
- 回执质量评分可以先由人工填写。
- 推荐策略 UI 可以先支持基础字段，不要求复杂规则编辑器。

## 14. 测试计划

- 派发预览不启动执行。
- 派发确认缺 token 返回 400。
- 重复确认返回 409。
- 成功回执让工作项进入 `review_pending/done`。
- 失败回执让工作项进入 `blocked` 并保留错误。
- 取消后回执被忽略。
- 重试 attempt +1，旧错误仍可查。
- Adapter token 脱敏。
- 旧项目和旧执行记录仍可打开。

## 15. 风险与后续演进

| 风险 | 应对 |
|------|------|
| Agent 重复执行带来文件覆盖 | 强制幂等和确认，运行中派发互斥 |
| 回执质量不稳定 | 结构化回执 + 人工复核 + 置信度 |
| 多 Agent 结论冲突 | 不自动仲裁，进入人工复核 |
| 派发策略误推荐 | 推荐可覆盖，策略默认保守 |
| v2.0 需要节点调度 | v1.4 只沉淀派发日志和策略，不提前做引擎 |
