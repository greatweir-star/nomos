"use strict";

const { randomUUID } = require("node:crypto");
const { ensureProjectWorkflow } = require("./workflow");

const LOCAL_AGENT_TEMPLATES = [
  {
    id: "alice",
    name: "Alice",
    role: "本地总管 · MCP 协作",
    type: "local",
    status: "pending",
    alias: "Alice",
    paired: true,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    role: "设计复核 · 可调用",
    type: "local",
    status: "online",
    alias: "设计复核员",
    paired: true,
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    role: "代码仓库 · 等待派发",
    type: "local",
    status: "online",
    alias: "开发执行器",
    paired: true,
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    role: "桌面操作 · 待网关配置",
    type: "local",
    status: "pending",
    alias: "桌面助理",
    paired: true,
  },
];

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
    version: 5,
    createdAt: now,
    updatedAt: now,
    projects: [],
    agents: [
      {
        id: "project-steward",
        name: "项目总管",
        role: "拆任务、调度、验收",
        type: "cloud",
        status: "online",
        alias: "总管",
      },
      {
        id: "product-director",
        name: "产品总监",
        role: "调研、PRD、范围控制",
        type: "cloud",
        status: "online",
        alias: "产品",
      },
      {
        id: "design-director",
        name: "设计总监",
        role: "界面设计、设计复核",
        type: "cloud",
        status: "online",
        alias: "设计",
      },
      {
        id: "test-director",
        name: "测试总监",
        role: "质量检查、问题回流",
        type: "cloud",
        status: "online",
        alias: "测试",
      },
      {
        id: "ops-director",
        name: "运维总监",
        role: "预览发布、上线确认",
        type: "cloud",
        status: "online",
        alias: "运维",
      },
      ...LOCAL_AGENT_TEMPLATES.map((agent) => ({ ...agent })),
    ],
    bridge: {
      id: "desktop-bridge",
      status: "offline",
      pairedAt: null,
      command: "nomos bridge pair --workspace local",
      allowedWorkspaces: [],
      adapterCommands: {},
    },
    executions: [],
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

module.exports = {
  STAGE_TEMPLATES,
  LOCAL_AGENT_TEMPLATES,
  createDefaultData,
  createProject,
};
