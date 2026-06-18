# nomos Desktop

nomos是一个本地优先的 Agent 项目指挥台。桌面客户端会在本机启动后端服务，并将项目、阶段、消息、本地 Agent 配对、执行记录和审计日志保存到当前用户的数据目录。

## 当前能力

- Electron 桌面客户端，支持单实例启动；本地开发服务可在 macOS / Windows 运行。
- 本机 HTTP 后端和 JSON 持久化，无需额外数据库。
- 项目创建、编辑、删除，五阶段交付链路、消息记录和人工验收点。
- 总管工作流状态机：任务信封、结构化回执、阶段交接、待验收、失败阻塞和上游返工。
- 阶段交付物登记与删除，支持文件说明、URL 和阶段绑定。
- Alice、Codex CLI、Claude Code、Kimi、OpenClaw 本地工具检测和配对信息管理。
- Alice MCP 状态检测和本地 `alice-cli` 协作入口。
- Alice MCP 任务派发预览、显式确认和审计记录。
- 统一 Agent Adapter 接口：本机 CLI、MCP 协作、云端 API 和本地网关按同一目录上报能力。
- 统一 Agent 任务协议：Alice、Codex CLI、Claude Code 和 Kimi 共用任务信封、派发状态和结构化回执。
- Codex CLI、Claude Code 与 Kimi 的受控本地执行：执行预览、目录授权、只读模式、写入二次确认、取消、重试、超时终止和异常恢复。
- OpenClaw 仅在用户确认风险声明后初始化本地网关，默认不会自动启动。
- 本地执行结果回写、敏感确认令牌隔离和审计日志。
- 额外授权目录撤销。
- 组织管理模块：Skill 池、岗位、员工、Adapter 视图和组织健康度。
- 默认 7 大岗位族模板，可按需初始化 21 个 Skill 和 8 个岗位。
- 数字员工工厂前三步：岗位匹配、入职培训、师父带教和草稿恢复。
- 流程管理模块（v1.2）：流程模板库（价值流/使能流/支撑流三级分类）、流程模板 CRUD、
  LTC/IPD/ITR 三个开箱即用的预设轻量版模板、项目绑定/更换/解绑流程、关口评审状态机
  （碳/硅/碳硅评审，通过进入下一阶段、不通过停留、需返工回退指定阶段）。
- 工作项与看板模块（v1.3）：新增工作台入口，支持工作项 CRUD、状态流转、负责人、工时、
  截止时间、流程阶段绑定、旧 `workflowTasks` 镜像、依赖校验和事件账本。
- 进度看板与资源看板：按项目、阶段、状态、负责人聚合完成率、阻塞、逾期、本周到期、
  预计剩余工时和最近工作项事件。
- 工作项级 Agent 派发（v1.4 起步）：Nomos 可根据工作项内容推荐 Codex、Claude Code、Kimi 或 Alice，
  CLI 型 Agent 进入本地执行确认链路，Alice 进入 MCP 协作消息确认链路。

## 当前开发方式

`1.3.0` 是工作项与进度资源看板版。开发调试仍可通过本地服务验收：

```powershell
npm run start:server
```

打开 `http://127.0.0.1:4174`。

首次派发本地任务时：

1. 选择 `只读分析` 或 `代码写入`。
2. 输入允许 Agent 访问的工作目录和任务说明。
3. 检查命令预览并确认执行。
4. 写入任务会再次请求确认。

Codex CLI 派发会忽略用户级 MCP 配置，避免将桌面客户端任务意外接入外部服务。项目目录规则仍然有效。

统一 Agent 路由协议见 `AGENT-ROUTING.md`。

## 本地开发

```powershell
npm install
npm test
npm start
```

只启动浏览器可访问的本地服务：

```powershell
npm run start:server
```

打开 `http://127.0.0.1:4174`。

## 打包

```powershell
npm run dist:win
```

便携版客户端会输出到 `release` 目录。

## 数据目录

桌面版数据保存在 Electron 当前用户数据目录下。开发服务的数据保存在项目目录内的 `.local-data`。

## 主要接口

- `GET /api/health`
- `GET /api/workspace`
- `GET|POST /api/projects`
- `GET|PATCH|DELETE /api/projects/:id`
- `POST /api/projects/:id/assets`
- `DELETE /api/projects/:id/assets/:assetId`
- `POST /api/projects/:id/messages`
- `POST /api/projects/:id/advance`
- `GET /api/projects/:id/workflow`
- `GET /api/projects/:id/stages/:stageKey/agent-route`
- `POST /api/projects/:id/stages/:stageKey/receipts`
- `POST /api/projects/:id/stages/:stageKey/deliverables`
- `POST /api/projects/:id/stages/:stageKey/return`
- `POST /api/projects/:id/stages/:stageKey/alice/preview`
- `POST /api/projects/:id/stages/:stageKey/agents/:agentId/receipts`
- `POST /api/alice-dispatches/:dispatchId/confirm`
- `GET /api/agent-adapters`
- `POST /api/projects/:id/checkpoints/:checkpointId`
- `GET /api/agents`
- `PATCH /api/agents/:id`
- `GET /api/bridge`
- `POST /api/bridge/pair`
- `POST /api/bridge/refresh`
- `POST /api/bridge/openclaw/start`
- `POST /api/bridge/workspaces/allow`
- `POST /api/bridge/workspaces/revoke`
- `GET /api/audit`
- `GET /api/local-tools`
- `GET|POST /api/skills`
- `GET|PATCH|DELETE /api/skills/:id`
- `GET|POST /api/roles`
- `GET|PATCH|DELETE /api/roles/:id`
- `GET|POST /api/employees`
- `GET|PATCH|DELETE /api/employees/:id`
- `GET /api/adapters`
- `GET /api/org/health`
- `POST /api/org/init-defaults`
- `GET|POST /api/flows`
- `POST /api/flows/init-presets`
- `GET|PATCH|DELETE /api/flows/:id`
- `POST|DELETE /api/projects/:id/flow`
- `GET /api/projects/:id/flow/progress`
- `POST /api/projects/:id/flow/stages/:flowStageId/review`
- `GET|POST /api/work-items`
- `GET|PATCH /api/work-items/:id`
- `GET /api/work-items/:id/agent-route`
- `POST /api/work-items/:id/dispatch/preview`
- `POST /api/work-items/:id/cancel`
- `POST /api/work-items/:id/dependencies`
- `DELETE /api/work-items/:id/dependencies/:dependencyId`
- `GET /api/work-items/:id/events`
- `POST /api/work-items/:id/comments`
- `POST /api/work-items/sync-legacy`
- `GET|POST /api/projects/:id/work-items`
- `GET /api/projects/:id/board-summary`
- `GET /api/dashboards/progress`
- `GET /api/dashboards/resources`
- `GET /api/executions?projectId=:projectId`
- `POST /api/executions/preview`
- `POST /api/executions/:id/confirm`
- `POST /api/executions/:id/cancel`
- `POST /api/executions/:id/retry`
- `GET /api/executions/:id`
- `POST /api/deployments/preview`
- `POST /api/deployments/:id/confirm`
- `GET /api/system/diagnostics`
- `GET|POST /api/system/backups`
- `GET /api/system/backups/:fileName/inspect`
- `POST /api/system/backups/:fileName/restore`
