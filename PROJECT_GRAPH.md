# Project Graph: Nomos

> 生成时间：2026-06-12 08:15
> 项目路径：/Users/zhongqiwei/projects/nomos
> 版本：v1.3.0
> 分析者：Alice #A60525（按"定式"skill执行）

## 一、项目概览

| 属性 | 值 |
|------|------|
| 项目名称 | Nomos |
| 定位 | 面向中小企业和 OPC 的流程驱动型智能操作系统 |
| 核心理念 | 能力建在组织上，组织跑在流程上，企业运转透明可控 |
| 技术栈 | Electron + Node.js 原生 http（无框架） |
| 前端 | 原生 JavaScript（无 React/Vue） |
| 后端 | Node.js 原生 http 模块（无 Express/FastAPI） |
| 持久化 | 单一 JSON 文件（nomos-data.json） |
| 当前版本 | v1.3.0 |
| 测试状态 | 47 项自动化测试通过 |
| 构建工具 | electron-builder |

## 二、目录结构

```
nomos/
├── 产品规划/                   # 产品层
│   ├── 00-产品理念/            # 设计哲学
│   ├── 01-调研资料/            # 需求→流程映射
│   ├── 02-PRD/                 # 各版本 PRD
│   ├── 03-版本规划/            # ROADMAP
│   └── 04-详细规划/            # 架构设计
│
├── 产品开发/                   # 开发层
│   ├── nomos-desktop/          # ★ 桌面客户端源码
│   │   ├── electron/
│   │   │   └── main.js         # Electron 主进程（1.8KB）
│   │   ├── backend/            # Node.js 本机后端
│   │   │   ├── server.js       # HTTP 路由总入口（82.8KB）⚠️ 偏大
│   │   │   ├── work-items.js   # 工作项管理（37.5KB）
│   │   │   ├── executor.js     # 本地命令执行器（31.9KB）
│   │   │   ├── workflow.js     # 五阶段交付链路状态机（19.7KB）
│   │   │   ├── flow.js         # 流程管理（16.1KB）
│   │   │   ├── agent-registry.js # Agent 注册表（13.8KB）
│   │   │   ├── alice.js        # Alice MCP 协同协调器（12.5KB）
│   │   │   ├── default-data.js # 默认数据/工厂（12.3KB）
│   │   │   ├── store.js        # JsonStore 持久化（7.7KB）
│   │   │   ├── deployment.js   # 预览发布管理（4.8KB）
│   │   │   ├── agent-receipt.js # Agent 回执解析（4.4KB）
│   │   │   └── agent-router.js # 阶段→Agent 路由（2.2KB）
│   │   ├── renderer/           # 前端（原生 JS）
│   │   │   ├── app.js          # 全部交互逻辑（181.2KB）⚠️ 非常大
│   │   │   └── index.html      # 单页结构+内联样式（140.6KB）⚠️ 偏大
│   │   ├── tests/
│   │   │   └── server.test.js  # 端到端测试（83.5KB）
│   │   ├── scripts/
│   │   │   └── start-server.js # 启动脚本
│   │   ├── docs/               # 文档
│   │   ├── package.json        # v1.3.0
│   │   └── default-data.js     # 渲染层默认数据（5.1KB）
│   ├── 测试用例/
│   ├── 测试报告/
│   ├── 模板/                    # PRD/ADR/发布说明模板
│   └── 产品开发方法论与流程.md  # 方法论文档
│
├── 产品发布/                   # 发布层
│   ├── v1.0.1/
│   ├── v1.1.0/
│   └── 发布说明/
│
├── nomos.md                    # 项目骨架文档（自动扫描生成）
└── README.md
```

## 三、架构层

### 入口层
| 文件 | 职责 |
|------|------|
| `electron/main.js` | Electron 主进程，单实例启动，拉起本机后端 + 加载渲染页 |
| `scripts/start-server.js` | 仅启动本机后端（调试用） |
| `package.json` | Electron 应用配置，electron-builder 打包 |

### API 层（后端）
| 文件 | 职责 |
|------|------|
| `backend/server.js` | HTTP 路由总入口，REST 风格，仅允许本机访问（82.8KB） |

### 业务逻辑层（后端）
| 模块 | 文件 | 职责 |
|------|------|------|
| 工作流 | `workflow.js` | 五阶段交付链路状态机（需求→设计→开发→检查→发布） |
| 流程 | `flow.js` | 流程模板库、项目绑定、关口评审 |
| 工作项 | `work-items.js` | 工作项 CRUD、任务信封、回执管理 |
| 执行器 | `executor.js` | 本地命令执行（沙盒、超时、取消/重试） |
| Agent 注册 | `agent-registry.js` | Agent 注册表、技术架构适配器 |
| Agent 路由 | `agent-router.js` | 阶段→Agent 路由决策 |
| Agent 回执 | `agent-receipt.js` | 回执解析、测试报告解析 |
| Alice 协同 | `alice.js` | Alice MCP 协同协调器 |
| 发布 | `deployment.js` | 预览发布管理 |

### 数据层（后端）
| 文件 | 职责 |
|------|------|
| `backend/store.js` | JsonStore：单一 JSON 文件持久化 + 迁移 + 备份/恢复 |
| `backend/default-data.js` | 默认数据、项目工厂、组织默认模板 |

### 前端层
| 文件 | 职责 |
|------|------|
| `renderer/app.js` | 全部交互逻辑：rail 导航（概览/话题/工作流/组织/设置） |
| `renderer/index.html` | 单页应用结构 + 内联样式 |

## 四、关键调用关系

```
用户 → Electron 主进程 (main.js)
  → 启动 Node.js 后端 (server.js)
    → 路由分发到各模块
      → workflow.js → 五阶段状态机
      → flow.js → 流程模板管理
      → work-items.js → 工作项管理
      → executor.js → 本地命令执行
      → agent-*.js → Agent 调度
      → store.js → nomos-data.json 读写
  → 加载 renderer/
    → index.html + app.js
      → 用户交互 → fetch API → backend
```

## 五、API / 路由速查

| 模块 | 说明 |
|------|------|
| `/api/projects` | 项目管理 |
| `/api/agents` | Agent 注册表 |
| `/api/workflow` | 五阶段工作流 |
| `/api/flow` | 流程模板 |
| `/api/work-items` | 工作项 |
| `/api/executor` | 本地命令执行 |
| `/api/employees` | 员工管理（v1.1） |
| `/api/roles` | 岗位模板（v1.1） |
| `/api/skills` | 技能资产池（v1.1） |

## 六、数据流

```
1. 用户创建项目 → app.js 发送 POST /api/projects
2. server.js 路由到 workflow.js
3. workflow.js 创建五阶段交付链路
4. 每个阶段分配 Agent → agent-router.js 决策
5. Agent 执行 → executor.js 本地命令
6. 执行结果 → agent-receipt.js 解析
7. 状态更新 → store.js 写入 nomos-data.json
8. 前端轮询/推送 → app.js 更新 UI
```

## 七、关键文件速查

| 想找什么 | 文件位置 |
|---------|---------|
| Electron 入口 | `electron/main.js` |
| HTTP 路由 | `backend/server.js` |
| 五阶段工作流 | `backend/workflow.js` |
| 流程模板 | `backend/flow.js` |
| 工作项 | `backend/work-items.js` |
| 命令执行器 | `backend/executor.js` |
| Agent 注册 | `backend/agent-registry.js` |
| Alice 协同 | `backend/alice.js` |
| 数据持久化 | `backend/store.js` |
| 前端交互 | `renderer/app.js` |
| 前端页面 | `renderer/index.html` |
| 测试 | `tests/server.test.js` |
| 项目骨架 | `nomos.md` |
| 方法论 | `产品开发/产品开发方法论与流程.md` |

## 八、风险标记

| 文件 | 大小 | 风险 |
|------|------|------|
| `renderer/app.js` | 181.2KB | 前端逻辑全部堆在一个文件，维护困难 |
| `renderer/index.html` | 140.6KB | HTML+CSS 过大，内联样式难以维护 |
| `backend/server.js` | 82.8KB | 路由总入口偏大，应考虑模块化拆分 |
| `tests/server.test.js` | 83.5KB | 测试文件偏大，可按模块拆分 |
