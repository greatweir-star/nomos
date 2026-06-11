# PRD：工作项分解与进度资源看板

## 背景

Nomos v1.2 已经完成流程管理模块：用户可以维护 `flowTemplates`，将项目实例化为 `flowInstances`，并通过阶段回执、关口评审、退回返工推进流程运行。与此同时，v1.0.1 的旧五阶段交付链路仍在项目内维护 `workflowTasks`，用于 Agent 任务信封、派发记录、回执、验收点和返工。

当前系统已经回答了"项目跑哪条流程、当前在哪个阶段"，但还不能清楚回答：

- 每个阶段要拆成哪些可执行工作项？
- 哪些工作项互相依赖，哪些可以同时推进？
- 项目、流程、人员、Agent 的进度和负载如何一屏查看？
- v1.2 的流程实例与旧五阶段任务如何共同沉淀为 v2.0 的任务/节点基础？

v1.3 的定位是 **v2.0 Workflow 引擎升级前的过渡层**。本版新增 `workItems` 和 `workItemEvents`，在不重做引擎的前提下，将流程阶段、旧任务信封、人工拆解任务统一展示为可追踪的工作项，并提供进度看板和资源看板。

## 用户与场景

### 主要用户

| 用户 | 特征 | 核心诉求 |
|------|------|---------|
| OPC 创业者 | 一人同时推进多个项目和多个 Agent | 快速知道今天应该盯哪些工作项、哪些 Agent 卡住了 |
| 项目经理 | 管理绑定流程模板的项目 | 将流程阶段拆成可分配、可验收的工作项，并看到依赖阻塞 |
| 流程 Owner | 关注流程模板运行效果 | 看到每条流程在不同项目里的阶段完成率、延期点和资源占用 |
| 数字员工管理员 | 管理碳基员工、硅基 Agent、混编员工 | 看到每个执行者的工作量、阻塞项和完成质量 |

### 典型场景

**场景一：从流程阶段拆解工作项**

项目经理打开一个绑定 "LTC 轻量版" 的项目：

1. 系统读取项目的 `flowInstanceId`，展示当前 `flowInstances[].stages[]`。
2. 项目经理在 "管理机会点" 阶段下创建 5 个工作项：客户画像、竞品分析、报价草案、方案评审、商机立项材料。
3. 每个工作项绑定负责人、角色、预计工时、截止时间、交付物要求。
4. 项目经理设置 "报价草案" 依赖 "竞品分析"，"方案评审" 依赖 "报价草案"。
5. 看板自动展示当前阶段进度和阻塞链路，但不自动改变流程阶段顺序。

**场景二：旧五阶段任务进入统一看板**

一个未绑定流程模板的旧项目继续使用 `workflowTasks`：

1. 系统为 `workflowTasks[]` 生成只读或可同步的镜像工作项。
2. 旧任务的 `stageKey` 映射到阶段名称：`goal` / `design` / `prd` / `develop` / `test` / `deploy` / `acceptance`。
3. Agent 派发、回执、失败、返工继续走旧状态机。
4. 进度看板将这些任务纳入项目整体统计，确保旧项目不被 v1.3 排除。

**场景三：资源看板发现 Agent 负载过高**

数字员工管理员进入资源看板：

1. 按执行者查看碳基员工、硅基 Agent、混编员工的进行中工作项数、逾期数、阻塞数、预计剩余工时。
2. 发现 Claude Code 绑定的工作项过多且 3 个已阻塞。
3. 管理员将其中 1 个工作项改派给 Codex CLI，并记录 `assignee.changed` 事件。
4. 看板刷新后，项目进度不被重置，原 `workflowTasks` 和 `flowInstances` 仍保持原状态。

## 要解决的问题

1. **阶段过粗**：v1.2 的 `flowInstances[].stages[]` 只能看到阶段状态，无法管理阶段内的具体工作。
2. **新旧任务割裂**：`flowInstances` 和旧 `workflowTasks` 分属两套结构，项目级进度看板难以统一统计。
3. **缺少依赖关系**：当前只有线性阶段推进，没有工作项级别的前置依赖、阻塞原因和可并行工作识别。
4. **资源不可见**：角色、员工、Agent 与任务负载没有聚合看板，无法判断谁过载、谁空闲、哪里需要改派。
5. **进度不可验算**：缺少统一的事件日志，无法复盘工作项状态为何变化，也难以将进度算法转化为测试。

## 成功指标

| 指标 | 当前基线 | v1.3 目标 |
|------|---------|-----------|
| 绑定流程项目的阶段拆解覆盖率 | 0% | 80% 以上进行中阶段至少有 1 个工作项 |
| 旧项目看板覆盖率 | 0% | 100% 旧 `workflowTasks` 可在进度看板显示 |
| 工作项状态变更可追溯率 | 0% | 100% 状态、负责人、依赖、进度变更写入 `workItemEvents` |
| 阻塞识别准确率 | N/A | 有未完成依赖的工作项 100% 标记为 blocked 或 waiting_dependency |
| 资源看板可用性 | N/A | 能按执行者展示进行中、逾期、阻塞、预计剩余工时 |
| 迁移兼容性 | v8 | v8 数据升级到 v9 后旧项目、流程项目、备份恢复均可用 |

## 本版范围

### 1. 工作项模型

- 在单一 `nomos-data.json` 中新增 `workItems: []` 和 `workItemEvents: []`。
- 工作项可以来自三类来源：
  - `flow_stage`：绑定 `flowInstances[].stages[]` 的阶段内拆解项。
  - `legacy_workflow_task`：由旧 `projects[].workflowTasks[]` 映射出的镜像项。
  - `manual`：项目级临时工作项，不绑定具体流程阶段。
- 工作项支持层级与排序：
  - `parentId` 用于阶段下的一级/二级拆解。
  - `order` 用于同父级排序。
  - v1.3 只支持展示和手动维护层级，不做 L2-L5 引擎调度。
- 工作项支持状态：
  - `todo`：待开始。
  - `ready`：依赖已满足，可开始。
  - `in_progress`：执行中。
  - `waiting_dependency`：等待前置项完成。
  - `review_pending`：等待验收或关口确认。
  - `blocked`：被问题阻塞。
  - `done`：完成。
  - `cancelled`：取消。

### 2. 工作项事件日志

- 所有重要变更写入 `workItemEvents`，采用追加式日志，不直接覆盖历史。
- 事件至少覆盖：
  - `item.created`
  - `item.updated`
  - `status.changed`
  - `assignee.changed`
  - `dependency.added`
  - `dependency.removed`
  - `progress.updated`
  - `receipt.linked`
  - `flow_stage.linked`
  - `legacy_task.linked`
  - `blocked`
  - `unblocked`
  - `comment.added`
- v1.3 不要求事件溯源重放为真实状态，当前状态仍写在 `workItems[]`；事件用于审计、复盘和看板解释。

### 3. 任务依赖

- 工作项支持 `dependsOn: string[]`。
- 新增或更新依赖时必须校验：
  - 依赖项存在。
  - 依赖项与当前项属于同一项目。
  - 不允许依赖自己。
  - 不允许形成循环依赖。
- 当任一前置依赖未处于 `done` 或 `cancelled` 时：
  - 当前工作项不能从 `todo` / `waiting_dependency` 变为 `ready`。
  - 当前工作项若被手动设置为 `in_progress`，API 返回 409，并给出未完成依赖列表。
- v1.3 不做动态分支，不根据依赖自动跳转流程阶段。

### 4. 阶段映射

v1.3 必须同时衔接新旧两套结构：

| 来源 | 映射方式 | v1.3 行为 |
|------|---------|-----------|
| `flowTemplates` | 模板阶段提供名称、角色责任、输入输出和关口文本 | 创建工作项时可继承阶段上下文和角色建议 |
| `flowInstances` | `flowInstanceId + stageId + templateStageId` 定位项目阶段 | 工作项作为阶段内明细，不替代阶段状态机 |
| `workflowTasks` | `projectId + legacyWorkflowTaskId + stageKey` 定位旧任务信封 | 生成镜像工作项进入看板，不改变旧任务派发逻辑 |

旧五阶段映射表：

| `workflowTasks.stageKey` | 展示阶段 | 默认阶段类型 |
|--------------------------|----------|--------------|
| `goal` | 提出目标 | 需求 |
| `design` | 总管拆解 | 设计 |
| `prd` | PRD | 规格 |
| `develop` | 本地开发 | 开发 |
| `test` | 测试 | 验证 |
| `deploy` | 预览发布 | 发布 |
| `acceptance` | 人工验收 | 验收 |

如果旧项目中出现未知 `stageKey`，系统保留原值展示为 "未分类阶段"，并允许在工作项详情中手动选择阶段类型。

### 5. 进度看板

- 提供项目级、流程级、全局三个视角。
- 支持按状态、项目、流程模板、流程实例、阶段、负责人、执行者类型、逾期状态筛选。
- 进度计算规则：
  - 默认按工作项数量计算：`done / (total - cancelled)`。
  - 如工作项填写 `estimateHours`，可切换为工时口径：`doneEstimateHours / activeEstimateHours`。
  - 父工作项进度默认由子项汇总；无子项时使用自身 `progress`。
  - 旧 `workflowTasks` 镜像项优先使用任务状态；如关联回执中有 `progress`，展示回执进度作为辅助证据。
  - 支持解析 Markdown 任务清单内容，沿用 OpenSpec 风格的 `- [ ]` / `- [x]` 计数，作为 `checklistProgress`，但不覆盖主状态。
- 看板必须显示：
  - 总工作项数、完成数、阻塞数、逾期数。
  - 各阶段完成率。
  - 当前阻塞链路。
  - 最近 20 条工作项事件。

### 6. 资源看板

- 按执行者聚合工作项：
  - 碳基员工：来自 `employees[]`。
  - 硅基 Agent：来自 `agents[]`。
  - 混编员工：来自 `employees[]` 且 `employmentType` 为混编时展示其绑定 Agent。
  - 未分配：单独归类。
- 指标：
  - 进行中工作项数。
  - 待开始且依赖已满足数。
  - 阻塞数。
  - 逾期数。
  - 本周到期数。
  - 预计剩余工时。
  - 最近完成数。
- 支持改派负责人，并记录 `assignee.changed` 事件。
- v1.3 只做负载可视化和手动改派，不做自动排班、SLA 升级、容量预测。

## 不做范围

- 不做 v2.0 的 L2-L5 五级完整 Workflow 引擎。
- 不做动态分支、条件跳转、并行调度器或规则引擎。
- 不自动根据工作项依赖推进、回退或重排 `flowInstances` 阶段。
- 不替换旧五阶段 `workflowTasks`、Agent 路由、执行器、回执和验收状态机。
- 不做跨项目依赖。
- 不做多人账号权限、云端同步、实时协同编辑。
- 不做自动资源排班、SLA 超时升级、流程瓶颈预测。
- 不做流程模板版本 diff 和历史迁移。

## 交互流程

### 从流程阶段创建工作项

```
流程实例追踪 → 选择项目/阶段 →
  点击"拆解工作项" →
    填写标题、负责人、预计工时、截止时间、交付物要求 →
    选择依赖项 →
    保存 →
      创建 workItems 记录
      写入 item.created / flow_stage.linked / dependency.added 事件
      刷新进度看板
```

验收要点：

- 阶段内新建工作项必须自动写入 `projectId`、`flowInstanceId`、`flowStageId`、`templateStageId`。
- 如果该阶段来自模板，负责人建议来自 `roleResponsibilities`，输入输出建议来自阶段 `inputs` / `outputs`。
- 创建工作项不改变 `flowInstances[].stages[].status`。

### 从旧五阶段任务同步工作项

```
打开旧项目 → 系统检查 workflowTasks →
  未找到对应 legacy_workflow_task 工作项 →
    创建镜像 workItem
    写入 legacy_task.linked 事件
  已存在镜像工作项 →
    同步任务状态、派发对象、回执引用
```

验收要点：

- 镜像工作项必须保留 `legacyWorkflowTaskId`。
- 旧任务状态为 `queued` 映射为 `todo`，`dispatched` / `running` 映射为 `in_progress`，`review_pending` 映射为 `review_pending`，`blocked` 映射为 `blocked`，`completed` 映射为 `done`，`superseded` 映射为 `cancelled`。
- 同步失败不能影响旧项目页面和旧 Agent 派发。

### 更新依赖与状态

```
工作项详情 → 添加前置依赖 →
  API 校验项目一致性和循环依赖 →
  写入 dependency.added →
  自动刷新当前项 readiness

工作项详情 → 改为进行中 →
  若所有前置项完成 → 状态更新为 in_progress
  若仍有未完成依赖 → 返回 409，状态保持 waiting_dependency
```

### 查看进度看板

```
首页 → 工作台 → 进度看板 →
  选择视角：全局 / 项目 / 流程模板 / 流程实例 →
  使用筛选器 →
  查看阶段完成率、阻塞链路、最近事件 →
  点击工作项进入详情
```

### 查看资源看板

```
首页 → 工作台 → 资源看板 →
  按执行者查看负载 →
  选择某个员工或 Agent →
  查看其工作项列表 →
  对单个工作项执行改派 / 标记阻塞 / 添加备注
```

## 数据与权限

### 数据版本

- 当前 v1.2 数据版本为 v8。
- v1.3 将 `nomos-data.json` 升级到 v9。
- `migrateData()` 必须自动补齐：
  - `data.workItems = []`
  - `data.workItemEvents = []`
- 迁移不得修改已有 `projects[]`、`flowTemplates[]`、`flowInstances[]`、`workflowTasks[]` 的业务字段。

### 数据模型

```js
workItem: {
  id,
  projectId,
  sourceType: 'flow_stage' | 'legacy_workflow_task' | 'manual',

  // flow_stage 来源
  flowTemplateId: null | string,
  flowInstanceId: null | string,
  flowStageId: null | string,
  templateStageId: null | string,

  // legacy_workflow_task 来源
  legacyWorkflowTaskId: null | string,
  legacyStageKey: null | string,

  parentId: null | string,
  title,
  description,
  status: 'todo' | 'ready' | 'in_progress' | 'waiting_dependency' | 'review_pending' | 'blocked' | 'done' | 'cancelled',
  progress: number,              // 0-100
  dependsOn: string[],

  assignee: {
    type: 'employee' | 'agent' | 'role' | 'unassigned',
    id: null | string,
    name: null | string
  },

  roleId: null | string,
  estimateHours: null | number,
  dueAt: null | string,
  startedAt: null | string,
  completedAt: null | string,
  blockedReason: '',

  checklist: {
    total: number,
    completed: number,
    source: 'manual' | 'markdown' | null
  },

  deliverableIds: string[],
  receiptIds: string[],
  order: number,
  createdAt,
  updatedAt
}

workItemEvent: {
  id,
  workItemId,
  projectId,
  type,
  actor: {
    type: 'user' | 'employee' | 'agent' | 'system',
    id: null | string,
    name: string
  },
  before: object | null,
  after: object | null,
  metadata: object,
  createdAt
}
```

### 约束规则

- `workItem.projectId` 必填，且必须指向存在的项目。
- `sourceType = flow_stage` 时，`flowInstanceId` 和 `flowStageId` 必填，且必须属于同一个项目。
- `sourceType = legacy_workflow_task` 时，`legacyWorkflowTaskId` 必填，且必须存在于该项目的 `workflowTasks[]`。
- `dependsOn[]` 只能引用同一项目内的工作项。
- `progress` 必须为 0-100 的整数。
- 状态为 `done` 时自动写入 `completedAt`；从 `done` 回退到其他状态时保留历史事件，并清空当前 `completedAt`。
- 删除工作项采用软删除：状态改为 `cancelled`，不物理删除事件。

### 权限规则

v1.3 仍是本地优先单机产品，没有账号体系。本版采用软权限：

- 本地用户拥有所有工作项读写权限。
- 如果工作项绑定了 `assignee`，界面优先提示"由该负责人处理"，但不阻止本地用户修改。
- 系统自动同步旧 `workflowTasks` 和 `flowInstances` 时，事件 actor 为 `system`。
- Agent 只能通过现有回执或执行记录间接更新关联工作项；v1.3 不新增 Agent 直接写工作项的开放权限。

## API 边界

### 新增 API

| API | 方法 | 用途 |
|-----|------|------|
| `/api/work-items` | GET | 查询工作项，支持项目、状态、负责人、来源、流程实例、阶段、逾期筛选 |
| `/api/work-items` | POST | 创建工作项 |
| `/api/work-items/:id` | GET | 获取工作项详情 |
| `/api/work-items/:id` | PATCH | 更新标题、描述、状态、负责人、进度、工时、截止时间等 |
| `/api/work-items/:id/cancel` | POST | 软删除工作项，状态改为 `cancelled` |
| `/api/work-items/:id/dependencies` | POST | 新增前置依赖 |
| `/api/work-items/:id/dependencies/:dependencyId` | DELETE | 移除前置依赖 |
| `/api/work-items/:id/events` | GET | 查询工作项事件 |
| `/api/work-items/:id/comments` | POST | 添加备注事件 |
| `/api/work-items/sync-legacy` | POST | 将指定项目或全部项目的 `workflowTasks` 同步为镜像工作项 |
| `/api/dashboards/progress` | GET | 获取进度看板聚合数据 |
| `/api/dashboards/resources` | GET | 获取资源看板聚合数据 |

### 查询参数

`GET /api/work-items` 至少支持：

- `projectId`
- `status`
- `assigneeType`
- `assigneeId`
- `sourceType`
- `flowInstanceId`
- `flowStageId`
- `legacyStageKey`
- `dueBefore`
- `blocked=true`
- `search`

### API 返回约定

- 所有新增 API 使用 `{ data }` 包裹成功响应。
- 校验失败返回 400。
- 依赖未完成、循环依赖、跨项目依赖返回 409，并带上 `details`。
- 找不到资源返回 404。
- 写操作必须写入 `workItemEvents`；如果事件写入失败，本次写操作整体失败。

### 与现有 API 的边界

- 不改变 `/api/flow-templates` 的行为。
- 不改变 `/api/flow-instances` 的阶段推进、关口评审、退回返工规则。
- 不改变旧项目的 `/api/projects/:id/workflow`、Agent 派发、回执提交、验收点处理逻辑。
- 可以在现有流程回执和旧任务回执成功后追加同步工作项，但同步失败只记录错误，不得让原 API 失败。

## 前端页面

### 1. 工作项中心

入口：首页新增 "工作台" 区，包含 "工作项"、"进度看板"、"资源看板" 三个子页。

工作项中心能力：

- 列表视图：标题、项目、阶段、负责人、状态、依赖、截止时间、进度。
- 分组视图：按项目、流程阶段、负责人、状态分组。
- 快速筛选：我的待办、阻塞项、逾期项、本周到期、未分配。
- 详情侧栏：基础信息、依赖、事件时间线、关联交付物、关联回执。
- 快速操作：改状态、改派、添加依赖、添加备注、标记阻塞、取消。

### 2. 项目详情增强

- 在项目详情中新增 "工作项" Tab。
- 如果项目绑定 `flowInstanceId`，按流程阶段展示工作项。
- 如果项目未绑定流程，按旧 `workflowTasks.stageKey` 展示镜像工作项。
- 阶段卡片展示：
  - 工作项完成率。
  - 阻塞数。
  - 最近事件。
  - "拆解工作项" 按钮。

### 3. 流程实例追踪增强

- 在 `flowInstances` 阶段详情中展示该阶段关联工作项。
- 阶段回执提交后，允许用户选择是否自动创建或更新关联工作项。
- 关口评审页面展示阶段工作项完成情况，但不强制作为准出规则。

### 4. 进度看板

- 顶部指标：总数、完成率、阻塞、逾期、本周到期。
- 主视图：
  - 按阶段的进度条。
  - 按状态的工作项分布。
  - 阻塞链路列表。
  - 最近事件流。
- 视角切换：
  - 全局。
  - 单项目。
  - 单流程模板。
  - 单流程实例。

### 5. 资源看板

- 执行者列表：头像/类型、进行中、阻塞、逾期、预计剩余工时。
- 执行者详情：工作项列表、状态分布、最近完成、最近阻塞原因。
- 手动改派：选择新的员工、Agent 或角色，保存后刷新资源聚合。

## 自动化测试验收

### 数据迁移

- 给定 v8 数据缺少 `workItems` 和 `workItemEvents`，加载后版本升级到 v9，两个字段为数组。
- 给定 v8 数据中有 `flowTemplates`、`flowInstances`、旧项目 `workflowTasks`，迁移后这些字段内容不变。
- 给定备份文件缺少 `workItems`，恢复后自动补齐并可通过 `validateData()`。

### 工作项 CRUD

- 创建 `flow_stage` 工作项时，若 `flowInstanceId` 不存在，返回 400。
- 创建 `flow_stage` 工作项时，若 `flowStageId` 不属于该实例，返回 400。
- 创建 `legacy_workflow_task` 工作项时，若 `legacyWorkflowTaskId` 不存在于项目，返回 400。
- 更新工作项标题、负责人、截止时间、预计工时后，返回更新后的工作项，并写入对应事件。
- 取消工作项后状态为 `cancelled`，事件日志仍可查询。

### 依赖校验

- 同项目内工作项 A 依赖 B 成功，写入 `dependency.added`。
- 工作项依赖自己返回 409。
- 跨项目依赖返回 409。
- A 依赖 B 后，B 再依赖 A 返回 409。
- 前置依赖未完成时，将 A 改为 `in_progress` 返回 409，并列出未完成依赖。
- 前置依赖完成后，将 A 改为 `ready` 或 `in_progress` 成功。

### 阶段与旧任务映射

- 绑定流程项目从 `flowInstances[].stages[]` 创建工作项后，工作项包含 `flowInstanceId`、`flowStageId`、`templateStageId`。
- 旧项目调用 `/api/work-items/sync-legacy` 后，每个活跃 `workflowTasks[]` 产生一个 `legacy_workflow_task` 工作项。
- 旧任务 `queued`、`dispatched`、`running`、`review_pending`、`blocked`、`completed`、`superseded` 均按映射表得到正确工作项状态。
- 同一个 `legacyWorkflowTaskId` 重复同步不会创建重复工作项。

### 进度看板

- 给定 10 个工作项，其中 4 个 `done`、1 个 `cancelled`，数量口径完成率为 `4 / 9`。
- 给定工时分别为 2、3、5 的三个工作项，其中 2 和 3 已完成，工时口径完成率为 `5 / 10`。
- 给定父工作项有 2 个子项，父项进度使用子项汇总，不使用父项自身 `progress`。
- 给定 Markdown 内容包含 3 个 `- [ ]` 和 2 个 `- [x]`，`checklist.total = 5`、`checklist.completed = 2`。
- 看板筛选 `flowInstanceId` 时，只返回该流程实例关联工作项的聚合。

### 资源看板

- 按员工聚合时，员工 A 的进行中、阻塞、逾期、预计剩余工时统计正确。
- 按 Agent 聚合时，硅基 Agent 的工作项和旧 `workflowTasks` 镜像项都被统计。
- 未分配工作项进入 "未分配" 分组。
- 改派工作项后，旧负责人计数减少，新负责人计数增加，并写入 `assignee.changed`。

### 回归兼容

- `/api/flow-templates` 原有 CRUD 测试继续通过。
- `/api/flow-instances/:id/advance`、`review`、`return`、`receipts` 原有流转测试继续通过。
- 旧 `workflowTasks` 的 Agent 派发、回执、验收、返工测试继续通过。
- 同步工作项失败时，旧流程 API 返回仍与 v1.2 一致。

## 手工验收

1. **绑定流程项目拆解**
   - 创建或选择一个绑定 "LTC 轻量版" 的项目。
   - 在当前流程阶段下创建 5 个工作项。
   - 设置至少 2 条依赖。
   - 确认阶段状态没有被工作项创建动作改变。
   - 确认进度看板显示该阶段 `0/5` 完成。

2. **依赖阻塞**
   - 将一个依赖未完成的工作项改为 `in_progress`。
   - 系统提示未完成依赖，状态保持 `waiting_dependency` 或原状态。
   - 完成前置项后，再次改为 `in_progress` 成功。

3. **旧项目兼容**
   - 打开一个未绑定流程模板的旧项目。
   - 确认旧五阶段页面、Agent 派发、回执操作仍可用。
   - 进入工作项中心，确认旧 `workflowTasks` 已显示为镜像工作项。

4. **进度看板**
   - 将 5 个工作项中的 2 个标记为 `done`，1 个标记为 `blocked`。
   - 确认项目视角完成率为 `2/5`，阻塞数为 1。
   - 添加一个 `cancelled` 工作项，确认完成率分母不包含取消项。

5. **资源看板**
   - 创建 3 个工作项分配给同一 Agent，其中 1 个逾期、1 个阻塞。
   - 确认该 Agent 的资源卡显示进行中数、逾期数、阻塞数。
   - 将其中 1 个改派给另一个 Agent，确认两个资源卡统计同步变化。

6. **事件审计**
   - 对同一工作项执行创建、改派、添加依赖、标记阻塞、解除阻塞、完成。
   - 打开事件时间线，确认事件顺序、actor、before/after 信息完整。

## 风险与回退

| 风险 | 影响 | 缓解措施 | 回退方案 |
|------|------|----------|----------|
| `workItems` 与 `workflowTasks` 状态不同步 | 看板显示与旧任务页面不一致 | 镜像项保留 `legacyWorkflowTaskId`，同步采用幂等更新；旧任务状态作为权威来源 | 禁用 `/api/work-items/sync-legacy`，旧项目继续只显示旧五阶段 |
| 工作项依赖被误解为流程编排 | 用户期待自动推进或分支 | UI 文案明确"依赖仅影响工作项可开始状态，不改变流程阶段" | 隐藏依赖入口，保留普通工作项列表 |
| 进度口径争议 | 完成率与用户直觉不一致 | 同时提供数量口径、工时口径、清单口径，并标明当前口径 | 默认回退为数量口径，保留其他口径为详情说明 |
| 资源看板统计过慢 | 大项目下页面卡顿 | 后端聚合，前端分页；事件流只取最近 20 条 | 降级为按项目查询，不显示全局聚合 |
| v9 迁移污染现有数据 | 备份恢复或旧项目失败 | 迁移只追加空数组，不改旧字段；恢复前继续创建保护快照 | 回退到保护备份；应用层忽略 `workItems` / `workItemEvents` |
| 事件写入失败导致写操作失败 | 用户更新无法保存 | 写操作和事件写入在同一次 store update 中完成，失败时明确提示 | 临时关闭事件强校验，仅允许只读看板 |

## 与 v2.0 的衔接

v1.3 不是 v2.0 引擎，但必须为 v2.0 留出迁移路径：

- `workItems` 可以在 v2.0 升级为 L3 任务的候选来源。
- `parentId` 和 `dependsOn` 可以迁移为 L3/L4 的静态结构，但 v1.3 不执行调度。
- `sourceType`、`flowInstanceId`、`flowStageId`、`templateStageId` 让 v2.0 能追溯每个工作项来自哪个流程阶段。
- `workItemEvents` 为未来节点事件流、SLA、瓶颈分析提供审计素材。
- v1.3 的看板聚合逻辑可复用于 v2.0 的流程运行监控，但 v2.0 才实现动态分支、条件规则、并行调度和节点级 Agent 自动调度。

---

*文档版本：V1.0*
*创建日期：2026-06-07*
*状态：Proposed*
*关联版本：v1.3*
