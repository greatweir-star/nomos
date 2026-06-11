# Nomos 项目骨架

> 本文档由代码扫描自动生成，描述仓库的整体结构、核心模块与运行方式，作为后续开发的导航地图。

## 一句话定位

Nomos 是面向中小企业和 OPC（One-Person Company，一人公司）的**流程驱动型智能操作系统**。核心理念：

> 能力建在组织上，组织跑在流程上，企业运转透明可控。

北极星指标：用户能把一个端到端流程交给"人 + Agent + Workflow"协同运行，稳定得到可追踪、可验收、可复盘的结果。

## 仓库顶层结构

仓库按产品生命周期分层，避免产品资料、开发源码、正式发布混在一起。

```text
nomos/
├─ 产品规划/                # 产品层：调研、理念、PRD、版本规划
│  ├─ 00-产品理念/          # PRODUCT-DESIGN.md 等设计哲学
│  ├─ 01-调研资料/          # 华为 16 条一级流程分析、需求→流程映射
│  ├─ 02-PRD/              # 各版本 PRD（流程管理 / 组织管理 / Workflow 引擎）
│  ├─ 03-版本规划/          # ROADMAP_V1.md
│  └─ 04-详细规划/          # 架构设计文档
├─ 产品开发/                # 开发层：源码、测试用例、测试报告
│  ├─ nomos-desktop/       # ★ 桌面客户端源码（开发主入口）
│  ├─ 测试用例/
│  ├─ 测试报告/
│  └─ 模板/                 # PRD / ADR / 发布说明等文档模板
└─ 产品发布/                # 发布层：正式发布产物与版本说明
   ├─ v1.0.1/
   ├─ v1.1.0/
   └─ 发布说明/
```

## 核心应用：nomos-desktop

一个 **local-first** 的 Electron 桌面应用：单实例启动、本机 HTTP 后端、单一 JSON 文件持久化、零云依赖。当前版本 `1.1.0`。

### 运行方式

```bash
cd 产品开发/nomos-desktop
npm test            # node --test，运行 tests/*.test.js
npm start           # 启动 Electron 客户端
npm run start:server  # 仅启动本机后端（调试用）
npm run dist:win    # 打包 Windows x64 便携版
```

### 架构分层

```
electron/main.js         单实例 Electron 主进程，拉起本机后端 + 加载 renderer
        │
        ▼
backend/  （Node.js 原生 http，无第三方框架）
  server.js          HTTP 路由总入口（REST 风格，仅允许本机访问）
  store.js           JsonStore：单文件 nomos-data.json 持久化 + 迁移 + 备份/恢复
  default-data.js    默认数据、项目工厂、组织默认模板（岗位族/Skill）
  workflow.js        五阶段交付链路状态机（任务信封、回执、交接、验收、返工）
  executor.js        本地命令执行器（沙盒、写入确认、超时、取消/重试）
  deployment.js      预览发布管理
  alice.js           Alice MCP 协同协调器
  agent-registry.js  Agent 注册表与技术架构适配器目录
  agent-router.js    阶段 → Agent 路由
  agent-receipt.js   Agent 回执解析与测试报告解析
        │
        ▼
renderer/  （原生 JS，无前端框架）
  index.html         单页应用结构 + 内联样式
  app.js             全部交互逻辑（rail 导航：概览/话题/工作流/组织/设置）
```

### 数据模型（nomos-data.json）

单一 JSON 对象，由 `store.js` 的 `migrateData()` 负责版本升级与向后兼容：

| 字段 | 说明 | 引入版本 |
|------|------|---------|
| `projects[]` | 项目（流程的一次运行实例），含 stages / messages / checkpoints / workflow | v1.0.1 |
| `agents[]` | Agent 注册表（Alice / Claude Code / Codex CLI 等） | v1.0.1 |
| `agentAdapters{}` | 云端智能体接入配置 | v1.0.1 |
| `bridge{}` | 本地 Agent 配对桥 | v1.0.1 |
| `executions[]` | 本地执行记录 | v1.0.1 |
| `audit[]` | 操作审计日志（保留最近 300 条） | v1.0.1 |
| `skills[]` | 企业技能资产池（Skill Pool） | v1.1 |
| `roles[]` | 岗位模板（Skill 组合、职责、验收标准、流程矩阵） | v1.1 |
| `employees[]` | 碳基/硅基/混编员工，绑定岗位与底层 Agent | v1.1 |
| `flowTemplates[]` | 流程模板库（价值流/使能流/支撑流，阶段+关口+角色） | v1.2 |

### 核心概念

- **碳硅协同**：碳基（人工）/ 硅基（Agent）/ 混编（人机）三类员工与节点。
- **五阶段交付链路**（硬编码，v1.0.1）：需求定义 → 界面设计 → 代码开发 → 质量检查 → 发布上线，由 `workflow.js` 状态机驱动，含任务信封、阶段回执、交接记录、人工验收、失败阻塞、上游返工。
- **组织建模**（v1.1）：Skill 池 / 岗位模板 / 员工管理 / 数字员工六步生成（已实现前三步：岗位匹配、入职培训、师父带教）。
- **流程管理**（v1.2，本轮实现）：用户可定义的流程模板 + 项目绑定流程 + 关口评审，让"五阶段"从硬编码升级为可配置的流程模板。

## 版本路线图

```
v1.x 基础设施 ──→ v2.x 协同引擎 ──→ v3.x 生态智能
```

- **v1.0.1** ✅ MVP：Electron 客户端、本机后端、五阶段链路、三路 Agent 接入、备份恢复
- **v1.1** ✅ 组织管理：Skill 池 / 岗位 / 员工 / 数字员工工厂前三步
- **v1.2** ✅ 流程管理：流程库（含 LTC/IPD/ITR 三个预设轻量版模板）、流程模板 CRUD、项目绑定流程、关口评审状态机（碳/硅/碳硅评审，通过/不通过/返工）
- **v2.0** ⏳ Workflow 引擎升级：L2-L5 五级分层、碳硅节点标注、事件驱动、动态编排
- **v2.1** ⏳ 数字员工六步生成完整化 + SLA 监控
- **v3.x** ⏳ 云端同步、团队协作、组织诊断与智能推荐

## 测试

- 测试框架：Node 内置 `node:test`，无外部依赖。
- 入口：`产品开发/nomos-desktop/tests/server.test.js`（端到端起真实后端 + `fetch` 打 API）。
- 当前基线：**47 项自动化测试通过**（v1.1 的 41 项 + v1.2 流程管理新增 6 个测试套件：模板 CRUD、预设初始化、项目绑定/解绑、关口评审状态流转、引用删除保护、向后兼容）。
