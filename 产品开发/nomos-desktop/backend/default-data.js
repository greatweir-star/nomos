"use strict";

const { randomUUID } = require("node:crypto");
const { ensureProjectWorkflow } = require("./workflow");
const { createDefaultAgents, localAgentTemplates, normalizeAdapterConfigs } = require("./agent-registry");

const LOCAL_AGENT_TEMPLATES = localAgentTemplates();

const STAGE_TEMPLATES = [
  {
    key: "prd",
    title: "需求定义",
    description: "用户画像、页面结构、验收清单已经确认。",
    ownerId: "product-director",
    ownerName: "产品总监",
    ownerType: "cloud",
  },
  {
    key: "design",
    title: "界面设计",
    description: "正在整理首页与文章页的高保真设计方案。",
    ownerId: "design-director",
    ownerName: "设计总监",
    ownerType: "cloud",
  },
  {
    key: "develop",
    title: "代码开发",
    description: "等待设计验收后，自动派发给 Codex CLI。",
    ownerId: "codex-cli",
    ownerName: "Codex CLI",
    ownerType: "local",
  },
  {
    key: "test",
    title: "质量检查",
    description: "自动化测试、页面走查与问题回流。",
    ownerId: "test-director",
    ownerName: "测试总监",
    ownerType: "cloud",
  },
  {
    key: "deploy",
    title: "发布上线",
    description: "生成预览环境，确认后再正式发布。",
    ownerId: "ops-director",
    ownerName: "运维总监",
    ownerType: "cloud",
  },
];

function createStages(activeIndex = 1) {
  return STAGE_TEMPLATES.map((template, index) => ({
    id: `${template.key}-${randomUUID().slice(0, 8)}`,
    ...template,
    status: index < activeIndex ? "done" : index === activeIndex ? "in_progress" : "waiting",
    progress: index < activeIndex ? 100 : index === activeIndex ? 64 : 0,
    attempt: 1,
    deliverableIds: [],
  }));
}

function createMessage(authorId, authorName, authorType, text, createdAt) {
  return {
    id: randomUUID(),
    authorId,
    authorName,
    authorType,
    text,
    createdAt,
  };
}

function createProject({
  id = randomUUID(),
  title,
  subtitle,
  goal,
  dueLabel,
  team = "开发团队",
  activeIndex = 1,
  unread = 0,
}) {
  const now = new Date().toISOString();
  const stages = createStages(activeIndex);
  return ensureProjectWorkflow({
    id,
    title,
    subtitle,
    goal,
    dueLabel,
    team,
    unread,
    createdAt: now,
    updatedAt: now,
    stages,
    messages: [
      createMessage(
        "project-steward",
        "项目总管",
        "cloud",
        "项目已创建。我会按照交付链路分派工作，并在关键节点提醒你验收。",
        now,
      ),
    ],
    checkpoints: [
      {
        id: `checkpoint-${randomUUID().slice(0, 8)}`,
        stageKey: "design",
        title: "设计方案完成后，需要你做一次确认。",
        description: "你可以直接批准，也可以补充修改意见，再让设计总监继续调整。",
        status: "waiting",
      },
    ],
    assets: [],
  });
}

function createDefaultData() {
  const now = new Date().toISOString();

  return {
    version: 7,
    createdAt: now,
    updatedAt: now,
    projects: [],
    agents: createDefaultAgents(),
    agentAdapters: normalizeAdapterConfigs(),
    bridge: {
      id: "desktop-bridge",
      status: "offline",
      pairedAt: null,
      command: "nomos bridge pair --workspace local",
      allowedWorkspaces: [],
      adapterCommands: {},
    },
    executions: [],
    skills: [],
    roles: [],
    employees: [],
    audit: [
      {
        id: randomUUID(),
        action: "system.seed",
        summary: "初始化本地工作区",
        createdAt: now,
      },
    ],
  };
}

const ROLE_FAMILY_DEFAULTS = [
  {
    family: "经营与战略",
    roles: [
      {
        name: "CEO/总经理",
        description: "负责公司整体经营决策和战略方向",
        type: "hybrid",
        responsibilities: ["制定公司战略", "经营决策", "组织文化建设"],
        skillNames: ["战略规划", "经营分析", "决策评审"],
        acceptanceCriteria: "战略目标可度量、经营计划可分解、决策有记录可追溯",
      },
    ],
    skills: [
      { name: "战略规划", description: "制定中长期战略目标和路径", category: "role-specific", level: 4, source: "huawei_methodology" },
      { name: "经营分析", description: "分析经营数据，识别增长机会和风险", category: "role-specific", level: 3, source: "huawei_methodology" },
      { name: "决策评审", description: "对重大决策进行结构化评审", category: "role-specific", level: 3, source: "org_practice" },
    ],
  },
  {
    family: "市场与增长",
    roles: [
      {
        name: "市场负责人",
        description: "负责品牌建设、市场推广和增长策略",
        type: "hybrid",
        responsibilities: ["品牌管理", "投放策略", "内容规划"],
        skillNames: ["内容创作", "投放分析", "品牌管理"],
        acceptanceCriteria: "品牌曝光度可度量、投放ROI可追踪、内容产出有节奏",
      },
    ],
    skills: [
      { name: "内容创作", description: "撰写营销文案、社交媒体内容和品牌故事", category: "general", level: 2, source: "common_base" },
      { name: "投放分析", description: "分析广告投放效果，优化投放策略", category: "role-specific", level: 3, source: "org_practice" },
      { name: "品牌管理", description: "维护品牌一致性，管理品牌资产", category: "role-specific", level: 3, source: "org_practice" },
    ],
  },
  {
    family: "销售与客户",
    roles: [
      {
        name: "销售/客户经理",
        description: "负责客户开拓、商机跟进和关系维护",
        type: "hybrid",
        responsibilities: ["客户开拓", "商机评估", "报价与签约"],
        skillNames: ["客户沟通", "商机评估", "报价管理"],
        acceptanceCriteria: "客户覆盖率达标、商机转化率可追踪、签约周期可控",
      },
    ],
    skills: [
      { name: "客户沟通", description: "与客户进行有效的需求沟通和关系维护", category: "general", level: 2, source: "common_base" },
      { name: "商机评估", description: "评估商机价值和可行性", category: "role-specific", level: 2, source: "org_practice" },
      { name: "报价管理", description: "制定和管理报价方案", category: "role-specific", level: 2, source: "org_practice" },
    ],
  },
  {
    family: "产品与研发",
    roles: [
      {
        name: "产品经理",
        description: "负责产品规划、需求分析和版本管理",
        type: "hybrid",
        responsibilities: ["产品规划", "需求分析", "版本管理"],
        skillNames: ["产品规划", "需求分析", "前端开发"],
        acceptanceCriteria: "PRD 可开发、需求可追踪、版本可交付",
      },
      {
        name: "研发工程师",
        description: "负责代码开发、技术架构和代码质量",
        type: "hybrid",
        responsibilities: ["代码开发", "技术方案", "代码评审"],
        skillNames: ["前端开发", "需求分析"],
        acceptanceCriteria: "代码可部署、测试覆盖率达标、技术债务可控",
      },
    ],
    skills: [
      { name: "产品规划", description: "制定产品路线图和功能优先级", category: "role-specific", level: 3, source: "huawei_methodology" },
      { name: "前端开发", description: "使用现代前端框架进行产品开发", category: "role-specific", level: 2, source: "common_base" },
      { name: "需求分析", description: "从用户场景中提炼结构化需求", category: "role-specific", level: 2, source: "org_practice" },
    ],
  },
  {
    family: "交付与运营",
    roles: [
      {
        name: "项目经理",
        description: "负责项目交付、进度管理和质量保障",
        type: "hybrid",
        responsibilities: ["项目规划", "交付跟踪", "质量保障"],
        skillNames: ["项目管理", "交付跟踪", "质量保障"],
        acceptanceCriteria: "项目按时交付、质量指标达标、客户验收通过",
      },
    ],
    skills: [
      { name: "项目管理", description: "规划、执行和监控项目全生命周期", category: "general", level: 3, source: "huawei_methodology" },
      { name: "交付跟踪", description: "跟踪交付物状态和进度", category: "role-specific", level: 2, source: "org_practice" },
      { name: "质量保障", description: "确保交付物满足质量标准", category: "role-specific", level: 2, source: "huawei_methodology" },
    ],
  },
  {
    family: "职能支撑",
    roles: [
      {
        name: "财务/法务",
        description: "负责财务审核、合同审查和采购管理",
        type: "carbon",
        responsibilities: ["财务审核", "合同审查", "采购管理"],
        skillNames: ["财务审核", "合同审查", "采购管理"],
        acceptanceCriteria: "财务合规、合同风险可控、采购流程规范",
      },
    ],
    skills: [
      { name: "财务审核", description: "审核财务报表和预算执行", category: "role-specific", level: 3, source: "common_base" },
      { name: "合同审查", description: "审查合同条款的合规性和风险", category: "role-specific", level: 3, source: "common_base" },
      { name: "采购管理", description: "管理采购流程和供应商关系", category: "role-specific", level: 2, source: "common_base" },
    ],
  },
  {
    family: "AI 与平台",
    roles: [
      {
        name: "智能体管理员",
        description: "负责 Agent 运维、知识库管理和权限审计",
        type: "hybrid",
        responsibilities: ["Agent运维", "知识库管理", "权限审计"],
        skillNames: ["AgentOps", "知识库管理", "权限审计"],
        acceptanceCriteria: "Agent可用率达标、知识库更新及时、权限变更可追溯",
      },
    ],
    skills: [
      { name: "AgentOps", description: "管理和运维AI智能体，监控运行状态", category: "role-specific", level: 3, source: "org_practice" },
      { name: "知识库管理", description: "维护企业知识库的内容质量和结构", category: "role-specific", level: 2, source: "org_practice" },
      { name: "权限审计", description: "审计系统权限配置和访问记录", category: "role-specific", level: 3, source: "org_practice" },
    ],
  },
];

function createDefaultOrgData(existingSkills, existingRoles) {
  const skills = Array.isArray(existingSkills) ? [...existingSkills] : [];
  const roles = Array.isArray(existingRoles) ? [...existingRoles] : [];
  const now = new Date().toISOString();
  const skillNameMap = new Map(skills.map((s) => [s.name, s]));

  for (const family of ROLE_FAMILY_DEFAULTS) {
    for (const skillDef of family.skills) {
      if (skillNameMap.has(skillDef.name)) continue;
      const skill = {
        id: randomUUID(),
        name: skillDef.name,
        description: skillDef.description,
        category: skillDef.category,
        level: skillDef.level,
        source: skillDef.source,
        tags: [],
        applicableFlows: [],
        riskBoundary: "",
        evidence: [],
        createdAt: now,
        updatedAt: now,
      };
      skills.push(skill);
      skillNameMap.set(skill.name, skill);
    }

    for (const roleDef of family.roles) {
      if (roles.some((r) => r.name === roleDef.name)) continue;
      const resolvedSkillIds = roleDef.skillNames
        .map((name) => skillNameMap.get(name)?.id)
        .filter(Boolean);
      const role = {
        id: randomUUID(),
        name: roleDef.name,
        description: roleDef.description,
        family: family.family,
        type: roleDef.type,
        isDefault: true,
        responsibilities: roleDef.responsibilities,
        skillIds: resolvedSkillIds,
        skillLevelOverrides: {},
        permissions: {},
        acceptanceCriteria: roleDef.acceptanceCriteria,
        flowNotes: "",
        flowMatrix: [],
        carbonSiliconRatio: { carbon: 0, silicon: 0, hybrid: 0 },
        createdAt: now,
        updatedAt: now,
      };
      roles.push(role);
    }
  }

  return { skills, roles };
}

module.exports = {
  STAGE_TEMPLATES,
  LOCAL_AGENT_TEMPLATES,
  ROLE_FAMILY_DEFAULTS,
  createDefaultData,
  createDefaultOrgData,
  createProject,
};
