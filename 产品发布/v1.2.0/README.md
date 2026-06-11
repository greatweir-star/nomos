# nomos Desktop

nomos是一个本地优先的 Agent 项目指挥台。桌面客户端会在本机启动后端服务，并将项目、阶段、消息、本地 Agent 配对、执行记录和审计日志保存到当前用户的数据目录。

## 当前能力

- Electron Windows 桌面客户端，支持单实例启动。
- 本机 HTTP 后端和 JSON 持久化，无需额外数据库。
- 项目创建、编辑、删除，五阶段交付链路、消息记录和人工验收点。
- 总管工作流状态机：任务信封、结构化回执、阶段交接、待验收、失败阻塞和上游返工。
- 阶段交付物登记与删除，支持文件说明、URL 和阶段绑定。
- Alice、Claude Code、Codex CLI、OpenClaw 本地工具检测和配对信息管理。
- Alice MCP 状态检测和本地 `alice-cli` 协作入口。
- Alice MCP 任务派发预览、显式确认和审计记录。
- 统一 Agent 任务协议：Alice、Codex CLI 和 Claude Code 共用任务信封、派发状态和结构化回执。
- Codex CLI 与 Claude Code 的受控本地执行：执行预览、目录授权、只读模式、写入二次确认、取消、重试、超时终止和异常恢复。
- OpenClaw 仅在用户确认风险声明后初始化本地网关，默认不会自动启动。
- 本地执行结果回写、敏感确认令牌隔离和审计日志。
- 额外授权目录撤销。
- 组织管理模块：Skill 池、岗位、员工、Adapter 视图和组织健康度。
- 默认 7 大岗位族模板，可按需初始化 21 个 Skill 和 8 个岗位。
- 数字员工工厂前三步：岗位匹配、入职培训、师父带教和草稿恢复。

## 当前开发方式

`1.1.0` 是组织管理版。开发调试仍可通过本地服务验收：

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
