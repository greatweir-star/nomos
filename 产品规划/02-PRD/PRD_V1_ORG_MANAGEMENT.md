# PRD：组织管理模块

## 背景

Nomos v1.0.1 是一个功能完整的 Agent 项目指挥台，但当前的工作流运行在一个"无组织"的上下文中——没有 Skill 池、没有岗位定义、没有员工身份。用户创建项目、派发 Agent、完成任务，但这些活动不挂在任何组织结构上。

信息架构文档（`NOMOS_HOME_INFORMATION_ARCHITECTURE_V1.md`）已定义了组织层的四层模型：

> Skill Pool → Role → Employee → Technical Adapter

本 PRD 的目标是让这四层模型在产品中落地。**四层模型必须作为一级实体全部建模**，不可将 Technical Adapter 退化为 Employee 的附属字段——因为数字员工转正后必须同时拥有员工身份和技术架构身份（参见信息架构文档"数字员工转正后必须同时拥有两重身份"）。

## 用户与场景

### 主要用户

| 用户 | 特征 | 核心诉求 |
|------|------|---------|
| OPC 创业者 | 一人多岗，急需结构化自己的工作和 AI 能力 | 把自己的 Skill、流程和 Agent 理清楚，不再靠脑子记 |
| 小微企业主 | 10-50 人，部门模糊，流程靠人推动 | 给团队定岗定责，让 AI Agent 有明确的岗位归属 |
| 中小企业经理 | 管理一个团队或一条业务线 | 知道团队有哪些 Skill，谁在哪些流程上工作 |

### 典型场景

**场景一：OPC 创业者建模自己的组织**

创业者小李一个人做产品、写代码、做运营。他在 Nomos 中：
1. 创建 5 个 Skill：产品规划、前端开发、内容创作、数据分析、客户沟通
2. 创建 3 个岗位：产品技术、运营增长、客户服务
3. 给每个岗位分配对应的 Skill
4. 把自己登记为碳基员工，绑定所有岗位
5. 把 Claude Code 登记为硅基员工，绑定"产品技术"岗位
6. 以后派发任务时，系统知道这是哪个岗位的工作、需要哪些 Skill、由谁执行

**场景二：小微团队导入组织结构**

一个 15 人的团队，负责人在 Nomos 中：
1. 按岗位族批量创建 8 个岗位
2. 为每个岗位配置 Skill 等级和验收标准
3. 把团队成员登记为碳基员工，绑定岗位
4. 把 2 个 Claude Code 和 1 个 Codex CLI 登记为硅基员工
5. 在岗位-流程矩阵中，定义每个岗位在 LTC 流程各阶段的角色

**场景三：数字员工上岗**

用户为"销售助理"岗位生成一个数字员工：
1. 岗位匹配：配置销售助理需要的 5 个 Skill 和 3 个工具
2. 入职培训：绑定销售话术库、产品知识库和历史成交案例
3. 分配工具：关联 Claude Code 作为底层 Agent
4. 上手实习：在沙盒中处理 3 个低风险线索
5. 转正上岗：设定性格为"高效简洁"，风险边界为"金额超过 5 万必须转人工"

## 要解决的问题

1. **无组织上下文**：当前 Agent 派发不关联任何岗位或 Skill，无法回答"这个 Agent 代表谁在做什么"
2. **能力不可沉淀**：用户的 Skill 和经验只存在于人脑中，不随 Nomos 使用而积累
3. **Agent 身份模糊**：Claude Code、Codex CLI、Alice 都是工具，没有岗位归属和职责边界
4. **无法做组织诊断**：不知道组织缺什么 Skill、缺什么岗位、Agent 配置是否合理

## 成功指标

| 指标 | 当前基线 | 目标 |
|------|---------|------|
| 用户创建 Skill 池的完成率 | N/A（功能不存在） | 创建后 80% 以上至少添加 5 个 Skill |
| 岗位-员工绑定率 | N/A | 创建岗位后 90% 以上至少绑定一个员工（碳或硅） |
| 岗位-流程关联率 | N/A | 创建岗位后 70% 以上至少关联一个流程阶段 |
| Agent 岗位归属率 | 0%（Agent 无岗位） | 100% 的已接入 Agent 绑定到至少一个岗位 |

> **审阅者注**：上述指标为运营指标，不可直接作为开发验收标准。开发验收标准见"验收标准"章节。运营指标在 v1.1 发布后通过用户行为数据采集验证。

## 本版范围

### Skill 池

- Skill CRUD：名称、描述、分类（通用 / 行业 / 岗位特定）、等级（L1-L4）、适用流程、风险边界
- Skill 分类管理：按岗位族或自定义分类浏览和筛选
- Skill 搜索：按名称、标签、关键词搜索
- Skill 使用统计：被多少岗位引用、在多少流程中使用

> **增强说明**：Skill 应增加 `source`（来源：华为方法论轻量化 / 组织实践沉淀 / 通用基础）和 `evidence[]`（能力证据：如文档链接、案例记录、评估记录），与产品理念文档中"Skill 是组织能力的标准化封装"和 SFIA 框架中的"能力证据化"对齐。

### 岗位模板

- 岗位 CRUD：名称、职责描述、Skill 组合（从 Skill 池选取）、权限范围、验收标准、流程位置
- 默认岗位族预设：按方法论文档中的 7 大岗位族提供默认模板（经营与战略、市场与增长、销售与客户、产品与研发、交付与运营、职能支撑、AI 与平台）
- 岗位-流程矩阵：定义岗位在哪些流程的哪些阶段承担什么角色（RACI：负责 / 协助 / 知会 / 审批）
- 岗位碳硅配比：标注此岗位有多少节点是碳、多少是硅、多少是碳硅

> **增强说明**：岗位应增加 `family`（岗位族：7 大族之一或自定义）和 `type`（纯碳基 / 纯硅基 / 碳硅混编），与信息架构文档中"岗位类型"定义对齐。`flowMatrix` 在 v1.1 中为可选字段——因流程管理是 v1.2 的范围，v1.1 中流程数据尚未就绪。v1.1 中 `flowMatrix` 可预留接口，但不需要在 UI 中暴露完整的矩阵编辑功能，仅支持手动输入自由格式的流程关联描述（`flowNotes`），待 v1.2 流程管理上线后再迁移为结构化的 `flowMatrix`。

#### 默认岗位族预设模板

系统首次启动时（无组织数据时）自动生成 7 大岗位族，每族预置 1-2 个岗位模板和 3-5 个 Skill。用户可直接使用或修改：

| 岗位族 | 预置岗位 | 预置 Skill |
|--------|---------|-----------|
| 经营与战略 | CEO/总经理 | 战略规划、经营分析、决策评审 |
| 市场与增长 | 市场负责人 | 内容创作、投放分析、品牌管理 |
| 销售与客户 | 销售/客户经理 | 客户沟通、商机评估、报价管理 |
| 产品与研发 | 产品经理、研发工程师 | 产品规划、前端开发、需求分析 |
| 交付与运营 | 项目经理 | 项目管理、交付跟踪、质量保障 |
| 职能支撑 | 财务/法务 | 财务审核、合同审查、采购管理 |
| AI 与平台 | 智能体管理员 | AgentOps、知识库管理、权限审计 |

预设模板标记 `isDefault: true`，用户可修改但不可删除（隐藏即可）。

### 员工管理

- 员工 CRUD：姓名、类型（碳基 / 硅基 / 混编）、绑定岗位、状态（活跃 / 休假 / 离职）
- 碳基员工：手动登记，绑定一个或多个岗位
- 硅基员工：从已接入的 Agent（Alice、Claude Code、Codex CLI）中选取，绑定岗位
- 员工-Adapter 关联：每个硅基员工绑定底层 Technical Adapter（如 Claude Code）和配置参数
- 员工概览：显示每个员工当前绑定的岗位、状态和最近的执行记录

> **增强说明**：硅基员工必须引用已有的 `agents` 数据（store.js 中的 `data.agents`），不可重新创建独立的 Agent 实体。`adapterId` 应指向 `data.agentAdapters` 中已注册的 Adapter 配置。见"与现有代码的兼容性"章节。

### Technical Adapter 管理

> **增强新增**：信息架构四层模型的第四层，必须作为一级实体。当前代码中 `data.agents` 和 `data.agentAdapters` 已包含 Adapter 信息，v1.1 需要将其提升为组织层可见、可配置的实体。

- Adapter 列表：展示当前已接入的所有 Agent 和 Adapter（来源：`data.agents` + `data.agentAdapters`）
- Adapter 详情：名称、类型（本地 CLI / MCP 服务 / 云端智能体）、状态（在线/离线）、能力描述
- Adapter-岗位关联：通过员工间接关联（硅基员工绑定 Adapter → 员工绑定岗位）
- v1.1 不做新增 Adapter 接入（沿用 v1.0.1 已有的 Alice / Claude Code / Codex CLI），仅做已有 Adapter 的组织视角展示

### 组织管理页面

- 独立页面入口：从首页"组织"区进入
- 左右分栏布局：左侧组织建模（Skill 池 → 岗位 → 员工），右侧数字员工生成工厂
- 组织健康度概览：Skill 数量、岗位数量、员工数量、Agent 覆盖率

> **增强说明**：原"岗位缺口提示：根据已创建的流程模板，提示哪些岗位尚未配置"移至 v1.2——v1.1 没有流程模板数据，无法做流程驱动的岗位缺口检测。v1.1 的岗位缺口提示简化为：当某个岗位族下无任何岗位时，在组织健康度概览中提示"XX岗位族尚无岗位配置"。

### 数字员工生成工厂（前半段）

v1.1 落地六步中的前三步：

#### Step 1 岗位匹配

**目标**：配置数字员工的技能和职责边界。

配置项：
- 目标岗位（从已有岗位中选取，不可为空）
- Skill 等级要求：为岗位关联的每个 Skill 设定期望等级（L1-L4），默认取岗位定义中的等级
- 输入输出定义：每个 Skill 的标准输入格式和输出格式（自由文本描述，v1.1 不做结构化校验）
- 验收标准：继承岗位的 `acceptanceCriteria`，可针对数字员工场景调整
- 职责边界：明确数字员工在此岗位上的决策范围（自由文本，如"可自动处理金额 ≤ 5 万的报价，超出需人工审批"）

**阶段产出**：`digitalEmployeeDraft.skillMatching` 字段填充完成。

#### Step 2 入职培训

**目标**：为数字员工绑定知识资源。

配置项：
- 企业知识库引用：0-N 个外部知识库 URL 或本地文档路径（v1.1 为自由文本列表，不做知识库管理）
- 业务语料：0-N 条业务规则或话术（每条含 `title` + `content`，自由文本）
- 行业规则：0-N 条行业约束（每条含 `title` + `content`，自由文本）
- 历史案例引用：0-N 条案例标题和摘要（自由文本）

> **范围边界**：v1.1 不做知识库管理模块。入职培训中的"知识库"仅作为引用文本，不做内容解析、索引或检索。用户填写 URL 或文档路径，系统记录但不消费。真正的知识库消费能力留到 v2.1 数字员工后三步。

**阶段产出**：`digitalEmployeeDraft.onboarding` 字段填充完成。

#### Step 3 师父带教

**目标**：为数字员工定义标准操作流程。

配置项：
- SOP 列表：0-N 条 SOP（每条含 `title` + `steps[]`，每步为自由文本描述）
- 示范样例：0-N 条样例（每条含 `title` + `inputDescription` + `outputDescription` + `notes`，均为自由文本）
- 师父指定：从碳基员工中选择一位作为此数字员工的师父（可选，不强制）

> **范围边界**：v1.1 的 SOP 为自由文本描述，不做与 Workflow 引擎的结构化关联（Workflow 引擎是 v2.0 的范围）。v1.2 流程管理上线后，SOP 可迁移为流程阶段的引用。

**阶段产出**：`digitalEmployeeDraft.mentorship` 字段填充完成。

#### 草稿持久化

前三步完成后保存为"数字员工草稿"。草稿状态机：

```
empty → skill_matching → onboarding → mentorship → draft_complete → (v2.1 继续)
```

- 用户可随时保存草稿并退出，下次继续
- 草稿保存在 `employee.digitalEmployeeDraft` 字段中
- `draft_complete` 状态的草稿在员工列表中标记为"待分配工具"状态

后三步（分配工具、上手实习、转正上岗）留到 v2.1。

## 不做范围

- 不做人员考勤、薪资计算、绩效评估
- 不做组织架构图可视化（树形图、关系图）
- 不做岗位能力自动评估（Skill 等级由人工评定）
- 不做跨企业组织共享或模板市场
- 不做数字员工后三步（分配工具、上手实习、转正上岗）
- 不做 Skill 的在线学习和自动升级
- 不做知识库管理模块（入职培训仅记录引用，不消费知识内容）
- 不做 SOP 与 Workflow 引擎的结构化关联（SOP 为自由文本）
- 不做新增 Agent/Adapter 接入（沿用 v1.0.1 已有的三种 Agent）
- 不做流程驱动的岗位缺口检测（无流程模板数据，留到 v1.2）
- 不做数字员工实际执行能力（前三步仅定义配置，不执行任务）

## 交互流程

### 创建 Skill

```
组织页面 → Skill 池 → 新建 Skill → 填写名称/描述/分类/等级 → 关联适用流程 → 保存
```

- 名称唯一性校验：同名 Skill 不允许创建，给出"Skill 已存在"提示
- 等级默认 L1，用户可选 L1-L4
- `applicableFlows` 在 v1.1 中为自由文本标签（无流程数据），v1.2 升级为流程 ID 引用

### 编辑 Skill

```
组织页面 → Skill 池 → 点击 Skill → 编辑 → 修改字段 → 保存
```

- 被岗位引用的 Skill 可修改描述、等级，不可修改名称（影响关联方的可追溯性）
- 修改等级后，引用此 Skill 的岗位列表中标记"等级已变更"

### 删除 Skill

```
组织页面 → Skill 池 → 点击 Skill → 删除 → 检查关联 → 确认/阻止
```

- 被岗位引用的 Skill：弹出关联岗位列表，需先解除关联才能删除
- 未被引用的 Skill：二次确认后删除

### 创建岗位

```
组织页面 → 岗位 → 新建岗位 → 填写名称/职责 → 选择岗位族 → 选择类型(纯碳/纯硅/混编) → 从 Skill 池选取 Skill → 设置验收标准 → 保存
```

- 岗位族从 7 大默认族中选择，也可自定义
- 岗位类型默认"碳硅混编"
- Skill 选择为多选，从 Skill 池中勾选

### 编辑岗位

```
组织页面 → 岗位 → 点击岗位 → 编辑 → 修改字段 → 保存
```

- 被员工绑定的岗位可修改描述和 Skill 组合，不可修改名称
- 增加 Skill 后，绑定了此岗位的硅基员工的 `digitalEmployeeDraft` 中标记"需重新匹配"

### 删除岗位

```
组织页面 → 岗位 → 点击岗位 → 删除 → 检查关联 → 确认/阻止
```

- 被员工绑定的岗位：弹出关联员工列表，需先解除绑定才能删除
- 默认预设岗位（`isDefault: true`）不可删除，仅可隐藏

### 创建员工

```
组织页面 → 员工 → 新建员工 → 选择类型（碳/硅/混编）→
  碳基：填写姓名 → 选择岗位 → 保存
  硅基：从已有 Agent 中选取 → 选择岗位 → 保存
  混编：填写姓名 + 选取 Agent → 选择岗位 → 保存
```

- 硅基员工的 Agent 列表来源：`data.agents`（v1.0.1 已有的 Alice、Claude Code、Codex CLI）
- 一个 Agent 可对应多个硅基员工（如两个"销售助理"都使用 Claude Code）
- 保存后员工立即出现在员工列表中

### 编辑员工

```
组织页面 → 员工 → 点击员工 → 编辑 → 修改岗位绑定/状态 → 保存
```

### 删除员工

```
组织页面 → 员工 → 点击员工 → 删除 → 二次确认 → 删除
```

- 员工删除为软操作（状态改为 `inactive`），保留审计记录
- 有 `digitalEmployeeDraft` 的员工删除时提示"草稿将一并删除"

### 岗位-流程矩阵（v1.1 简化版）

```
组织页面 → 岗位 → 点击岗位 → 流程关联 → 填写流程关联描述(flowNotes) → 保存
```

- v1.1 不提供结构化的矩阵编辑界面（无流程数据），仅提供自由文本的流程关联描述
- 用户可描述"此岗位在 LTC 流程的线索管理阶段担任 R（负责）"
- v1.2 流程管理上线后，`flowNotes` 可迁移为结构化的 `flowMatrix`

### 数字员工生成（前三步）

```
组织页面 → 数字员工工厂 →
  新建数字员工 → 选择目标岗位 →
  Step 1 岗位匹配：配置 Skill 等级和验收标准 → 保存草稿 →
  Step 2 入职培训：填写知识库引用和业务语料 → 保存草稿 →
  Step 3 师父带教：填写 SOP 和示范样例 → 保存草稿 →
  标记为"草稿完成"（待 v2.1 继续后三步）
```

- 每步均可独立保存，用户可随时退出再继续
- 已有草稿的数字员工在工厂首页列出，点击可继续未完成的步骤
- 工厂首页用 6 个步骤 Tab 呈现（与信息架构一致），v1.1 中步骤 4-6 标记为"即将推出"

### 使用默认模板快速建模

```
组织页面 → 快速开始 → 选择组织规模(OPC/小微/中型) →
  系统自动生成：7 大岗位族 + 对应预置岗位 + 预置 Skill →
  用户调整/删除不需要的岗位和 Skill → 保存
```

- 此流程解决风险缓解措施中"提供 OPC 预设模板，开箱即用"的需求

### 组织健康度概览

```
组织页面 → 概览区 →
  显示：Skill 总数、岗位总数、碳基员工数、硅基员工数、Agent 覆盖率
  提示：空岗位族提示、无员工的岗位提示、无 Skill 的岗位提示
```

- Agent 覆盖率 = 已绑定 Adapter 的硅基员工数 / 总硅基员工数
- 无员工的岗位在概览中标黄

## 数据与权限

### 数据模型

```
skill: {
  id: string (UUID),
  name: string (唯一),
  description: string,
  category: 'general' | 'industry' | 'role-specific',
  level: 1 | 2 | 3 | 4,
  source: 'huawei_methodology' | 'org_practice' | 'common_base',
  tags: string[],
  applicableFlows: string[],        // v1.1 为自由文本标签，v1.2 迁移为 flowId[]
  riskBoundary: string,             // 风险边界描述
  evidence: [{                      // 能力证据（SFIA 对齐）
    title: string,
    type: 'document' | 'case' | 'assessment',
    reference: string               // URL 或路径
  }],
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}

role: {
  id: string (UUID),
  name: string,
  description: string,
  family: string,                   // 岗位族：7大族名称或自定义
  type: 'carbon' | 'silicon' | 'hybrid',  // 岗位类型
  isDefault: boolean,               // 是否为系统预设
  responsibilities: string[],
  skillIds: string[],               // 引用 skill.id
  skillLevelOverrides: {            // 可选：此岗位对特定 Skill 的等级覆盖
    [skillId]: number               // 1-4
  },
  permissions: {},                  // 权限范围（v1.1 为空对象，预留）
  acceptanceCriteria: string,       // 验收标准
  flowNotes: string,               // v1.1：流程关联自由文本描述
  flowMatrix: [{                    // v1.2 启用：结构化流程矩阵
    flowId: string,
    stageId: string,
    raciRole: 'responsible' | 'accountable' | 'consulted' | 'informed'
  }],
  carbonSiliconRatio: {
    carbon: number,                 // 碳节点数
    silicon: number,                // 硅节点数
    hybrid: number                  // 碳硅节点数
  },
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}

employee: {
  id: string (UUID),
  name: string,
  type: 'carbon' | 'silicon' | 'hybrid',
  roleIds: string[],                // 引用 role.id
  status: 'active' | 'vacation' | 'inactive',
  agentId: string | null,           // 硅基/混编员工引用 data.agents[].id
  adapterId: string | null,         // 硅基/混编员工引用 data.agentAdapters 中的 adapter
  digitalEmployeeDraft: {           // 数字员工草稿（仅硅基/混编员工）
    status: 'empty' | 'skill_matching' | 'onboarding' | 'mentorship' | 'draft_complete',
    targetRoleId: string | null,    // 目标岗位
    skillMatching: {
      skillLevelRequirements: { [skillId]: number },
      inputOutputDefs: [{ skillId: string, input: string, output: string }],
      responsibilityBoundary: string,
      acceptanceCriteria: string,
      completedAt: string | null
    } | null,
    onboarding: {
      knowledgeBaseRefs: [{ title: string, url: string }],
      businessCorpus: [{ title: string, content: string }],
      industryRules: [{ title: string, content: string }],
      historicalCases: [{ title: string, summary: string }],
      completedAt: string | null
    } | null,
    mentorship: {
      sops: [{ title: string, steps: string[] }],
      examples: [{ title: string, inputDesc: string, outputDesc: string, notes: string }],
      mentorEmployeeId: string | null,
      completedAt: string | null
    } | null
  } | null,
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}
```

> **增强说明**：
> - `skill.source` 对齐产品理念文档中"Skill 的三种来源"
> - `skill.evidence` 对齐 SFIA 框架的"能力证据化"和信息架构中的"等级、证据"
> - `role.family` 和 `role.type` 对齐信息架构中的岗位族和岗位类型定义
> - `role.flowNotes` 为 v1.1 的过渡方案，v1.2 流程管理上线后迁移为 `flowMatrix`
> - `employee.agentId` 直接引用现有 `data.agents` 中的 Agent，避免重复创建
> - `employee.digitalEmployeeDraft` 嵌入员工模型，使草稿与员工身份绑定

### 存储方式

> **增强修正**：原方案"新增 `skills.json`、`roles.json`、`employees.json` 三个数据文件"与现有架构不一致。当前 store.js 使用单一 `nomos-data.json` 文件，所有数据通过 `migrateData()` 统一管理。新增组织数据应延续此模式：

沿用当前单一 `nomos-data.json` 文件持久化。在 `data` 对象中新增 `skills`、`roles`、`employees` 三个数组字段，与现有的 `projects`、`agents`、`audit`、`executions` 并列。通过 `migrateData()` 函数的版本升级机制（当前 `data.version = 6`，升级至 `7`）自动补全空数组。

```
nomos-data.json
├── version: 7
├── projects: [...]
├── agents: [...]          // v1.0.1 已有
├── agentAdapters: {...}   // v1.0.1 已有
├── audit: [...]
├── executions: [...]
├── bridge: {...}
├── skills: [...]          // v1.1 新增
├── roles: [...]           // v1.1 新增
└── employees: [...]       // v1.1 新增
```

默认数据生成：`createDefaultData()` 中新增 `skills`、`roles`、`employees` 的默认值，包含 7 大岗位族的预置模板数据。

### 权限规则

- 所有组织数据为全局读写，不区分用户权限（单机 MVP 阶段）
- 删除岗位时检查是否被员工绑定，给出提示
- 删除 Skill 时检查是否被岗位引用，给出提示
- 删除员工时软删除（状态改为 `inactive`），保留审计记录
- 系统预设岗位（`isDefault: true`）不可删除，仅可隐藏

### 与现有代码的兼容性

> **增强新增**：v1.1 组织数据必须与 v1.0.1 已有数据结构无缝对接。

| 现有数据 | v1.1 对接方式 |
|---------|-------------|
| `data.agents[]` | 硅基员工的 `agentId` 引用 `agents[].id`；Agent 列表页面从 `agents` 读取 |
| `data.agentAdapters` | 硅基员工的 `adapterId` 引用 agentAdapters 中的 key；Adapter 列表从 `agentAdapters` 读取 |
| `data.projects[]` | v1.1 不修改项目结构；v1.2 流程管理中项目将关联 `role.flowMatrix` |
| `data.executions[]` | v1.1 不修改执行记录；v2.1 数字员工执行后回写执行记录时关联员工 ID |
| `data.audit[]` | 组织数据的 CRUD 操作写入 `audit`，沿用 `store.audit()` 方法 |
| `migrateData()` | 版本号从 6 升至 7，自动补全 `skills`、`roles`、`employees` 空数组 |

#### 数据迁移策略

- 版本 6 → 7：`migrateData()` 中增加 `data.skills = Array.isArray(data.skills) ? data.skills : []`，`roles` 和 `employees` 同理
- 首次启动时由 `createDefaultData()` 生成 7 大岗位族的预置数据
- 现有 `agents` 数据不变，不做自动创建硅基员工（由用户手动登记）

### API 路由设计

> **增强新增**：沿用 server.js 中 `/api/` 前缀的 RESTful 风格。

```
GET    /api/skills                    # 获取 Skill 列表
POST   /api/skills                    # 创建 Skill
GET    /api/skills/:id                # 获取单个 Skill
PATCH  /api/skills/:id                # 更新 Skill
DELETE /api/skills/:id                # 删除 Skill（检查关联）

GET    /api/roles                     # 获取岗位列表
POST   /api/roles                     # 创建岗位
GET    /api/roles/:id                 # 获取单个岗位
PATCH  /api/roles/:id                 # 更新岗位
DELETE /api/roles/:id                 # 删除岗位（检查关联）

GET    /api/employees                 # 获取员工列表
POST   /api/employees                 # 创建员工
GET    /api/employees/:id             # 获取单个员工
PATCH  /api/employees/:id             # 更新员工
DELETE /api/employees/:id             # 删除员工（软删除）

GET    /api/adapters                  # 获取 Adapter 列表（从 agents + agentAdapters 聚合）

GET    /api/org/health                # 组织健康度概览
POST   /api/org/init-defaults         # 生成默认岗位族模板
```

## 验收标准

### 自动化测试

**Skill CRUD 全流程**：
- 创建 Skill：POST /api/skills 返回 201，数据写入 store
- 读取 Skill 列表：GET /api/skills 返回数组
- 更新 Skill：PATCH /api/skills/:id 返回 200
- 删除未引用 Skill：DELETE /api/skills/:id 返回 200
- 删除被引用 Skill：DELETE /api/skills/:id 返回 409 + 关联岗位列表
- 同名 Skill 创建：POST 返回 409

**岗位 CRUD 和 Skill 绑定**：
- 创建岗位：POST /api/roles 返回 201
- 岗位绑定 Skill：skillIds 中的 ID 在 skills 中存在
- 删除被员工绑定的岗位：DELETE 返回 409 + 关联员工列表
- 预设岗位不可删除：DELETE 返回 403
- 岗位族筛选：GET /api/roles?family=xxx 正确过滤

**员工 CRUD 和岗位绑定**：
- 创建碳基员工：POST /api/employees type=carbon, agentId 为空
- 创建硅基员工：POST /api/employees type=silicon, agentId 指向已有 Agent
- 员工绑定岗位：roleIds 中的 ID 在 roles 中存在
- 删除员工：状态改为 inactive，不物理删除

**数字员工草稿**：
- 创建草稿：employee.digitalEmployeeDraft.status 从 empty 变为 skill_matching
- 逐步保存：每步完成后 status 推进，已完成步骤的 completedAt 非空
- 草稿恢复：重新加载时跳转到未完成步骤
- 草稿完成：status 到达 draft_complete

**默认模板生成**：
- POST /api/org/init-defaults 返回 201
- 生成的岗位标记 isDefault: true
- 生成的 Skill 和岗位与预置模板规格一致

**数据迁移**：
- 从 v6 数据升级到 v7：skills/roles/employees 自动补全为空数组
- 现有 agents 数据不变

**组织健康度**：
- GET /api/org/health 返回正确的计数和覆盖率

### 手工验收

**路径一：OPC 创业者建模**
1. 启动 Nomos v1.1
2. 点击"组织"区进入组织管理页
3. 点击"快速开始" → 选择 OPC 规模 → 系统生成默认模板
4. 修改预设岗位：添加"产品技术"岗位，关联 3 个 Skill
5. 登记自己为碳基员工，绑定"产品技术"和"运营增长"岗位
6. 登记 Claude Code 为硅基员工，绑定"产品技术"岗位
7. 验证组织概览显示：Skill ≥ 5、岗位 ≥ 3、碳基 1、硅基 1

**路径二：数字员工生成**
1. 在数字员工工厂中，为"销售助理"岗位新建数字员工
2. Step 1：配置 3 个 Skill 的等级要求，填写职责边界
3. 保存草稿，退出
4. 重新进入工厂，草稿自动恢复到 Step 2
5. Step 2：填写 1 条业务语料和 1 条行业规则
6. Step 3：编写 1 条 SOP（3 个步骤），选择师父
7. 完成后，员工列表中该硅基员工标记"草稿完成（待分配工具）"

**路径三：关联检查**
1. 创建 Skill "需求分析"并关联到"产品经理"岗位
2. 尝试删除"需求分析" → 系统提示"被产品经理岗位引用"
3. 解除关联后重新删除 → 成功
4. 尝试删除预设岗位"CEO/总经理" → 系统提示"预设岗位不可删除"

**路径四：边缘场景**
1. 创建不含任何 Skill 的岗位 → 允许（Skill 可后续添加）
2. 创建碳基员工不选任何岗位 → 允许
3. 两个硅基员工使用同一个 Agent → 允许
4. 空白草稿保存 → 允许，status 为 skill_matching

## 风险与回退

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 组织建模概念过重，用户不上手 | 功能闲置 | 提供 OPC 预设模板 + "快速开始"引导，开箱即用 |
| JSON 数据文件过大影响性能 | 用户体验下降 | 沿用单一文件（与 v1.0.1 一致），v1.1 数据量预估 < 100KB，不构成性能问题 |
| 数据模型变更导致迁移问题 | 数据丢失 | 版本化数据模型（v6→v7），通过 migrateData() 自动迁移，不破坏已有数据 |
| 数字员工前三步定义过于抽象，用户不知如何填写 | 填写率低 | 每步提供填写提示和示例；SOP 和业务语料允许留空，不强求 |
| v1.2 流程上线后 flowNotes 迁移成本 | 数据不一致 | flowNotes 设计时要求格式约定（如"LTC/线索管理/R"），便于脚本解析迁移 |
| 与现有 agents 数据的关联设计不当 | 硅基员工与 Agent 脱节 | agentId 直接引用 data.agents[].id，Agent 下线时在员工列表中标记"Agent 不可用" |

---

*文档版本：V1.1（审阅增强版）*
*创建日期：2026-06-05*
*审阅日期：2026-06-05*
*审阅人：许清楚（Xu）*
*状态：Reviewed & Enhanced*
*关联版本：v1.1*
