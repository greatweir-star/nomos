# nomos Agent 路由协议

## 目标

nomos把工作流、路由器和适配器拆成三层：

1. 工作流维护阶段、任务信封、交付物和结构化回执。
2. 工作项维护可派发任务事实、负责人、依赖、进度和事件账本。
3. 路由器根据阶段、工作项内容、人工指定目标和适配器能力选择 Agent。
4. 适配器负责真实派发、执行或结果采集。

路由器不启动外部服务，也不包含 Agent 特有逻辑。OpenClaw 当前只登记网关能力，不会自动初始化或加入候选路由。

## 路由结果

阶段路由返回：

- `taskId`：当前阶段任务信封。
- `selectedAgent`：已经解析好的适配器事实。
- `candidates`：当前阶段候选适配器。
- `reason`：默认选择或人工指定的理由。
- `idempotencyKey`：`taskId + agentId + attempt`，用于避免同轮重复派发。

工作项路由返回：

- `workItemId`：当前工作项。
- `intent`：从标题、描述、验收标准和阶段语义中推断的任务意图，例如 `code`、`review`、`research`、`content` 或 `coordination`。
- `selectedAgent`、`candidates`、`reason`：与阶段路由一致。
- `idempotencyKey`：`workItemId + agentId + 1`，用于工作项级派发去重。

工作项派发预览：

- `POST /api/work-items/:workItemId/dispatch/preview`
- CLI 型 Agent 返回 `kind: "execution"`，复用 `/api/executions/:id/confirm` 的确认、写入二次确认、取消和重试链路。
- Alice 返回 `kind: "alice-dispatch"`，复用 `/api/alice-dispatches/:id/confirm` 的显式确认链路。

## 适配器能力

| Agent | 派发方式 | 回执方式 | 当前状态 |
| --- | --- | --- | --- |
| Alice | MCP 消息 | 手动同步结构化回执 | 已接入 |
| Codex CLI | 本地进程 | 进程退出与输出解析 | 已接入 |
| Claude Code | 本地进程 | 进程退出与输出解析 | 已接入 |
| Kimi | 本地进程 | 进程退出与输出解析 | 已接入 |
| OpenClaw | 本地网关 | 网关事件 | 仅占位，未启用 |

## Adapter 合同

本地运行时通过 `backend/local-agent-adapters.js` 注册。一个 Adapter 至少提供：

- `id`、`name`、`command`、`connectorType`、`dispatchMode`、`receiptMode`。
- `inspect()` 或 `resolveExecutable()`：返回连接事实，不在路由器里写 Agent 特有探测逻辑。
- `buildInvocation()`：仅 CLI 型 Agent 需要，用于把统一任务说明转换为本地进程调用。
- `supportsDispatch` / `supportsExecution`：决定是否进入路由候选和本地执行链路。

## 统一回执

- `backend/agent-receipt.js` 负责把 CLI 输出和 Alice 会话内容规范化为统一回执。
- Alice 回执通过 `POST /api/projects/:projectId/stages/:stageKey/agents/alice/sync` 手动同步。
- Alice 会话发现通过 `GET /api/projects/:projectId/stages/:stageKey/agents/alice/sessions` 获取最近会话，并读取已绑定会话的状态与工作目录。
- Alice 同步要求明确确认和会话 ID。普通文本仅记录为 `progress`，只有结构化 `completed` 回执才会推进工作流。
- CLI 在进程退出时使用同一解析器，并附带工作目录变更摘要。
- Codex CLI、Claude Code 与 Kimi 支持在规则页覆盖本地命令入口。空值恢复自动检测，保存前会验证命令能够解析为本地文件。
- Alice MCP 与 OpenClaw 网关不开放命令覆盖，避免绕过各自的连接与启动边界。
- 本地数据模型当前为 v9。规则页可以显式创建 JSON 快照，`GET /api/system/diagnostics` 仅返回脱敏后的运行计数和适配器状态。
- 本地备份支持恢复预览和显式确认。恢复前会自动创建 `pre-restore` 保护快照，目标 JSON 会先通过结构校验和数据迁移。
- CLI 回执会提取 Node TAP 或结构化 JSON 中的测试统计。deploy 阶段可以显式确认执行项目目录中的 `npm run <script>`，登记本机预览 URL 后进入最终人工验收。

## 参考模式

本轮参考了 `D:\Alice\Projects\xiaoman\参考源码` 中的实现方式：

- OpenClaw：核心保持插件无关，热路径携带已经解析好的路由事实，派发使用稳定幂等键。
- Claude Code：任务类型使用封闭状态集合，远程消息在边界转换为内部统一格式。
- OpenRath：通过适配器将 MCP 工具包装为统一调用协议，执行循环只依赖通用接口。

nomos没有复制这些项目的复杂运行时，只吸收了适合当前 MVP 的边界设计。
