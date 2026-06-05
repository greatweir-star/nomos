"use strict";

const TECH_ADAPTER_TEMPLATES = [
  {
    id: "alice",
    name: "Alice",
    provider: "Alice",
    scope: "local",
    connectorType: "MCP",
    dispatchMode: "mcp-message",
    receiptMode: "manual-sync",
    supportsDispatch: true,
    supportsExecution: false,
    configurable: false,
    capabilities: ["coordination", "workflow", "memory", "receipt-sync"],
    riskLevel: "medium",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    provider: "OpenAI",
    scope: "local",
    connectorType: "CLI",
    dispatchMode: "local-process",
    receiptMode: "process-exit",
    supportsDispatch: true,
    supportsExecution: true,
    configurable: true,
    capabilities: ["code", "terminal", "repo-analysis", "tests"],
    riskLevel: "high",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    provider: "Anthropic",
    scope: "local",
    connectorType: "CLI",
    dispatchMode: "local-process",
    receiptMode: "process-exit",
    supportsDispatch: true,
    supportsExecution: true,
    configurable: true,
    capabilities: ["code-review", "design-review", "repo-analysis"],
    riskLevel: "high",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    provider: "OpenClaw",
    scope: "local",
    connectorType: "Gateway",
    dispatchMode: "gateway",
    receiptMode: "gateway-event",
    supportsDispatch: false,
    supportsExecution: false,
    configurable: false,
    capabilities: ["desktop-control", "plugins", "local-tools"],
    riskLevel: "critical",
  },
  {
    id: "tencent-yuanqi",
    name: "腾讯元器",
    provider: "Tencent",
    scope: "cloud",
    connectorType: "Cloud API",
    dispatchMode: "cloud-api",
    receiptMode: "webhook-or-polling",
    supportsDispatch: true,
    supportsExecution: false,
    configurable: true,
    capabilities: ["customer-service", "knowledge-base", "workflow-bot"],
    riskLevel: "medium",
  },
  {
    id: "tencent-hunyuan-agent",
    name: "腾讯混元 Agent",
    provider: "Tencent",
    scope: "cloud",
    connectorType: "Cloud API",
    dispatchMode: "cloud-api",
    receiptMode: "webhook-or-polling",
    supportsDispatch: true,
    supportsExecution: false,
    configurable: true,
    capabilities: ["reasoning", "content", "analysis"],
    riskLevel: "medium",
  },
  {
    id: "tencent-cloud-agent",
    name: "腾讯云智能体",
    provider: "Tencent Cloud",
    scope: "cloud",
    connectorType: "Cloud API",
    dispatchMode: "cloud-api",
    receiptMode: "webhook-or-polling",
    supportsDispatch: true,
    supportsExecution: false,
    configurable: true,
    capabilities: ["cloud-workflow", "ops", "enterprise-integration"],
    riskLevel: "medium",
  },
  {
    id: "custom-cloud-agent",
    name: "自定义云端 Agent",
    provider: "Custom",
    scope: "cloud",
    connectorType: "HTTP API",
    dispatchMode: "cloud-api",
    receiptMode: "webhook-or-polling",
    supportsDispatch: true,
    supportsExecution: false,
    configurable: true,
    capabilities: ["custom-workflow"],
    riskLevel: "medium",
  },
];

const EMPLOYEE_TEMPLATES = [
  {
    id: "project-steward",
    name: "项目总管",
    alias: "总管",
    role: "拆任务、调度、验收",
    type: "cloud",
    status: "online",
    employee: {
      employeeNo: "NOMOS-SI-001",
      employmentType: "silicon",
      department: "流程运营部",
      title: "项目总管",
      responsibility: "端到端拆解、调度和阶段验收",
    },
    architecture: {
      adapterId: "alice",
      runtimeScope: "local",
      provider: "Alice",
      model: "MCP coordinator",
    },
  },
  {
    id: "product-director",
    name: "产品总监",
    alias: "产品",
    role: "调研、PRD、范围控制",
    type: "cloud",
    status: "online",
    employee: {
      employeeNo: "NOMOS-SI-002",
      employmentType: "silicon",
      department: "产品部",
      title: "产品总监",
      responsibility: "用户研究、PRD、版本范围和价值判断",
    },
    architecture: {
      adapterId: "tencent-hunyuan-agent",
      runtimeScope: "cloud",
      provider: "Tencent",
      model: "Hunyuan Agent",
    },
  },
  {
    id: "design-director",
    name: "设计总监",
    alias: "设计",
    role: "界面设计、设计复核",
    type: "cloud",
    status: "online",
    employee: {
      employeeNo: "NOMOS-SI-003",
      employmentType: "silicon",
      department: "体验设计部",
      title: "设计总监",
      responsibility: "界面、交互和信息架构设计",
    },
    architecture: {
      adapterId: "alice",
      runtimeScope: "local",
      provider: "Alice",
      model: "MCP coordinator",
    },
  },
  {
    id: "test-director",
    name: "测试总监",
    alias: "测试",
    role: "质量检查、问题回流",
    type: "cloud",
    status: "online",
    employee: {
      employeeNo: "NOMOS-SI-004",
      employmentType: "silicon",
      department: "质量部",
      title: "测试总监",
      responsibility: "测试策略、验收报告和缺陷回流",
    },
    architecture: {
      adapterId: "claude-code",
      runtimeScope: "local",
      provider: "Anthropic",
      model: "Claude Code",
    },
  },
  {
    id: "ops-director",
    name: "运维总监",
    alias: "运维",
    role: "预览发布、上线确认",
    type: "cloud",
    status: "online",
    employee: {
      employeeNo: "NOMOS-SI-005",
      employmentType: "silicon",
      department: "发布运维部",
      title: "运维总监",
      responsibility: "预览、发布、回退和运行状态确认",
    },
    architecture: {
      adapterId: "tencent-cloud-agent",
      runtimeScope: "cloud",
      provider: "Tencent Cloud",
      model: "Cloud Agent",
    },
  },
  {
    id: "alice",
    name: "Alice",
    alias: "Alice",
    role: "本地总管 · MCP 协作",
    type: "local",
    status: "pending",
    paired: true,
    employee: {
      employeeNo: "NOMOS-SI-101",
      employmentType: "silicon",
      department: "本地执行部",
      title: "本地协作员",
      responsibility: "本地 MCP 协作、会话同步和任务回执",
    },
    architecture: {
      adapterId: "alice",
      runtimeScope: "local",
      provider: "Alice",
      model: "MCP",
    },
  },
  {
    id: "claude-code",
    name: "Claude Code",
    alias: "设计复核员",
    role: "设计复核 · 可调用",
    type: "local",
    status: "online",
    paired: true,
    employee: {
      employeeNo: "NOMOS-SI-102",
      employmentType: "silicon",
      department: "本地执行部",
      title: "代码与设计复核员",
      responsibility: "代码阅读、方案复核和测试建议",
    },
    architecture: {
      adapterId: "claude-code",
      runtimeScope: "local",
      provider: "Anthropic",
      model: "Claude Code CLI",
    },
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    alias: "开发执行器",
    role: "代码仓库 · 等待派发",
    type: "local",
    status: "online",
    paired: true,
    employee: {
      employeeNo: "NOMOS-SI-103",
      employmentType: "silicon",
      department: "本地执行部",
      title: "开发工程师",
      responsibility: "代码修改、自动化测试和本地仓库操作",
    },
    architecture: {
      adapterId: "codex-cli",
      runtimeScope: "local",
      provider: "OpenAI",
      model: "Codex CLI",
    },
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    alias: "桌面助理",
    role: "桌面操作 · 待网关配置",
    type: "local",
    status: "pending",
    paired: true,
    employee: {
      employeeNo: "NOMOS-SI-104",
      employmentType: "silicon",
      department: "本地执行部",
      title: "桌面操作员",
      responsibility: "桌面级工具调用和插件执行",
    },
    architecture: {
      adapterId: "openclaw",
      runtimeScope: "local",
      provider: "OpenClaw",
      model: "Local Gateway",
    },
  },
  {
    id: "tencent-yuanqi-agent",
    name: "腾讯元器客服专员",
    alias: "元器",
    role: "知识库问答 · 云端待接入",
    type: "cloud",
    status: "pending",
    employee: {
      employeeNo: "NOMOS-SI-201",
      employmentType: "silicon",
      department: "客户运营部",
      title: "云端客服专员",
      responsibility: "知识库问答、客户线索初筛和标准化回复",
    },
    architecture: {
      adapterId: "tencent-yuanqi",
      runtimeScope: "cloud",
      provider: "Tencent",
      model: "Yuanqi Agent",
    },
  },
  {
    id: "tencent-hunyuan-analyst",
    name: "腾讯混元分析员",
    alias: "混元分析",
    role: "内容与数据分析 · 云端待接入",
    type: "cloud",
    status: "pending",
    employee: {
      employeeNo: "NOMOS-SI-202",
      employmentType: "silicon",
      department: "经营分析部",
      title: "云端分析员",
      responsibility: "内容分析、经营洞察和报告生成",
    },
    architecture: {
      adapterId: "tencent-hunyuan-agent",
      runtimeScope: "cloud",
      provider: "Tencent",
      model: "Hunyuan Agent",
    },
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultAgents() {
  return clone(EMPLOYEE_TEMPLATES);
}

function localAgentTemplates() {
  return EMPLOYEE_TEMPLATES.filter((agent) => agent.type === "local").map((agent) => clone(agent));
}

function normalizeAdapterConfigs(configs) {
  const source = configs && typeof configs === "object" ? configs : {};
  const normalized = {};
  for (const adapter of TECH_ADAPTER_TEMPLATES) {
    const config = source[adapter.id] && typeof source[adapter.id] === "object" ? source[adapter.id] : {};
    normalized[adapter.id] = {
      status: ["configured", "disabled"].includes(config.status) ? config.status : "unconfigured",
      endpoint: typeof config.endpoint === "string" ? config.endpoint.trim().slice(0, 500) : "",
      workspace: typeof config.workspace === "string" ? config.workspace.trim().slice(0, 200) : "",
      tokenConfigured: Boolean(config.tokenConfigured),
      updatedAt: typeof config.updatedAt === "string" ? config.updatedAt : null,
    };
  }
  return normalized;
}

function publicAdapterConfig(config) {
  return {
    status: config?.status || "unconfigured",
    endpoint: config?.endpoint || "",
    workspace: config?.workspace || "",
    tokenConfigured: Boolean(config?.tokenConfigured),
    updatedAt: config?.updatedAt || null,
  };
}

function createAdapterDirectory({ localTools = [], adapterConfigs = {} } = {}) {
  const toolById = new Map((localTools || []).map((tool) => [tool.id, tool]));
  const configs = normalizeAdapterConfigs(adapterConfigs);
  return TECH_ADAPTER_TEMPLATES.map((adapter) => {
    const tool = toolById.get(adapter.id);
    const config = configs[adapter.id];
    const cloudConfigured = adapter.scope === "cloud" && config.status === "configured";
    return {
      ...clone(adapter),
      config: publicAdapterConfig(config),
      connectionStatus: adapter.scope === "local"
        ? tool?.connectionStatus || "unavailable"
        : cloudConfigured
          ? "configured"
          : "unconfigured",
      statusLabel: adapter.scope === "local"
        ? tool?.statusLabel || "等待本地检测"
        : cloudConfigured
          ? "云端接入已配置"
          : "等待配置云端接入",
      detail: adapter.scope === "local"
        ? tool?.detail || "本机适配器由本地桥接检测"
        : cloudConfigured
          ? `${adapter.provider} · ${config.endpoint || "已登记接口"}`
          : "填写 API 入口、工作区和密钥状态后即可纳入调度候选",
      supportsExecution: adapter.scope === "local" ? tool?.supportsExecution === true : false,
      supportsDispatch: adapter.supportsDispatch !== false,
    };
  });
}

function enrichAgents({ agents = [], localTools = [], adapterConfigs = {} } = {}) {
  const adapterById = new Map(createAdapterDirectory({ localTools, adapterConfigs }).map((adapter) => [adapter.id, adapter]));
  return agents.map((agent) => {
    const architecture = agent.architecture || {};
    const adapter = adapterById.get(architecture.adapterId || agent.id);
    const next = {
      ...agent,
      employee: agent.employee || {
        employeeNo: agent.id,
        employmentType: agent.type === "human" ? "carbon" : "silicon",
        department: "未分组",
        title: agent.name,
        responsibility: agent.role || "",
      },
      architecture: {
        adapterId: architecture.adapterId || agent.id,
        runtimeScope: architecture.runtimeScope || agent.type || "cloud",
        provider: architecture.provider || adapter?.provider || "Unknown",
        model: architecture.model || adapter?.name || agent.name,
      },
      adapter: adapter || null,
    };
    if (adapter) {
      next.status = adapter.connectionStatus === "connected" || adapter.connectionStatus === "configured"
        ? "online"
        : "pending";
      next.connection = {
        connectionStatus: adapter.connectionStatus,
        statusLabel: adapter.statusLabel,
        detail: adapter.detail,
        connectorType: adapter.connectorType,
      };
    }
    return next;
  });
}

function mergeDefaultAgents(existingAgents) {
  const current = Array.isArray(existingAgents) ? existingAgents : [];
  const byId = new Map(current.map((agent) => [agent.id, agent]));
  for (const template of EMPLOYEE_TEMPLATES) {
    if (!byId.has(template.id)) {
      current.push(clone(template));
      continue;
    }
    const target = byId.get(template.id);
    target.employee = target.employee || clone(template.employee);
    target.architecture = target.architecture || clone(template.architecture);
    target.alias = target.alias || template.alias;
    target.role = target.role || template.role;
    target.type = target.type || template.type;
  }
  return current;
}

module.exports = {
  TECH_ADAPTER_TEMPLATES,
  EMPLOYEE_TEMPLATES,
  createAdapterDirectory,
  createDefaultAgents,
  enrichAgents,
  localAgentTemplates,
  mergeDefaultAgents,
  normalizeAdapterConfigs,
};
