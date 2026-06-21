# Design: v1.3 Work Items & Dashboards

## Technical Approach

在现有 nomos 架构（Electron + Node.js 原生 http + 单文件 JSON）基础上，新增 `workItems` 和 `workItemEvents` 两层数据模型。保持 local-first、零云依赖原则，不引入外部数据库或框架。

## Architecture Decisions

### Decision: 数据模型复用现有 JsonStore

**选择**：在 `store.js` 的 `migrateData()` 中处理 v8→v9 迁移，新增 `workItems[]` 和 `workItemEvents[]`。

**理由**：
- 与现有架构一致，无需引入新存储层
- `migrateData()` 已有版本升级机制，向后兼容成熟
- 单文件 JSON 足够支撑 v1.3 的数据规模

**替代方案**：
- SQLite（拒绝：引入外部依赖，破坏 local-first 简单性）
- LevelDB（拒绝：同样需要外部依赖）

### Decision: 依赖检测用 DFS 循环检测

**选择**：在内存中对工作项依赖图做 DFS，检测环。

**理由**：
- 工作项数量在 OPC 场景下可控（单项目 < 1000）
- DFS 足够简单，无需引入图库
- 检测在写入时同步进行，延迟可接受

### Decision: 看板聚合在服务端计算

**选择**：后端 `server.js` 提供 `/api/dashboard/*` 路由，前端只负责渲染。

**理由**：
- 减少前端计算量（renderer/app.js 已经 181KB）
- 服务端可以复用现有数据访问逻辑
- 便于后续缓存和优化

### Decision: 事件日志只追加不覆盖

**选择**：`workItemEvents[]` 采用追加式日志，状态变更时 push 新事件。

**理由**：
- 审计和复盘需要完整历史
- 与现有 `audit[]` 设计一致
- 单文件 JSON 的数组 push 操作成本低

## Data Flow

```
用户操作 → renderer/app.js
  → fetch → backend/server.js
    → 路由分发
      → work-items.js（新增）→ workItems CRUD
      → workflow.js → 状态流转验证
      → store.js → nomos-data.json 读写
    → 返回 JSON
  → renderer/app.js 更新看板

后台任务（如状态自动更新）
  → workflow.js 定时检查
  → 发现依赖满足 → 状态自动推进
  → 写入 workItemEvents
```

## File Changes

### 新增文件

**后端**：
- `backend/work-items.js` — 工作项 CRUD、状态机、依赖检测
- `backend/dashboard.js` — 看板聚合查询
- `backend/migrations/v9.js` — v8→v9 迁移逻辑

**前端**：
- `renderer/pages/work-items.js` — 工作项列表/详情/编辑
- `renderer/pages/dashboard.js` — 进度看板
- `renderer/pages/resource-board.js` — 资源看板
- `renderer/components/work-item-card.js` — 工作项卡片
- `renderer/components/dependency-graph.js` — 依赖关系可视化

### 修改文件

- `backend/server.js` — 新增 `/api/work-items/*` 和 `/api/dashboard/*` 路由
- `backend/store.js` — `migrateData()` 增加 v9 迁移
- `backend/default-data.js` — 默认数据增加工作项示例
- `backend/workflow.js` — 与 workItems 状态联动
- `renderer/app.js` — 新增导航项：工作项、看板
- `renderer/index.html` — 新增页面结构

### 删除/废弃

无。

## Error Handling

| 场景 | 处理方式 |
|------|---------|
| 循环依赖检测 | 返回 409，给出环路径 |
| 跨项目依赖 | 返回 400，拒绝创建 |
| 状态非法转换 | 返回 409，给出允许的目标状态 |
| 迁移失败 | 备份原文件，回滚，记录错误日志 |
| 看板数据为空 | 返回空数组，不返回 null |

## Testing Strategy

| 层级 | 范围 | 工具 |
|------|------|------|
| 单元 | DFS 循环检测 | Node.js assert |
| 单元 | 状态机转换 | Node.js assert |
| 集成 | work-items API CRUD | server.test.js |
| 集成 | 看板聚合查询 | server.test.js |
| 集成 | v8→v9 迁移 | server.test.js |
| E2E | 工作项创建→依赖设置→状态推进 | server.test.js |
