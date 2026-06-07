# Nomos v2.0+ Workflow 引擎升级 - 架构边界与验收标准

**架构负责人**：Alice
**日期**：2026-06-07
**关联版本**：v2.0 / v2.1 / v2.2
**状态**：Draft for Engineering Acceptance
**关联资料**：
- `产品规划/02-PRD/PRD_V1_FLOW_MANAGEMENT.md`
- `产品规划/02-PRD/PRD_V1_WORKFLOW_ENGINE.md`
- `产品规划/03-版本规划/ROADMAP_V1.md`
- `产品开发/PROGRESS.md`
- `产品开发/nomos-desktop/backend/workflow.js`
- `产品开发/nomos-desktop/backend/flow-api.js`
- `nomos-references/OpenRath 源码分析笔记`

---

## 0. 文档定位

本文不是重写 v2.0 Workflow 引擎 PRD，而是补齐工程落地时最容易含混的三件事：

1. **架构边界**：哪些能力属于 v1.2/v1.3 前置基础，哪些能力必须进入 v2.0 引擎，哪些能力留到 v2.1/v2.2。
2. **核心模型**：L2-L5、节点、事件、依赖、执行记录如何落在当前本地 JSON 架构中。
3. **验收标准**：什么样的自动化测试和手工路径可以证明 v2.0 不是“能展示流程图”，而是真的能运行、调度、回执、返工和回退。

总原则：v2.0 继续遵循 **本地优先、单 `nomos-data.json` 过渡、无数据库依赖、无云服务强依赖**。数据库、云端协同、跨设备同步只作为 v3.x 或未来可选演进，不作为 v2.0 验收前提。

---

## 1. 当前现状与约束

### 1.1 已有能力

v1.2 已经完成流程管理模块，工程上存在两条相关链路：

| 链路 | 现有文件 | 已有能力 | v2.0 可复用点 |
|------|----------|----------|---------------|
| 固定五阶段项目工作流 | `backend/workflow.js` | 阶段状态、任务信封、Agent 派发标记、任务回执、交付物、验收点、返工、交接记录 | 任务信封、结构化回执、幂等派发、失败阻塞、人工验收和返工语义 |
| v1.2 流程模板与实例 | `backend/flow-api.js` | 流程模板 CRUD、项目绑定流程实例、L2 阶段推进、关口评审、阶段回执 | `flowTemplates`、`flowInstances`、`project.flowInstanceId`、L2 阶段与关口的运行框架 |

当前存储层已经在 `store.js` 中将数据版本提升到 `8`，并保证：

- `flowTemplates` 是顶层数组。
- `flowInstances` 是顶层数组。
- `projects[]` 可通过 `flowInstanceId` 关联流程实例。
- 单文件持久化、备份、恢复、迁移仍围绕 `nomos-data.json`。

### 1.2 主要限制

v2.0 的设计必须承认以下现实，不能假设从零重写：

1. **`flowInstances[].stages[]` 目前只表达 L2 阶段**
   现有实例阶段包含 `templateStageId/name/order/status/gate/startedAt/completedAt/attempt`，但没有 L3 任务、L4 步骤、L5 节点。

2. **现有阶段推进是线性的**
   `advanceFlowInstance()` 通过 `order + 1` 找下一阶段，不支持并行、条件分支、阶段跳转图。

3. **关口条件仍是文本**
   v1.2 的准入条件和准出标准是人工或 Agent 可读文本，不是规则引擎表达式。v2.0 可以增加简单可执行条件，但不能要求一次性引入完整规则引擎。

4. **`workflow.js` 与 `flow-api.js` 是并行体系**
   未绑定流程模板的项目继续走固定五阶段；绑定模板的项目走流程实例。v2.0 需要桥接，不应破坏未绑定项目。

5. **当前没有 `workItems/workItemEvents` 实现**
   `PROGRESS.md` 将 v1.3 规划为“任务与工作项的精细化分解、流程与任务的关联映射、初步的进度与资源看板”。因此，v2.0 不能直接跳过 v1.3 去做 L5 调度器。v1.3 的 `workItems/workItemEvents` 必须成为 v2.0 的前置数据基座。

6. **多智能体调度必须可审计**
   参考 OpenRath 的 Session、ChunkTable、Lineage 思想，Nomos 的 Workflow 运行状态也应是一等对象。v2.0 不需要照搬 JSONL 持久化，但必须保留 append-only 事件、因果链、可重放状态这些关键工程属性。

---

## 2. v2.0 目标架构

### 2.1 架构目标

v2.0 要把“流程模板和阶段列表”升级为“可运行的本地 Workflow 引擎”：

```text
Flow Template
  -> Flow Instance as Runtime Session
    -> L2 Stage
      -> L3 Task
        -> L4 Step
          -> L5 Node
            -> Dispatch / Manual Todo / Hybrid Review
              -> Receipt
                -> Event
                  -> State Reducer
                    -> Next Ready Node
```

其中：

- **Flow Template** 仍是模板定义，不直接承载运行状态。
- **Flow Instance** 是运行时 Session，是状态、事件、执行记录、当前游标的聚合根。
- **L2 Stage** 继续承接 v1.2 的阶段与关口模型。
- **L3/L4/L5** 由 v1.3 `workItems` 的层级结构承接，v2.0 增加调度语义。
- **`workItemEvents`** 是流程运行的 append-only 事件流，所有状态变更都要能从事件解释。
- **Scheduler** 只负责找出可运行节点，不直接执行 Agent。
- **Dispatcher** 只负责把 L5 节点转成碳/硅/碳硅执行动作。
- **Reducer** 负责把事件归并成快照状态，保证幂等和可重放。

### 2.2 设计原则

1. **本地优先**
   所有新增数据继续写入 `nomos-data.json`。不引入数据库、消息队列、云端状态机。

2. **事件优先，快照辅助**
   `workItemEvents` 记录事实，`workItems.status` 和 `flowInstances.status` 是查询快照。快照可以被事件重放校正。

3. **L2 兼容，L5 新增**
   不删除 v1.2 的阶段模型；v2.0 在 L2 阶段下挂 L3-L5 工作项，并用包装 API 兼容旧阶段推进接口。

4. **调度和执行解耦**
   引擎判断“哪个节点可执行”，Agent 路由判断“交给哪个执行器”，执行器只提交回执。

5. **碳硅分流清晰**
   碳节点永远不自动调用 Agent；硅节点可自动派发；碳硅节点必须有 Agent 预审和人类终审两个阶段。

6. **v2.0 不追求全规则引擎**
   条件分支只支持简单字段匹配、状态匹配、布尔结果匹配。复杂表达式、脚本条件、跨流程规则留到 v2.2。

---

## 3. 核心模型

### 3.1 顶层数据结构建议

v2.0 仍在 `nomos-data.json` 内增量扩展：

```json
{
  "version": 20,
  "flowTemplates": [],
  "flowInstances": [],
  "workItems": [],
  "workItemEvents": [],
  "nodeRuns": []
}
```

说明：

- `version: 20` 是 v2.0 引擎迁移的占位建议，最终实现时可按 v1.3-v1.6 的实际迁移版本调整；关键是 v2.0 不能复用 v1.3 的 v9 版本号。
- `workItems` 应在 v1.3 引入，v2.0 只扩展其字段和语义。
- `workItemEvents` 应在 v1.3 引入，v2.0 将其升级为 Workflow 引擎事件流。
- `nodeRuns` 用于 L5 节点执行记录，不建议直接复用现有 `executions[]`。现有 `executions[]` 更像本地 Agent/命令执行记录；`nodeRuns[]` 是 Workflow 运行语义，可以通过 `externalExecutionId` 关联 `executions[]`。

### 3.2 L2-L5 分层

| 层级 | 中文名 | 运行职责 | 数据落点 | 是否可调度 |
|------|--------|----------|----------|------------|
| L1 | 价值流 | 流程归属与业务上下文，如 LTC/IPD/ITR | `flowTemplates.category/name/tags` | 否 |
| L2 | 阶段 | 阶段状态、关口、阶段级输入输出、阶段跳转边界 | `flowInstances[].stages[]` | 否 |
| L3 | 任务 | 阶段内可并行或可汇总的任务单元 | `workItems.level = "L3"` | 间接 |
| L4 | 步骤 | 任务内的有序步骤或检查清单 | `workItems.level = "L4"` | 间接 |
| L5 | 节点 | 最小调度单元，明确碳/硅/碳硅属性 | `workItems.level = "L5"` | 是 |

关键边界：

- L2 阶段不直接派发给 Agent。
- L3 任务不直接派发给 Agent，除非降级为“默认单节点任务”。
- L4 步骤不直接派发给 Agent，负责约束顺序、输入输出和检查点。
- L5 节点是唯一可调度单元。

### 3.3 L2 阶段模型

v2.0 不推翻 v1.2 阶段字段，而是补充索引和关口策略：

```json
{
  "id": "stage-runtime-id",
  "templateStageId": "stage-template-id",
  "name": "管理机会点",
  "order": 2,
  "status": "pending | running | review_pending | done | blocked | skipped",
  "taskIds": ["work-item-l3-id"],
  "gate": {
    "enabled": true,
    "entryConditions": ["线索评分已完成"],
    "exitCriteria": ["商机立项评审通过"],
    "reviewMode": "carbon | silicon | hybrid",
    "review": {
      "status": "pending | approved | rejected | returned",
      "reviewer": null,
      "comment": null,
      "reviewedAt": null,
      "precheckRunId": null
    }
  },
  "startedAt": null,
  "completedAt": null,
  "blockedReason": "",
  "attempt": 1
}
```

阶段状态只由引擎事件驱动更新：

- 当阶段下首个 L5 节点可执行时，阶段进入 `running`。
- 当阶段下所有必需 L5 节点完成时，阶段进入 `review_pending` 或 `done`。
- 关口通过后进入下一阶段。
- 关口拒绝或节点失败达到策略阈值后进入 `blocked` 或返工目标阶段。

### 3.4 `workItems` 模型

v1.3 的 `workItems` 是 v2.0 的骨架。v2.0 至少需要以下字段：

```json
{
  "id": "work-item-id",
  "projectId": "project-id",
  "flowInstanceId": "flow-instance-id",
  "stageId": "stage-runtime-id",
  "parentId": null,
  "level": "L3 | L4 | L5",
  "kind": "task | step | node",
  "title": "生成客户画像",
  "description": "基于输入材料生成客户画像和风险摘要",
  "status": "pending | ready | running | review_pending | done | blocked | skipped | cancelled",
  "order": 1,
  "progress": 0,
  "required": true,
  "templateRef": {
    "templateId": "flow-template-id",
    "stageTemplateId": "stage-template-id",
    "taskTemplateId": null,
    "stepTemplateId": null,
    "nodeTemplateId": null
  },
  "executor": {
    "nodeType": "carbon | silicon | hybrid",
    "roleId": null,
    "employeeId": null,
    "agentId": null,
    "adapterType": null
  },
  "dependencies": [],
  "policy": {
    "autoStart": true,
    "retryLimit": 1,
    "timeoutMinutes": null,
    "onFailure": "block | retry | skip | escalate_to_carbon"
  },
  "inputRefs": [],
  "outputRefs": [],
  "activeRunId": null,
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

字段边界：

- `level/kind` 决定层级职责。
- `executor.nodeType` 只对 L5 节点必填，L3/L4 可为空。
- `dependencies` 可以指向同一阶段内其他 `workItems`，v2.0 默认不做跨流程依赖。
- `policy.timeoutMinutes` v2.0 只用于展示和简单提醒，完整 SLA 计时和升级留到 v2.1。
- `inputRefs/outputRefs` 复用现有项目资产、交付物、回执引用，不要求新增文件存储。

### 3.5 L5 节点类型

| 节点类型 | 调度行为 | 完成条件 | 失败处理 |
|----------|----------|----------|----------|
| `carbon` | 创建人工待办，不自动派发 Agent | 人类提交完成事件或关口决策事件 | 可阻塞、退回、跳过，不能静默自动通过 |
| `silicon` | 自动生成任务信封并派发给绑定 Agent 或路由器选择的 Agent | 收到结构化回执，且回执状态为 `completed` | 按 `retryLimit` 重试，超过后 `blocked` 或 `escalate_to_carbon` |
| `hybrid` | 先派发 Agent 预审，再创建人工终审待办 | Agent 预审完成且人类终审通过 | 预审失败可重试，终审拒绝进入返工或阻塞 |

碳硅节点必须拆成两个可审计动作：

1. `node.precheck.dispatched` / `node.precheck.receipt_submitted`
2. `node.human_review.requested` / `node.human_review.resolved`

不能用一个 `completed` 直接代表“Agent 和人都同意”。

### 3.6 事件模型

`workItemEvents` 是 Workflow 引擎的事实流。建议事件结构如下：

```json
{
  "id": "event-id",
  "projectId": "project-id",
  "flowInstanceId": "flow-instance-id",
  "stageId": "stage-runtime-id",
  "workItemId": "work-item-id",
  "type": "work_item.status_changed",
  "actor": {
    "type": "system | user | agent | webhook | timer",
    "id": "actor-id",
    "name": "actor-name"
  },
  "payload": {},
  "idempotencyKey": "optional-idempotency-key",
  "causationId": "previous-event-id",
  "correlationId": "flow-run-correlation-id",
  "createdAt": "ISO"
}
```

v2.0 必须支持的事件类型：

| 类型 | 说明 |
|------|------|
| `flow.instance.created` | 流程实例创建 |
| `stage.started` / `stage.completed` / `stage.blocked` | L2 阶段状态变化 |
| `work_item.created` | L3/L4/L5 工作项创建 |
| `work_item.ready` / `work_item.started` / `work_item.completed` / `work_item.blocked` | 工作项生命周期 |
| `dependency.satisfied` / `dependency.unsatisfied` | 依赖判断结果 |
| `node.dispatch.requested` / `node.dispatch.accepted` | 硅节点或碳硅预审派发 |
| `node.receipt.submitted` | Agent 或人工提交结构化回执 |
| `gate.review.requested` / `gate.review.resolved` | 关口评审请求和结果 |
| `manual.todo.created` / `manual.todo.resolved` | 碳节点人工待办 |
| `external.event.accepted` | Webhook 或外部事件入口被接受 |
| `timer.event.fired` | 时间触发事件被引擎接收 |
| `engine.error` | 引擎拒绝非法状态或执行失败 |

事件约束：

- 事件只追加，不原地修改。
- 同一 `idempotencyKey` 在同一 `flowInstanceId` 下只能生效一次。
- Reducer 必须能从 `flow.instance.created` 开始重放出当前状态。
- `audit[]` 仍用于系统审计；`workItemEvents[]` 用于 Workflow 状态事实。二者可以互相引用，但不能互相替代。

### 3.7 依赖模型

v2.0 依赖只解决“节点何时可运行”，不解决跨流程编排。

```json
{
  "workItemId": "upstream-node-id",
  "type": "finish_to_start | condition | gate_approved",
  "required": true,
  "condition": {
    "field": "receipt.payload.qualified",
    "operator": "equals",
    "value": true
  }
}
```

依赖规则：

1. 默认只允许同一 `flowInstanceId` 内依赖。
2. v2.0 优先支持同一 L2 阶段内的 DAG。
3. 跨 L2 阶段依赖必须通过阶段关口或显式返工，不做任意跨阶段边。
4. 引擎保存模板或实例化时必须检测循环依赖。
5. 条件分支只支持简单匹配：`equals/not_equals/in/exists`。复杂表达式留到 v2.2。

### 3.8 执行记录 `nodeRuns`

`nodeRuns` 是 L5 节点每次执行的运行账本：

```json
{
  "id": "node-run-id",
  "projectId": "project-id",
  "flowInstanceId": "flow-instance-id",
  "workItemId": "l5-node-id",
  "attempt": 1,
  "status": "queued | dispatched | running | completed | failed | cancelled",
  "nodeType": "silicon",
  "executor": {
    "agentId": "claude-code",
    "agentName": "Claude Code",
    "adapterType": "local"
  },
  "envelope": {},
  "externalExecutionId": null,
  "receipt": null,
  "error": null,
  "startedAt": null,
  "completedAt": null,
  "durationMs": null,
  "idempotencyKey": "dispatch-key"
}
```

执行记录必须满足：

- 每次重试创建新的 `nodeRuns` 记录，不能覆盖上一轮失败信息。
- `receipt` 保留结构化回执摘要，完整附件仍走项目资产或现有执行记录引用。
- `externalExecutionId` 可关联现有 `executions[]`，但不是必填。
- 调度器根据 `workItem.activeRunId` 和 `nodeRuns.status` 避免重复派发。

---

## 4. v1.3 `workItems/workItemEvents` 到 v2.0 L3/L4/L5 的前置关系

v1.3 不是 v2.0 的旁支，而是 v2.0 的数据地基。建议 v1.3 明确交付以下最小契约。

### 4.1 v1.3 最小交付契约

| 能力 | v1.3 需要做到 | v2.0 如何复用 |
|------|---------------|---------------|
| `workItems` 顶层数组 | 项目级任务、流程阶段任务、子任务都用统一工作项表达 | 直接升级为 L3/L4/L5 容器 |
| `parentId` 层级 | 支持任务和子任务的树状关系 | L3 任务 -> L4 步骤 -> L5 节点 |
| `flowInstanceId/stageId` | 工作项能挂到具体流程实例和阶段 | v2.0 不再重新建立阶段任务映射 |
| `status/progress/assignee` | 看板可显示执行状态和负责人 | v2.0 调度器沿用状态生命周期 |
| `dependencies` 预留 | 支持简单前后置依赖 | v2.0 增加 DAG 解析和 ready 判断 |
| `workItemEvents` | 记录创建、状态变更、评论、回执、人工操作 | v2.0 升级为 Workflow 事件流 |

### 4.2 映射规则

| v1.3 工作项形态 | v2.0 层级 | 判断规则 |
|-----------------|----------|----------|
| 挂在阶段下、无父级或父级为阶段容器 | L3 任务 | `level` 缺失时，可由 `parentId = null` 且 `stageId` 存在推断 |
| L3 任务下的有序子项 | L4 步骤 | `parentId` 指向 L3，且仍有子项 |
| 无子项且可执行的叶子项 | L5 节点 | `parentId` 指向 L4 或 L3，且包含 `executor.nodeType` |
| v1.3 简单任务，没有 L4/L5 | 默认 L3/L4/L5 三层骨架 | 迁移时自动生成“默认步骤”和“默认节点” |

### 4.3 为什么 v1.3 是必要前置

如果 v2.0 直接在 `flowInstances[].stages[]` 里嵌套 `tasks/steps/nodes`，会造成三类问题：

1. **看板和调度割裂**
   v1.3 的资源看板看到的是项目任务，v2.0 引擎看到的是另一套节点，用户会无法解释“这个人或 Agent 正在做什么”。

2. **事件历史重复建设**
   工作项状态变更、回执提交、阻塞原因、人工评论都需要事件。v1.3 如果先建立 `workItemEvents`，v2.0 就不需要另造一套 Workflow 日志。

3. **迁移风险更低**
   v1.3 先把“任务树”和“事件流”跑稳，v2.0 只增加节点类型、依赖判断和调度策略，升级粒度更可控。

### 4.4 v1.3 验收必须为 v2.0 预留的字段

v1.3 即使不实现自动调度，也应预留：

- `workItems[].flowInstanceId`
- `workItems[].stageId`
- `workItems[].parentId`
- `workItems[].dependencies`
- `workItems[].executor`
- `workItems[].inputRefs`
- `workItems[].outputRefs`
- `workItemEvents[].type`
- `workItemEvents[].workItemId`
- `workItemEvents[].causationId`
- `workItemEvents[].correlationId`
- `workItemEvents[].idempotencyKey`

v2.0 的工程验收应包含一组 v1.3 数据夹具，证明这些字段可以无损升级为 L3/L4/L5。

### 4.5 v1.4-v1.6 输入契约

v2.0 不能只消费 v1.3 工作项，还必须消费 v1.4-v1.6 沉淀的派发、资源、成本、知识和模板治理数据。

| 输入数据 | v2.0 使用方式 | 验收要求 |
|----------|---------------|----------|
| `dispatchPolicies[]` | 升级为硅节点和碳硅节点的候选路由策略 | 策略缺失时节点不得静默自动派发，必须进入人工配置或阻断 |
| `agentDispatches[]` | 迁移为 `nodeRuns[]` 的历史参考和执行证据 | 旧派发的 attempt、错误、回执、确认记录不能丢失 |
| `agentHealth[]` | 节点派发前的可用性判断参考 | Agent 不可用时给出阻断说明，不得直接跳过节点 |
| `capacityPlans[]` | 解释节点资源容量和超载风险 | v2.0 可以先只读，但准备度报告必须识别关键岗位/Agent 超载 |
| `resourceAllocations[]` | 映射历史节点资源占用 | 迁移后至少能追溯工作项或派发对应的资源来源 |
| `costEntries[]` | 解释节点或项目成本 | unknown 成本不得当作 0，成本不参与自动调度决策 |
| `dashboardSnapshots[]` | 作为升级前经营基线 | v2.0 升级后仍能打开升级前快照 |
| `decisionRecords[]` | 解释模板重大变更和引擎规则来源 | 模板 major 变更或碳硅节点边界必须能关联决策记录 |
| `knowledgeAssets[]` | 作为节点输入、SOP、提示词和验收准则来源 | sensitive 资产不得自动注入 Agent 信封 |
| `templateVersions[]` | 作为 v2.0 实例化模板基线 | 新 Workflow 实例必须绑定明确模板版本 |
| `retrospectives[]` | 判断流程是否适合升级 | 准备度报告应引用复盘证据，而不是只看模板结构 |
| `governanceChecks[]` | 作为升级阻断项 | 存在 P0 blocking 检查时不得启动自动迁移 |

最低进入条件：

- 至少 1 个 active 模板版本可作为 v2.0 实例化基线。
- 至少 1 种 Agent 能通过 v1.4 派发链路稳定完成工作项。
- 至少 1 份 v1.5 资源/成本快照可解释核心流程风险。
- 至少 3 个复盘或决策记录可解释流程优化依据。
- v1.6 准备度报告无 P0 阻断。

---

## 5. 模块边界

### 5.1 后端模块

| 模块 | 职责 | 不应承担 |
|------|------|----------|
| `backend/store.js` | 数据加载、备份、恢复、迁移、基础校验 | 不写调度逻辑，不判断节点 ready |
| `backend/flow-api.js` | 流程模板和流程实例 CRUD，保留 v1.2 API 兼容包装 | 不直接派发 Agent，不做复杂状态归并 |
| `backend/workflow-engine.js` | 纯状态机和 Reducer：事件归并、状态转移、阶段完成判断 | 不读写文件，不调用 Agent，不处理 HTTP |
| `backend/workflow-scheduler.js` | 根据依赖和策略找出 ready 的 L5 节点 | 不修改状态事实，只产出调度建议 |
| `backend/workflow-events.js` | 追加 `workItemEvents`，处理幂等键，生成审计引用 | 不绕过 Reducer 直接改快照 |
| `backend/node-dispatcher.js` | 将 L5 节点转成人工待办、Agent 任务信封或碳硅预审 | 不判断业务关口通过与否 |
| `backend/gate-evaluator.js` | 处理关口评审、硅评审预检查、碳硅终审结果 | 不负责下一节点选择 |
| `backend/agent-router.js` | 从阶段路由升级为节点路由，选择 Agent/Adapter | 不持久化 Workflow 状态 |
| `backend/server.js` | HTTP 路由和请求响应编排 | 不内联复杂引擎逻辑 |

### 5.2 前端模块

前端仍可沿用当前单体 `renderer/app.js` 过渡，但职责必须清晰：

- 流程模板编辑器负责定义阶段、任务、步骤、节点，不负责运行逻辑。
- 流程实例面板负责显示当前阶段、活跃节点、阻塞节点、执行记录。
- 人工待办入口负责完成碳节点和碳硅终审。
- 前端只提交用户动作事件，不直接拼接最终状态。
- 所有“自动推进”都应由后端引擎返回结果，前端只刷新快照。

### 5.3 与 OpenRath 借鉴点的边界

可借鉴：

- Session 作为一等状态载体：`flowInstance` 是 Workflow runtime session。
- ChunkTable/append-only 思想：`workItemEvents` 是语义明确的事件表。
- Lineage 思想：`causationId/correlationId` 记录事件因果。
- Tool 抽象思想：Agent 执行动作通过任务信封和回执统一表达。
- Budget 思想：v2.1 可引入 Agent 执行预算和超时升级。

不照搬：

- 不引入 OpenRath 的 Python Session 实现。
- 不把持久化改为多 JSONL 文件。
- 不引入 Sandbox/Backend 抽象作为 v2.0 前提。
- 不把 Workflow 写成可继承的复杂模块系统。

---

## 6. 迁移策略

### 6.1 迁移目标

从当前 v1.2 数据结构升级到 v2.0 后，应同时满足：

- 旧项目不丢失。
- 未绑定流程模板的项目仍可走 `workflow.js` 固定五阶段。
- 绑定流程实例的项目拥有 L2-L5 结构。
- v1.3 `workItems/workItemEvents` 被保留并升级，不被重建覆盖。
- 所有迁移动作有备份和事件记录。

### 6.2 迁移步骤

1. **预备份**
   升级前通过现有备份机制创建保护快照，备份名建议包含 `before-v2-workflow-engine`。

2. **补全顶层数组**
   在 `migrateData()` 中保证：
   - `workItems = []`
   - `workItemEvents = []`
   - `nodeRuns = []`

3. **标记引擎版本**
   对 `flowInstances[]` 增加：
   - `engineVersion: "2.0"`
   - `schemaVersion: 2`
   - `workItemIds: []`

4. **L2 阶段保留原字段**
   不删除 `flowInstances[].stages[]` 既有字段，只补充 `taskIds` 和新状态枚举映射。

5. **v1.2 阶段自动生成默认 L3-L5**
   对每个没有 `taskIds` 的阶段生成：
   - 一个 L3：`{ title: "<阶段名>任务" }`
   - 一个 L4：`{ title: "默认执行步骤" }`
   - 一个 L5：`{ title: "<阶段名>执行节点" }`
   L5 的 `nodeType` 根据阶段 gate 或角色配置推断，无法推断时默认 `carbon`，避免误触发 Agent。

6. **v1.3 工作项升级**
   如果已存在 `workItems`：
   - 保留原 `id/status/progress/assignee`。
   - 根据 `parentId` 推断 `level`。
   - 对叶子工作项补充 `executor.nodeType`，无法推断时默认 `carbon`。
   - 将相关 `workItemEvents` 追加 `flowInstanceId/stageId` 补全事件。

7. **导入关口与回执历史**
   对已有 `flowInstances[].stages[].gate.review`、阶段回执、阻塞原因生成对应 `workItemEvents`，事件 `actor.type` 设为 `system`，`payload.migrated = true`。

8. **校验和修复**
   迁移后运行校验：
   - 每个 L5 节点必须能追溯到 L4/L3/L2。
   - 每个 `stage.taskIds` 都指向存在的 L3。
   - 每个 `workItemEvents[].workItemId` 为空时必须是实例级或阶段级事件。
   - 所有依赖都指向同一 `flowInstanceId` 内存在的工作项。

### 6.3 迁移失败回退

- 如果迁移中出现 JSON 结构错误，保留原文件并恢复到预备份。
- 如果只有部分工作项迁移失败，不应删除原工作项；应把流程实例标记为 `migration_partial` 并阻止自动调度。
- 所有自动调度必须在迁移校验通过后才允许开启。

---

## 7. 兼容策略

### 7.1 项目兼容

| 项目类型 | v2.0 行为 |
|----------|-----------|
| 无 `flowInstanceId` 的旧项目 | 继续使用 `workflow.js` 固定五阶段，不自动迁移到 L2-L5 |
| 已绑定 v1.2 流程实例的项目 | 自动补充默认 L3-L5，保持阶段页面和关口操作可用 |
| v1.3 已有工作项的项目 | 优先复用工作项树，不重复生成默认任务 |
| 新建 v2.0 项目 | 选择模板后直接实例化 L2-L5 和事件初始记录 |

### 7.2 API 兼容

保留现有 v1.2 API，并将其改为引擎包装：

- `POST /api/flow-instances/:id/advance`
  转换为 `gate.review.resolved` 或 `stage.completed` 事件，再由引擎推进。

- `POST /api/flow-instances/:id/review`
  转换为 `gate.review.resolved` 事件。

- `POST /api/flow-instances/:id/return`
  转换为 `stage.return_requested` 和下游节点 `cancelled/superseded` 事件。

- `POST /api/flow-instances/:id/stages/:stageId/receipts`
  v2.0 仍支持，但内部必须映射到该阶段的默认 L5 节点或指定节点。

新增 API 建议：

- `GET /api/flow-instances/:id/runtime`
- `POST /api/flow-instances/:id/events`
- `POST /api/work-items/:id/start`
- `POST /api/work-items/:id/complete`
- `POST /api/work-items/:id/dispatch`
- `POST /api/node-runs/:id/receipts`

### 7.3 Agent 信封兼容

现有任务信封字段保留：

- `projectId`
- `projectTitle`
- `projectGoal`
- `stageKey` 或 `stageId`
- `stageTitle`
- `taskId`
- `ownerId`
- `instructions`
- `inputAssetIds`
- `note`

v2.0 只做加法：

- `flowInstanceId`
- `workItemId`
- `level`
- `nodeType`
- `dependencies`
- `attempt`
- `idempotencyKey`
- `expectedReceiptSchema`

旧 Agent 可忽略新增字段，新 Agent 必须回传 `workItemId/nodeRunId/idempotencyKey`。

---

## 8. 自动化验收标准

v2.0 至少需要以下自动化测试组。现有项目脚本为 `npm test`，因此建议在 `产品开发/nomos-desktop/tests/*.test.js` 中增加覆盖，必要时保留集成测试脚本。

### 8.1 数据迁移测试

1. **v8 数据打开后补齐 v2.0 字段**
   给定只有 `flowTemplates/flowInstances` 的 v1.2 数据，加载后应出现 `workItems/workItemEvents/nodeRuns`，旧字段不丢失。

2. **v1.2 流程阶段生成默认 L3-L5**
   给定一个 4 阶段流程实例，迁移后每个阶段至少有 1 个 L3、1 个 L4、1 个 L5，且 `stage.taskIds` 指向 L3。

3. **v1.3 工作项无损升级**
   给定已有 `workItems/workItemEvents`，迁移后原 ID、状态、进度、事件数量保持不变，只补充 v2.0 必需字段。

4. **未绑定流程项目不迁移**
   给定无 `flowInstanceId` 的旧项目，加载后仍走固定五阶段，不生成 Workflow Engine 工作项。

### 8.2 Reducer 和状态机测试

1. **事件重放确定性**
   同一组 `workItemEvents` 重放两次，得到完全相同的 `flowInstance/workItems` 快照。

2. **非法状态转移被拒绝**
   `pending -> done`、`blocked -> running` 这类未通过明确事件的跳转应返回错误并追加 `engine.error` 或拒绝写入。

3. **幂等事件只生效一次**
   同一 `idempotencyKey` 的派发事件重复提交，不应产生第二个 `nodeRun`。

4. **阶段完成条件正确**
   当阶段下所有 required L5 完成时，阶段进入 `review_pending` 或 `done`；只完成部分并行节点时不得推进。

### 8.3 依赖与分支测试

1. **DAG 循环检测**
   模板或实例中出现 A 依赖 B、B 依赖 A 时保存失败。

2. **并行节点同时 ready**
   同一 L3 下两个无互相依赖的 L5 节点，应被 Scheduler 同时识别为 ready。

3. **条件分支选择正确**
   上游回执 `payload.qualified = true` 时只激活通过分支，`false` 时只激活返工或补充材料分支。

4. **依赖未满足不得派发**
   下游 L5 在上游完成前调用 dispatch，应返回 409 或等价业务错误。

### 8.4 节点调度测试

1. **碳节点只创建人工待办**
   `nodeType = carbon` 的 L5 ready 后产生 `manual.todo.created`，不得调用 Agent 路由。

2. **硅节点自动派发并回执完成**
   `nodeType = silicon` 的 L5 ready 后创建 `nodeRun`，生成任务信封，回执 `completed` 后节点状态为 `done`。

3. **碳硅节点两段式完成**
   `nodeType = hybrid` 必须先完成 Agent 预审，再等待人工终审；没有人工终审时节点不得 `done`。

4. **失败重试和升级**
   硅节点失败一次后按 `retryLimit` 重试；超过阈值后按 `onFailure` 进入 `blocked` 或生成碳节点待办。

### 8.5 关口评审测试

1. **无关口阶段自动推进**
   阶段下所有 required 节点完成且 `gate.enabled = false` 时自动进入下一阶段。

2. **碳关口等待人工通过**
   `reviewMode = carbon` 时，阶段完成后进入 `review_pending`，人工通过后推进。

3. **硅关口自动预审**
   `reviewMode = silicon` 时，Agent 校验准出标准并产生回执，通过后推进；失败后阻塞或退回。

4. **碳硅关口不能跳过终审**
   `reviewMode = hybrid` 时，Agent 预审通过后仍需人工终审。

### 8.6 回退和恢复测试

1. **返工会取消或废弃下游节点**
   从阶段 3 退回阶段 2 时，阶段 3 及之后未完成节点应进入 `cancelled` 或 `superseded`，不能继续被调度。

2. **备份恢复后可继续调度**
   创建流程、执行部分节点、备份、恢复后，Scheduler 应识别同一批 ready 节点，不重复派发已派发节点。

3. **迁移失败保留旧数据**
   构造非法依赖数据，迁移应失败并保留原始项目和流程数据。

### 8.7 性能测试

本地单 JSON 过渡阶段的最低要求：

- 100 个流程实例、1,000 个工作项、10,000 条事件下，打开首页或流程实例列表不应明显卡死。
- 单个流程实例 runtime 快照生成 P95 小于 300ms。
- 单次事件追加和 Reducer 更新 P95 小于 150ms。
- `workItemEvents` 列表展示必须分页或按实例过滤，不能一次渲染全部事件。

### 8.8 安全测试

1. 外部事件入口必须验证来源或本地 token，不能裸接收任意公网请求。
2. Webhook 事件只能转成 Workflow 事件，不能直接执行命令。
3. Agent 回执必须校验 `flowInstanceId/workItemId/nodeRunId/idempotencyKey`。
4. 人工操作必须写入 actor，不能出现匿名状态跳转。
5. 备份恢复必须校验 `workItems/workItemEvents/nodeRuns` 类型，避免损坏 JSON 导致引擎误运行。

---

## 9. 手工验收路径

### 9.1 验收准备

准备一条 “LTC 轻量版 v2” 流程模板：

- 4 个 L2 阶段：线索管理、商机评估、方案报价、合同回款。
- 至少 12 个 L5 节点。
- 至少 2 个硅节点：如线索去重评分、客户画像生成。
- 至少 1 个碳硅节点：如商机评估建议 + 销售主管确认。
- 至少 1 个碳节点：如报价审批或合同签署。
- 至少 1 个并行节点组。
- 至少 1 个条件分支。
- 至少 1 个关口返工路径。

### 9.2 主路径验收

1. 新建项目并绑定 “LTC 轻量版 v2”。
2. 确认流程实例页面显示 L2 阶段、L3 任务、L4 步骤、L5 节点。
3. 启动流程，确认第一个阶段进入 `running`。
4. 硅节点自动创建 `nodeRun` 并派发给 Agent。
5. Agent 提交结构化回执，节点进入 `done`。
6. 并行硅节点同时可运行，互不阻塞。
7. 碳节点出现在人工待办区，不触发 Agent。
8. 人工完成碳节点后，节点进入 `done`。
9. 碳硅节点先展示 Agent 预审结果，再等待人工终审。
10. 人工终审通过后，阶段进入关口评审。
11. 关口通过后推进到下一阶段。
12. 走完 4 个阶段后，流程实例进入 `completed`，项目能看到完整事件和执行记录。

### 9.3 返工路径验收

1. 在商机评估阶段提交不合格回执。
2. 确认条件分支进入“补充材料”节点，而不是继续报价。
3. 人工在关口选择“需返工”并指定退回阶段。
4. 确认下游未完成节点被 `cancelled` 或 `superseded`。
5. 退回阶段 `attempt + 1`。
6. 重新完成后可再次推进。

### 9.4 失败和回退验收

1. 手动让一个硅节点回执 `failed`。
2. 确认系统按策略重试一次。
3. 第二次失败后节点进入 `blocked` 或升级为碳待办。
4. 创建备份并恢复。
5. 恢复后确认：
   - 已完成节点不重复派发。
   - 阻塞节点仍阻塞。
   - 人工待办仍存在。
   - 事件历史可查看。

### 9.5 兼容路径验收

1. 打开一个无 `flowInstanceId` 的旧项目。
2. 确认仍能使用固定五阶段工作流。
3. 打开一个 v1.2 绑定流程项目。
4. 确认原 L2 阶段和关口状态保留，并自动补充默认 L3-L5。
5. 调用旧阶段回执 API，确认能映射到默认 L5 节点并追加事件。

---

## 10. 性能、安全与回退要求

### 10.1 性能要求

单 JSON 过渡下，v2.0 不追求无限规模，但必须避免明显卡顿：

- `workItemEvents` 必须按 `flowInstanceId` 和时间范围查询，前端不得全量渲染。
- 后端可在内存中构建临时索引，如 `workItemsByFlowInstanceId`、`eventsByFlowInstanceId`，但索引不单独持久化。
- 单个流程实例的 runtime 快照应按需计算，并可缓存到 `flowInstances[].runtimeCache`，缓存必须能由事件重放修复。
- `nodeRuns` 和事件列表应设置软上限和分页策略。超过上限时禁止删除事实事件，可压缩为实例级归档摘要，原始数据仍随备份保留。

### 10.2 安全要求

- 外部事件入口默认关闭，开启时必须有本地 token 或签名校验。
- 外部事件只能触发白名单动作：启动流程、提交业务信号、标记外部状态，不得直接构造命令执行。
- Agent 派发必须走已有 Agent Adapter 和路由白名单。
- 所有人工审批、人工跳过、人工返工都必须写 `actor.type = user`。
- Agent 回执的 `rawSummary`、附件路径、外部引用要做长度限制和路径校验。
- 不能把准入准出条件当作可执行 JavaScript。

### 10.3 回退要求

- v2.0 发布前必须可从备份恢复到 v1.2 数据。
- v2.0 引擎应有开关，例如 `settings.workflowEngineV2Enabled`。关闭后：
  - 不再自动调度 L5。
  - 已有流程仍能查看 L2 阶段。
  - 人工可通过旧 API 推进阶段。
- 迁移必须幂等，多次加载同一数据文件不能重复生成默认 L3-L5。
- 若引擎遇到未知状态，应阻止自动调度，而不是猜测推进。

---

## 11. v2.0 实施切分建议

### 11.1 Milestone A：数据基座接入

- 接入 v1.3 `workItems/workItemEvents`。
- 增加迁移和校验。
- 为 v1.2 流程实例生成默认 L3-L5。
- 增加 runtime 快照 API。

验收重点：数据不丢、旧流程可看、默认 L3-L5 可重放。

### 11.2 Milestone B：纯引擎和事件 Reducer

- 实现 `workflow-engine.js`。
- 实现事件追加、幂等、状态重放。
- 实现阶段完成判断、依赖 ready 判断。

验收重点：不用 Agent，也能通过事件推动完整流程。

### 11.3 Milestone C：节点调度和回执

- 实现 L5 Scheduler。
- 实现碳节点待办。
- 实现硅节点任务信封和回执。
- 实现碳硅两段式执行。

验收重点：节点类型分流正确，回执可驱动状态。

### 11.4 Milestone D：关口、分支、返工

- 接入关口评审。
- 支持简单条件分支。
- 支持返工和下游节点废弃。
- 补齐手工验收路径。

验收重点：异常路径不会把流程推进到错误状态。

### 11.5 Milestone E：性能、安全、回退

- 增加分页和实例级过滤。
- 增加外部事件安全校验。
- 增加备份恢复和 feature flag。
- 完成回归测试。

验收重点：可发布、可回退、不会破坏 v1.x 基础能力。

---

## 12. v2.1 延展建议

v2.1 的主题应承接 Roadmap 中“数字员工六步生成”和 SLA 监控，不应在 v2.0 抢做。

建议范围：

1. **SLA 和超时升级**
   将 v2.0 的 `policy.timeoutMinutes` 从展示字段升级为计时器。超时后追加 `timer.event.fired`，并按策略升级为碳节点或通知负责人。

2. **数字员工上岗绑定**
   L5 硅节点不再只绑定 Agent，而是绑定经过岗位匹配、入职培训、师父带教、工具分配、上手实习、转正上岗的数字员工。

3. **执行预算和降级策略**
   借鉴 OpenRath Budget 思想，为硅节点设置 token/调用次数/执行时长预算，超限后降级为人工复核。

4. **节点质量评分**
   根据回执质量、返工次数、人工通过率，形成数字员工和流程节点的质量指标。

5. **更完整的通知和升级机制**
   超时、阻塞、评审待办、重试失败进入统一通知中心。

---

## 13. v2.2 延展建议

v2.2 可以把 v2.0 的可运行引擎升级为可治理、可优化、可扩展的流程平台。

建议范围：

1. **流程版本管理和 diff**
   支持模板版本、实例锁定版本、版本差异对比、实例选择性升级。

2. **流程仿真和瓶颈分析**
   基于历史 `workItemEvents/nodeRuns` 估计阶段耗时、阻塞概率、Agent 失败率。

3. **高级条件规则**
   在简单匹配之外引入安全的规则 DSL，但仍避免直接执行 JavaScript。

4. **跨流程编排和子流程**
   支持一个 L5 节点启动另一个流程实例，并通过事件关联父子流程。

5. **未来可选的数据层演进**
   当单 JSON 在团队协同、事件量、查询性能上达到瓶颈时，可选迁移到 SQLite 或云端同步。但这不是 v2.0/v2.1 的验收前提。

---

## 14. v2.0 最低发布门槛

v2.0 只有同时满足以下条件，才算达到工程可验收状态：

1. 一个 4 阶段、12 节点、包含碳/硅/碳硅节点的 Workflow 能完整运行到 `completed`。
2. 所有 L5 节点状态变化都能在 `workItemEvents` 中找到对应事件。
3. 硅节点可以自动派发给 Agent，并通过结构化回执推进。
4. 碳节点不会自动派发 Agent，必须由人工完成。
5. 碳硅节点必须经历 Agent 预审和人工终审。
6. 并行节点不会互相阻塞，依赖未满足的节点不会提前派发。
7. 关口评审通过、拒绝、返工三条路径都可运行。
8. v1.2 旧流程实例可迁移，未绑定流程项目不受影响。
9. 备份恢复后不会重复派发已派发节点。
10. 自动化测试覆盖迁移、状态机、依赖、调度、回执、返工、安全和回退。

---

## 15. 高风险点

1. **L2-L5 和 v1.3 工作项模型割裂**
   如果 v2.0 另造节点表而不复用 `workItems/workItemEvents`，后续看板、资源、事件审计和调度会变成两套系统。

2. **自动调度绕过事件流**
   如果代码直接改 `status` 而不追加事件，短期看似简单，长期会无法排查重复派发、错误返工和 Agent 回执争议。

3. **把条件分支做成完整规则引擎**
   v2.0 只需要简单、安全、可解释的状态匹配。过早引入复杂表达式会放大安全、测试和用户配置成本。

4. **误把碳节点自动化**
   碳节点必须是人工责任点。为了演示顺滑而自动跳过，会破坏碳硅协同的可信边界。

5. **单 JSON 性能被事件量拖垮**
   事件增长不可避免，必须从 v2.0 起按实例过滤、分页、缓存快照，不能等到 UI 卡死后再治理。
