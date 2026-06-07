# Nomos v1.3 到 v2.0 跨版本验收矩阵

> 负责人：Alice
> 创建日期：2026-06-07
> 状态：Draft
> 用途：作为 v1.2 收尾门禁，以及 v1.3-v1.6、v2.0 的发布验收和 QA 矩阵基线。

## 依据与口径

| 来源 | 本矩阵采用的信息 |
|------|------------------|
| `产品开发/PROGRESS.md` | v1.2 已完成范围、v7 到 v8 迁移、下一步 v1.3 工作项和看板方向。 |
| `产品开发/测试报告/V1.2_流程管理_测试报告.md` | v1.2 集成测试 43/43 通过，已覆盖流程模板 CRUD、流程实例、关口评审、普通项目回归。 |
| `产品规划/03-版本规划/ROADMAP_V1.md` | v1.x 基础设施、v2.0 Workflow 引擎范围、跨版本独立发布原则。 |
| `产品规划/02-PRD/PRD_V1_FLOW_MANAGEMENT.md` | 流程管理用户路径、数据模型、手工验收、流程优化闭环方向。 |
| `产品规划/02-PRD/PRD_V1_WORKFLOW_ENGINE.md` | v2.0 L2-L5、碳硅节点、事件驱动、动态编排、监控验收口径。 |
| `产品开发/nomos-desktop/run-integration-tests.js` | v1.2 当前集成测试脚本的接口覆盖和缺口。 |
| `产品开发/nomos-desktop/tests/server.test.js` | 现有 Node 测试对项目、Agent、备份恢复、安全和部署链路的回归覆盖。 |

### 阻断级别

| 级别 | 定义 | 发布动作 |
|------|------|----------|
| P0 发布阻断 | 数据丢失、静默错误、安全确认绕过、核心流程无法继续、旧版本无法恢复。 | 不允许发版。 |
| P1 发布阻断 | 主链路接口或 UI 无法完成版本承诺，或自动化测试缺失但风险已知。 | 默认不允许发版，除非产品负责人书面豁免并记录回退方案。 |
| P2 非阻断观察 | 不影响主链路，但会影响效率、可观测性、体验或后续扩展。 | 可发版，必须进入下版 backlog。 |

## v1.2 收尾发现风险

| 风险 | 当前证据 | 必须补齐的期望 |
|------|----------|----------------|
| 未评审阶段不可 advance 的断言不够精确 | `run-integration-tests.js` 已测“当前阶段仍 in_progress 时 advance 返回 400”，但未覆盖“阶段已 completed 进入 review_pending，尚未 approve 时 advance”。 | `POST /api/flow-instances/:id/stages/:stageId/receipts` 提交 completed 后，直接 `POST /api/flow-instances/:id/advance` 必须返回 400，`currentStageId` 与阶段状态保持不变；只有 `POST /api/flow-instances/:id/review` approve 后才能推进。 |
| 旧 v7 备份需要 inspect/restore | 历史实现若先严格 `validateData()` 再 `migrateData()`，旧 v7 备份缺少 `flowTemplates` 和 `flowInstances` 时可能被拒绝；该风险必须用回归测试锁住。 | `GET /api/system/backups/:fileName/inspect` 能读取 v7 备份并返回 `dataVersion: 8`；`POST /api/system/backups/:fileName/restore` confirm 后能恢复旧项目，并补齐 `flowTemplates: []`、`flowInstances: []`。 |
| 首次进入流程页必须加载数据 | `renderer/app.js` 中 `loadFlowData()` 存在，但首次 `renderWorkflowHomePage()` 未看到入口调用，流程库/实例追踪可能先渲染空状态。 | 用户路径“首页左侧工作流 → 流程库 / 实例追踪”首次进入时必须触发 `GET /api/flow-templates` 和 `GET /api/flow-instances`，并在响应后显示模板卡片和实例列表；失败时显示错误提示，不允许静默空白。 |
| 无效 `templateId` 不应静默成功 | `POST /api/projects` 当前在创建项目后尝试 `createFlowInstance()`，捕获“流程模板不存在”后继续返回 201 普通项目。 | `POST /api/projects` 携带不存在的 `templateId` 必须返回 400，错误为“流程模板不存在”或同等明确文案，且不得创建项目、不得写审计为成功项目创建。 |

## 跨版本主矩阵

### v1.2 收尾门禁：流程管理发布前冻结项

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| 流程模板库 CRUD 与默认模板 | 已有：`GET /api/flow-templates`、`POST /api/flow-templates`、`PATCH /api/flow-templates/:id`、`DELETE /api/flow-templates/:id`、`POST /api/flow-templates/:id/clone`。补充：初始化默认组织后至少存在 `LTC 轻量版`、`项目交付`，分类筛选 `?category=value_stream` 和搜索 `?search=ltc` 返回稳定结果。 | 用户路径：工作流 → 流程库 → 新建流程模板，创建 4 阶段、3 关口的 LTC 轻量版；编辑描述、复制副本、删除未绑定副本。预期：列表、详情、复制和删除即时刷新。 | v7/v8 数据打开后必须存在 `flowTemplates` 数组；默认模板只在初始化默认组织时追加，重复初始化不重复创建同名模板。 | 组织初始化、岗位/角色列表、项目创建模板选择、系统诊断 `dataVersion`。 | 模板 CRUD 任一主接口 5xx；删除被引用模板返回 200；同名模板允许重复；默认模板缺失且无法创建。 | 模板使用次数、阶段平均耗时暂可用占位，但不得显示明显错误数字。 |
| 项目绑定流程与流程实例 | 已有：`POST /api/projects` 带合法 `templateId` 返回 201、`flowInstanceId` 和 `_flowInstance`；`POST /api/flow-instances` 独立创建实例；`GET /api/projects/:id` 返回 `_flowInstance`。补充：无效 `templateId` 返回 400 且不创建项目。 | 用户路径：新建项目 → 选择流程模板 → 进入项目详情。预期：项目显示模板阶段，流程实例当前阶段为第一阶段 `in_progress`，不绑定模板的项目仍走五阶段链路。 | v8 数据中项目的 `flowInstanceId` 必须能反查到 `flowInstances[]`；删除流程实例后项目引用清空。 | 普通项目创建、普通项目 `POST /api/projects/:id/advance`、项目详情加载、备份恢复后项目详情。 | 无效模板静默创建普通项目；绑定后项目详情找不到 `_flowInstance`；删除实例后残留悬挂引用导致详情报错。 | 更换模板时旧阶段历史如何展示可后续优化，但必须有明确确认提示。 |
| 关口评审与阶段推进 | 已有：阶段回执 completed 进入 `review_pending`，review reject 进入 `blocked`，return 回到 `in_progress`，review approve 后 advance 到下一阶段。补充：未 approve 的 `review_pending` 不可 advance。 | 用户路径：实例追踪 → 进入实例 → 提交阶段完成回执 → 执行不通过、返工、再次提交、通过、推进。预期：每一步状态、当前阶段、审计记录一致。 | 恢复旧数据后，已有普通项目的五阶段 `checkpoints` 不被流程关口覆盖；流程实例阶段的 `gate.review` 字段完整。 | 工作流状态机、阶段回执、人工 checkpoint、Agent receipt、Alice sync。 | 未评审可以推进；reject 后仍可 advance；return 未记录原因；approve 后推进跳错阶段。 | 评审文案、评审人展示可后续补强，但接口数据要完整。 |
| 流程页首次加载 | 新增 UI 或 renderer 测试：首次切到 `workflow` tab 时必须调用 `GET /api/flow-templates` 和 `GET /api/flow-instances`；响应前显示加载态，响应后显示真实模板和实例。 | 用户路径：冷启动应用 → 首页左侧工作流 → 流程库；不手动刷新。预期：默认模板直接可见；实例追踪能看到已绑定项目。 | 从 v7/v8 数据启动时，流程页不因缺少字段空白或报错。 | 首页导航、工作流概览、流程库、实例追踪、项目创建弹窗模板下拉。 | 首次进入显示“暂无流程模板”但接口实际有数据；接口失败无提示；流程页 JS 报错中断后续页面。 | 加载骨架屏和错误重试按钮可后续优化。 |
| 本地备份 inspect/restore | 已有：新 v8 备份需要确认、inspect 返回项目数、restore 创建 pre-restore 保护备份。补充：手工构造旧 v7 备份缺少 `flowTemplates`、`flowInstances`，inspect/restore 仍成功迁移。 | 用户路径：设置 → 备份 → 查看旧备份 → 恢复。预期：恢复前有保护备份，恢复后项目数量和旧链路可用，系统诊断 `dataVersion=8`。 | 旧 v7 备份恢复后补齐 `flowTemplates: []`、`flowInstances: []`、`bridge.adapterCommands`、Agent adapters；旧项目工作流字段经 `ensureProjectWorkflow()` 补齐。 | 备份列表、路径穿越拦截、恢复时 active execution 阻断、系统诊断脱敏。 | 旧备份无法 inspect/restore；恢复后数据丢失；恢复时没有保护备份；运行中执行可恢复。 | inspect 页面可后续展示流程模板数和流程实例数。 |

### v1.3：工作项和看板

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| 工作项模型与项目/流程阶段映射 | 待实现接口契约：`POST /api/work-items` 创建工作项，入参包含 `projectId`、`flowInstanceId?`、`stageId?`、`title`、`ownerId?`、`priority`；`GET /api/work-items?projectId=:id` 返回按项目过滤；`PATCH /api/work-items/:id` 可更新标题、负责人、状态。预期：工作项必须归属项目；绑定流程项目的工作项可映射到当前流程阶段。 | 用户路径：项目详情 → 工作项 → 新建工作项，选择当前流程阶段和负责人。预期：卡片出现在项目工作项列表，阶段名称、负责人、优先级可见。 | v8 到 v9 增加 `workItems: []` 和 `workItemEvents: []`；旧项目默认无工作项但项目详情不报错；已有 `workflowTasks` 按明确规则生成镜像项，且不能破坏旧任务信封。 | 项目创建、流程实例详情、普通五阶段项目、Agent 任务回执。 | 工作项可无项目悬挂；删除项目后工作项残留导致看板报错；流程阶段 ID 不存在仍保存成功。 | 工作项描述富文本、附件、评论可后续迭代。 |
| 看板视图与状态流转 | 待实现接口契约：`GET /api/work-items?projectId=:id` 返回卡片；`PATCH /api/work-items/:id/status` 更新 `todo`、`ready`、`in_progress`、`review_pending`、`blocked`、`done`、`cancelled`；并发更新需要 `updatedAt` 或版本号校验；每次状态变化写入 `workItemEvents`。 | 用户路径：项目详情 → 看板 → 将卡片从“待办”改为“进行中”再到“待验收”。预期：刷新后状态保持；阻塞卡片显示阻塞原因。 | v9 数据无工作项时显示空看板；未知旧状态映射到 `todo` 并记录观察项，不丢弃卡片。 | 流程实例追踪、项目列表进度、阶段回执生成卡片。 | 状态更新后刷新丢失；同一工作项在多列重复；状态更新未校验项目归属；状态变更无事件。 | 拖拽、WIP 限制、泳道、快捷键可后续增强。 |
| 工作项和关口验收关联 | 自动化：当阶段关口要求交付物时，`POST /api/flow-instances/:id/stages/:stageId/receipts` 可引用已完成工作项；未完成必需工作项时 review approve 返回 400 或明确提示。 | 用户路径：完成阶段工作项 → 提交阶段回执 → 关口评审。预期：评审页能看到相关工作项完成率和阻塞项。 | 旧流程实例没有工作项关联时，关口仍按 v1.2 文本准出标准运行。 | v1.2 关口评审、普通项目 advance、备份恢复。 | 未完成必需工作项却允许关口通过；工作项状态改变后阶段进度不更新。 | 自动汇总完成率可先按数量计算，后续再加权。 |
| 项目级进度和资源看板 | 自动化：`GET /api/projects/:id/board-summary` 返回工作项总数、完成数、阻塞数、负责人分布；空项目返回 0 而不是 null。 | 用户路径：首页项目卡 → 打开看板摘要。预期：项目卡上的进度与看板数量一致，负责人筛选生效。 | v9 迁移后旧项目 summary 全部为 0；恢复 v8 备份后重新计算 summary。 | 首页项目列表、项目详情、组织员工列表。 | 项目卡进度与工作项完成数明显不一致；负责人删除后看板崩溃。 | 资源利用率可先作为观察指标，不作为 v1.3 阻断。 |

### v1.4：Agent 派发增强

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| 从工作项派发 Agent | 待实现接口契约：`POST /api/work-items/:id/dispatch/preview` 生成派发预览和 `confirmationToken`；`POST /api/work-item-dispatches/:dispatchId/confirm` 必须带 `confirm: true`；确认后工作项状态变为 `in_progress`，并写入 `dispatch.confirmed` 事件。 | 用户路径：看板卡片 → 派发给 Alice / Codex CLI / Claude Code。预期：预览任务信封包含项目、流程阶段、工作项验收标准；确认后卡片显示派发目标和外部引用。 | v9 到 v10 增加 `workItemDispatches: []` 或统一到现有 `executions`/`aliceDispatches`；旧执行记录仍能关联项目阶段，不强制关联工作项。 | 现有 Alice preview/confirm/sync、本地执行 preview/confirm/cancel/retry、Agent route。 | 无确认即可派发；派发信封缺少项目或工作项上下文；确认 token 或 tokenHash 泄露到列表接口。 | 派发模板文案可继续打磨，但结构化字段必须稳定。 |
| 幂等、重试与取消 | 自动化：同一工作项、同一 Agent、同一 attempt 重复派发返回已有 dispatch 或 409；取消运行中的派发后工作项回到可重派状态；失败重试 attempt +1，旧回执不能覆盖新 attempt。 | 用户路径：重复点击派发、取消本地执行、失败后重试。预期：不会产生重复任务，不会错绑回执。 | 迁移时为旧 `workflowTasks`、`executions` 补 `attempt` 和 `idempotencyKey`，缺失时按历史顺序生成。 | 本地执行、Alice 会话同步、阶段回执、审计日志。 | 重复派发多个 Agent 同时执行同一工作项且无提示；取消后仍可导入完成回执；旧 attempt 回执覆盖新状态。 | 重试策略的最大次数可作为可配置项后续补充。 |
| Agent 能力路由和权限 | 自动化：`GET /api/projects/:projectId/stages/:stageKey/agent-route?workItemId=:id` 或新路由接口按工作项类型、节点属性、Agent 可用性选择；OpenClaw 不可派发时返回 400；工作目录越权仍被拦截。 | 用户路径：派发下拉中只展示可用 Agent；选择不可用 Agent 有明确解释。预期：Alice MCP 走消息派发，Codex/Claude 走本地执行确认。 | 旧 adapter 配置继续脱敏保存；新增 Agent capability 字段缺失时走安全默认值 `supportsDispatch: false`。 | Bridge refresh、adapter configure、allowed workspaces、untrusted origin。 | 不可用 Agent 可派发；workspace-write 没有二次确认；云端 token 原文出现在 API 返回。 | Agent 推荐理由可后续优化，但必须可解释。 |
| 回执回收与看板联动 | 自动化：`POST /api/work-items/:id/agents/:agentId/receipts` 支持 progress/completed/failed；completed 自动进入 `review_pending` 或 `done`；failed 写阻塞原因并可建议退回流程阶段。 | 用户路径：Alice 会话完成 → 同步回执 → 看板卡状态更新 → 阶段进度更新。预期：工作项、阶段、项目消息三处一致。 | 旧阶段回执仍可存在于项目 `taskReceipts`；新工作项回执不能破坏旧链路。 | parseAgentReceipt、parseTestReport、项目消息、关口评审。 | Agent completed 不更新工作项；failed 不阻塞；回执状态和看板状态互相矛盾。 | 回执摘要质量和附件预览可作为观察项。 |

### v1.5：资源、产能、成本与组合看板

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| 产能计划与资源分配 | 待实现接口契约：`POST /api/capacity-plans` 创建员工/Agent/角色周期容量；`GET /api/dashboards/capacity` 返回 capacity、allocated、reserved、overloaded、unknown。 | 用户路径：资源看板 → 设置本周容量 → 查看员工和 Agent 分配。预期：超载、未估算、角色缺口均有明确提示。 | v10 到 v11 增加 `capacityPlans: []`、`resourceAllocations: []`；旧项目无容量数据时显示 unknown/空态。 | v1.3 工作项估算、v1.4 Agent 派发、员工/角色/Agent 列表。 | capacity 为 0 或缺失被当作 0 参与利用率；跨执行者错算；删除工作项后聚合崩溃。 | 容量预测可先只做 7/14/30 天窗口。 |
| 成本记录与成本看板 | 自动化：`POST /api/cost-entries` 支持 human_time、agent_usage、external_service；`GET /api/dashboards/costs` 按项目、类型、执行者聚合，并保留 unknown。 | 用户路径：给工作项补人工估算成本，给 Agent 派发补使用成本，查看项目成本拆分。预期：unknown 成本单独展示，不伪装为 0。 | v11 增加 `costEntries: []`；旧执行记录若无成本字段不自动生成 actual，只可生成待确认建议。 | Agent 派发、工作项、项目详情、系统诊断。 | 敏感成本字段进入 Agent 信封；unknown 被当作 0；成本聚合跨项目串账。 | ROI 可先用用户输入 expectedValue 做草算。 |
| 项目组合健康看板 | 自动化：`GET /api/dashboards/portfolio` 返回项目健康、阻塞、逾期、成本偏差、资源风险；空组合返回空数组。 | 用户路径：创建 portfolio view → 选择 3 个项目 → 查看 green/yellow/red 健康矩阵。预期：能从风险项跳转到工作项、派发或成本记录。 | v11 增加 `portfolioViews: []`；旧项目无资源/成本数据时不阻断组合看板。 | 首页项目列表、项目详情、工作项看板、成本看板。 | red/yellow 判定缺证据；风险项无法定位具体项目或工作项；项目删除后组合看板崩溃。 | 健康规则可先固定，后续再配置。 |
| 指标快照 | 自动化：`POST /api/dashboard-snapshots` 固化当前过滤器、口径版本和指标；后续数据变化不改历史快照。 | 用户路径：项目组合评审前保存快照，修改工作项后再打开旧快照。预期：旧快照保持原数值和口径说明。 | v11 增加 `dashboardSnapshots: []`；恢复备份后快照仍可打开。 | 资源看板、成本看板、组合看板、v1.6 复盘。 | 快照只保存引用导致历史漂移；缺 metricDefinitions；过滤器丢失。 | 快照导出可后续增强。 |

### v1.6：知识沉淀、决策复盘与模板治理

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| 决策记录 | 待实现接口契约：`POST /api/decision-records` 创建关键决策，至少包含 context、options、selectedOption、rationale、evidenceRefs；缺上下文返回 400。 | 用户路径：关口评审或模板 major 变更 → 新建决策记录 → 关联项目/模板/工作项。预期：后续可按项目、模板、决策类型追溯。 | v11 到 v12 增加 `decisionRecords: []`；旧数据为空数组。 | 关口评审、模板治理、复盘中心。 | 决策记录无证据或上下文仍可保存；决策更新无审计；模板 major 变更绕过决策记录。 | 决策有效性可先由人工标记。 |
| 知识资产库 | 自动化：`POST /api/knowledge-assets` 支持 sop、example、prompt、checklist、acceptance_criteria、failure_case；搜索支持 type、skillId、flowTemplateId、search。 | 用户路径：从 Agent 回执或复盘中沉淀 SOP/失败案例，关联 Skill 和流程阶段。预期：知识资产可搜索、可追溯来源。 | v12 增加 `knowledgeAssets: []`；导入同 ID 资产生成新 ID，不覆盖 active 资产。 | 工作项回执、Agent 派发、Skill、流程模板。 | sensitive 知识资产默认导出；导入覆盖本地 active；token/本地路径未脱敏。 | 向量检索不在 v1.6 范围，关键字搜索即可。 |
| 复盘与行动项 | 自动化：`POST /api/retrospectives` 可关联项目、阶段、Agent、v1.5 快照；行动项可转工作项或知识资产。 | 用户路径：项目结束 → 生成复盘 → 将行动项转为工作项/知识资产。预期：复盘引用工作项、派发、成本和关口证据。 | v12 增加 `retrospectives: []`；旧项目无复盘时显示空态。 | v1.3 工作项、v1.4 派发、v1.5 快照。 | 复盘保存后证据丢失；行动项跨项目误关联；完成工作项不回写行动项状态。 | 复盘模板可先固定。 |
| 模板版本治理与 v2.0 准备度 | 自动化：迁移时为已有 `flowTemplates[]` 创建 baseline `templateVersions[]`；`POST /api/template-versions/:id/activate` 只影响新建实例；`GET /api/governance/v2-readiness` 返回缺口和阻断项。 | 用户路径：流程模板 → 创建新 draft 版本 → 填变更摘要和决策记录 → 激活 → 新建项目验证使用新版本；运行中实例不变。 | v12 增加 `templateVersions: []`、`governanceChecks: []`；旧模板生成 baseline active 版本。 | 流程模板 CRUD、项目绑定流程、备份恢复、v2.0 迁移夹具。 | 激活版本静默修改运行中实例；准备度把缺工作项/派发策略/复盘样本误判为通过；major 变更无摘要。 | 模板 diff 可先用摘要，不要求逐字段可视化。 |

### v2.0：Workflow 引擎

| 能力域 | 必须自动化测试 | 必须手工验收 | 数据迁移验收 | 回归范围 | 发布阻断项 | 非阻断观察项 |
|--------|----------------|--------------|--------------|----------|------------|--------------|
| L2-L5 五级分层实例 | 待实现接口契约：`POST /api/workflow-instances` 从流程模板创建 L2 阶段、L3 任务、L4 步骤、L5 节点；`GET /api/workflow-instances/:id` 返回完整树和当前活跃节点；节点顺序、父子关系、状态合法。 | 用户路径：用 LTC 轻量版创建 4 阶段、12 节点工作流。预期：监控面板能从阶段展开到任务、步骤、节点。 | v12 到 v20：现有 `flowInstances[]` 迁移为新 `workflowInstances[]` 或兼容视图；项目引用从 `flowInstanceId` 迁移到 `workflowInstanceId` 时必须保留旧 ID 映射。 | v1.2 流程实例、v1.3 工作项、v1.4 派发、v1.5 资源/成本、v1.6 模板版本。 | 迁移后旧流程实例不可打开；父子层级丢失；节点状态无法汇总到阶段。 | L3-L5 可选配置的简化模式可先保留。 |
| 碳、硅、碳硅节点调度 | 自动化：硅节点自动调用 Agent 派发；碳节点只生成待办不派发 Agent；碳硅节点先 Agent 预审再人工终审；回执必须绑定 `nodeId`、`attempt`、`executor`。 | 用户路径：LTC 流程至少包含 2 个硅节点、1 个碳硅节点、1 个碳节点并完整运行。预期：硅节点自动完成，碳硅节点显示预审结果，碳节点等待人工处理。 | 旧 Agent dispatch 迁移为节点执行日志时，不能丢失执行输出、错误、确认记录。 | Agent route、execution confirmation、Alice sync、工作项回执。 | 碳节点被自动派发；硅节点不自动派发且无阻塞说明；碳硅节点绕过人工终审。 | Agent 选择策略可先简单，但必须有可解释理由。 |
| 事件驱动和动态编排 | 自动化：`POST /api/workflow-events` 支持内部事件、HTTP webhook 入口、时间事件模拟；条件分支按节点输出选择路径；并行任务全部完成后才进入关口；失败节点可重试、升级、跳过但必须留审计。 | 用户路径：合同回款工作流模拟到账、逾期 7 天、逾期 14 天三种事件。预期：正常到账自动确认，7 天触发提醒，14 天升级为人工节点。 | 旧线性流程实例迁移后默认无分支；历史阶段顺序仍可回放。 | 项目 advance、关口 return、工作项看板状态。 | 事件可修改已完成实例；并行任一任务未完成却推进关口；条件分支走错且无日志。 | Webhook 管理界面不在 v2.0 范围内，但 API 必须可测。 |
| 关口自动判断和人工复核 | 自动化：关口节点读取准入/准出条件；硅评审在满足条件时自动 passed，不满足 blocked；碳硅评审必须记录 Agent 建议和人工最终决定；未满足必需输入不得 approve。 | 用户路径：阶段完成 → 自动关口判断 → 人工复核或返工。预期：准入/准出标准、证据、评审人、时间完整展示。 | v1.2 `gate.review` 迁移到 v2.0 gate 节点记录，历史 approve/reject/return 可读。 | v1.2 关口评审、v1.6 知识资产和决策记录。 | 关口无证据自动放行；人工 reject 被硅评审覆盖；历史关口记录丢失。 | 准入准出的规则表达能力可先简单状态匹配。 |
| 实时监控、日志和可回放 | 自动化：`GET /api/workflow-instances/:id/logs` 返回节点执行日志；`GET /api/workflow-instances/:id/status` 返回当前阶段、活跃节点、阻塞节点；完成实例可只读回放。 | 用户路径：工作流监控面板查看当前运行位置、阻塞原因和执行日志。预期：刷新后状态一致，已完成实例不可被事件再次推进。 | 迁移后历史 `audit`、`taskReceipts`、`executions`、`agentDispatches`、`workItemEvents` 能在日志视图中被引用。 | 系统审计、备份恢复、v2.0 准备度和模板版本。 | 监控状态与实例详情不一致；日志缺少失败原因；完成实例仍可被写入。 | 热力图和瓶颈图可后续增强，v2.0 至少要有原始状态和日志。 |

## 立即补齐的自动化测试清单

| 优先级 | 测试名称 | 建议落点 | 接口/路径 | 预期结果 |
|--------|----------|----------|-----------|----------|
| P0 | `flow advance requires approved gate` | `run-integration-tests.js` 或 `tests/server.test.js` | completed 回执后直接 `POST /api/flow-instances/:id/advance` | 返回 400；`currentStageId` 不变；阶段仍 `review_pending` 且 `gate.review.status` 未 `approved`。 |
| P0 | `invalid project templateId is rejected` | `tests/server.test.js` | `POST /api/projects`，body 带不存在的 `templateId` | 返回 400；项目列表不出现该标题；审计不记录成功创建。 |
| P0 | `legacy v7 backup can inspect and restore` | `tests/server.test.js` | 手工写入缺少 `flowTemplates`、`flowInstances` 的 `nomos-data-legacy-v7.json` 到 backups，再调用 inspect/restore | inspect 返回 200 和 `dataVersion: 8`；restore 返回 200；恢复后数据含两个数组且旧项目可打开。 |
| P1 | `workflow tab first load fetches flow data` | renderer 单测或 Playwright | 冷启动后点击工作流，再进流程库/实例追踪 | 首次进入触发 `GET /api/flow-templates`、`GET /api/flow-instances`；默认模板可见；无静默空态。 |
| P1 | `backup inspect reports flow counts` | `tests/server.test.js` | `GET /api/system/backups/:fileName/inspect` | 返回 `flowTemplateCount`、`flowInstanceCount` 或同等字段；旧备份迁移后为 0。 |
| P1 | `project create with template is atomic` | `tests/server.test.js` | 模拟 `createFlowInstance()` 抛错 | 请求失败时不落项目、不写半成品引用。 |
| P1 | `flow page API failure has visible error state` | renderer 单测或 Playwright | mock `GET /api/flow-templates` 500 | UI 显示加载失败和重试入口，不显示“暂无模板”。 |

## 发布验收执行顺序

| 顺序 | 动作 | 通过标准 |
|------|------|----------|
| 1 | 跑 v1.2 API 与 server 自动化测试。 | 所有 P0/P1 用例通过，测试报告记录总数、通过数、失败数。 |
| 2 | 用旧 v7 备份做 inspect/restore 演练。 | inspect、restore、系统诊断、项目详情全部通过。 |
| 3 | 冷启动做流程页手工验收。 | 流程库、实例追踪、项目创建模板下拉首次加载真实数据。 |
| 4 | 创建绑定模板项目并完成一次关口闭环。 | completed → review_pending → reject → return → completed → approve → advance 状态全正确。 |
| 5 | 普通项目回归。 | 不绑定模板项目仍是五阶段，`POST /api/projects/:id/advance` 正常。 |
| 6 | 备份保护和安全回归。 | 创建备份需确认，恢复有 pre-restore，active execution 阻断恢复，敏感 token 不出现在 API 返回。 |
