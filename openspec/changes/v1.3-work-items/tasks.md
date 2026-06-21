# v1.3 Work Items & Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现 V1.3 工作项与进度资源看板（workItems + workItemEvents + 看板）
**Architecture:** 基于现有 JsonStore 和原生 http，不引入外部依赖
**Tech Stack:** Node.js 原生 http, Electron, 原生 JavaScript

---

## Task 1: v8→v9 数据迁移

**Files:**
- Create: `backend/migrations/v9.js`
- Modify: `backend/store.js`

**Steps:**

- [ ] **Step 1: Write migration logic**

```javascript
// backend/migrations/v9.js
function migrateV8ToV9(data) {
  if (data.version >= 9) return data;
  
  data.workItems = data.workItems || [];
  data.workItemEvents = data.workItemEvents || [];
  data.version = 9;
  
  return data;
}

module.exports = { migrateV8ToV9 };
```

- [ ] **Step 2: Integrate into store.js migrateData()**

```javascript
// In store.js migrateData()
const { migrateV8ToV9 } = require('./migrations/v9');

function migrateData(data) {
  // existing migrations...
  if (data.version === 8) {
    data = migrateV8ToV9(data);
  }
  return data;
}
```

- [ ] **Step 3: Run tests**

Run: `cd backend && node --test tests/server.test.js`
Expected: 47 tests pass (backward compatibility)

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/v9.js backend/store.js
git commit -m "feat: add v8 to v9 migration for workItems and workItemEvents"
```

---

## Task 2: 工作项 CRUD API

**Files:**
- Create: `backend/work-items.js`
- Modify: `backend/server.js`

**Steps:**

- [ ] **Step 1: Create work-items.js module**

```javascript
// backend/work-items.js
const { v4: uuidv4 } = require('crypto').randomUUID;

function createWorkItem(store, projectId, item) {
  const id = uuidv4();
  const workItem = {
    id,
    projectId,
    source: item.source || 'manual',
    title: item.title,
    description: item.description || '',
    status: 'todo',
    assignee: item.assignee || null,
    role: item.role || null,
    skill: item.skill || null,
    priority: item.priority || 'medium',
    deadline: item.deadline || null,
    dependsOn: item.dependsOn || [],
    parentId: item.parentId || null,
    order: item.order || 0,
    flowInstanceId: item.flowInstanceId || null,
    stageId: item.stageId || null,
    legacyWorkflowTaskId: item.legacyWorkflowTaskId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  store.data.workItems.push(workItem);
  logEvent(store, { type: 'item.created', itemId: id, projectId });
  store.save();
  return workItem;
}

function getWorkItems(store, projectId) {
  return store.data.workItems.filter(i => i.projectId === projectId);
}

function updateWorkItem(store, id, updates) {
  const item = store.data.workItems.find(i => i.id === id);
  if (!item) return null;
  
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  logEvent(store, { type: 'item.updated', itemId: id, changes: Object.keys(updates) });
  store.save();
  return item;
}

function deleteWorkItem(store, id) {
  const idx = store.data.workItems.findIndex(i => i.id === id);
  if (idx === -1) return false;
  
  store.data.workItems.splice(idx, 1);
  logEvent(store, { type: 'item.deleted', itemId: id });
  store.save();
  return true;
}

function logEvent(store, event) {
  store.data.workItemEvents.push({
    id: uuidv4(),
    ...event,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { createWorkItem, getWorkItems, updateWorkItem, deleteWorkItem };
```

- [ ] **Step 2: Add routes to server.js**

```javascript
// In server.js
const workItems = require('./work-items');

// POST /api/projects/:id/work-items
// GET /api/projects/:id/work-items
// PUT /api/work-items/:id
// DELETE /api/work-items/:id
```

- [ ] **Step 3: Write tests**

```javascript
// tests/server.test.js
// Add work-items CRUD tests
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/work-items.js backend/server.js tests/server.test.js
git commit -m "feat: add work items CRUD API"
```

---

## Task 3: 状态机与依赖检测

**Files:**
- Modify: `backend/work-items.js`

**Steps:**

- [ ] **Step 1: Implement state machine**

```javascript
const validTransitions = {
  todo: ['ready', 'cancelled'],
  ready: ['in_progress', 'cancelled'],
  in_progress: ['review_pending', 'blocked', 'cancelled'],
  review_pending: ['done', 'in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  waiting_dependency: ['ready', 'cancelled'],
  done: [],
  cancelled: [],
};

function canTransition(from, to) {
  return validTransitions[from]?.includes(to);
}
```

- [ ] **Step 2: Implement dependency validation**

```javascript
function validateDependencies(store, itemId, dependsOn) {
  const items = store.data.workItems;
  const item = items.find(i => i.id === itemId);
  
  // Check exists
  for (const depId of dependsOn) {
    const dep = items.find(i => i.id === depId);
    if (!dep) return { valid: false, error: `Dependency ${depId} not found` };
    if (dep.projectId !== item.projectId) return { valid: false, error: 'Cross-project dependency not allowed' };
    if (dep.id === itemId) return { valid: false, error: 'Self-dependency not allowed' };
  }
  
  // Check cycle
  const visited = new Set();
  const stack = new Set();
  
  function hasCycle(id) {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    
    const node = items.find(i => i.id === id);
    for (const depId of node?.dependsOn || []) {
      if (hasCycle(depId)) return true;
    }
    stack.delete(id);
    return false;
  }
  
  // Temporarily set dependencies to check
  const originalDeps = item.dependsOn;
  item.dependsOn = dependsOn;
  const cycle = hasCycle(itemId);
  item.dependsOn = originalDeps;
  
  if (cycle) return { valid: false, error: 'Circular dependency detected' };
  return { valid: true };
}
```

- [ ] **Step 3: Integrate into updateWorkItem**

```javascript
// Before status change, check dependencies
if (updates.status === 'in_progress') {
  const incompleteDeps = item.dependsOn.filter(depId => {
    const dep = store.data.workItems.find(i => i.id === depId);
    return dep && !['done', 'cancelled'].includes(dep.status);
  });
  if (incompleteDeps.length > 0) {
    throw { status: 409, message: 'Incomplete dependencies', dependencies: incompleteDeps };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/work-items.js
git commit -m "feat: add work item state machine and dependency validation"
```

---

## Task 4: 旧任务镜像

**Files:**
- Modify: `backend/work-items.js`
- Modify: `backend/workflow.js`

**Steps:**

- [ ] **Step 1: Implement legacy task mirroring**

```javascript
function mirrorLegacyTasks(store, projectId) {
  const project = store.data.projects.find(p => p.id === projectId);
  if (!project?.workflowTasks) return;
  
  const stageMap = {
    goal: '提出目标',
    design: '总管拆解',
    prd: 'PRD',
    develop: '本地开发',
    test: '测试',
    deploy: '预览发布',
    acceptance: '人工验收',
  };
  
  for (const task of project.workflowTasks) {
    const exists = store.data.workItems.find(i => i.legacyWorkflowTaskId === task.id);
    if (exists) continue;
    
    createWorkItem(store, projectId, {
      source: 'legacy_workflow_task',
      title: task.title || '未命名任务',
      description: task.description || '',
      status: mapLegacyStatus(task.status),
      assignee: task.assignee,
      legacyWorkflowTaskId: task.id,
      stageKey: task.stageKey,
      stageName: stageMap[task.stageKey] || '未分类阶段',
    });
  }
}

function mapLegacyStatus(status) {
  const map = {
    pending: 'todo',
    running: 'in_progress',
    completed: 'done',
    failed: 'blocked',
    retrying: 'waiting_dependency',
  };
  return map[status] || 'todo';
}
```

- [ ] **Step 2: Trigger mirroring on project open**

```javascript
// In workflow.js or server.js, when fetching project details
mirrorLegacyTasks(store, projectId);
```

- [ ] **Step 3: Run tests**

Run: `node --test tests/server.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/work-items.js backend/workflow.js
git commit -m "feat: mirror legacy workflow tasks into work items"
```

---

## Task 5: 看板聚合查询

**Files:**
- Create: `backend/dashboard.js`
- Modify: `backend/server.js`

**Steps:**

- [ ] **Step 1: Create dashboard.js**

```javascript
// backend/dashboard.js
function getProjectDashboard(store, projectId) {
  const items = store.data.workItems.filter(i => i.projectId === projectId);
  
  const byStatus = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }
  
  const total = items.length;
  const done = byStatus.done || 0;
  const cancelled = byStatus.cancelled || 0;
  const completionRate = total > 0 ? ((done + cancelled) / total * 100).toFixed(1) : 0;
  
  return {
    projectId,
    total,
    byStatus,
    completionRate,
    blocked: items.filter(i => i.status === 'blocked' || i.status === 'waiting_dependency'),
    overdue: items.filter(i => i.deadline && new Date(i.deadline) < new Date() && !['done', 'cancelled'].includes(i.status)),
  };
}

function getResourceDashboard(store) {
  const items = store.data.workItems;
  const byAssignee = {};
  
  for (const item of items) {
    const key = item.assignee || 'unassigned';
    if (!byAssignee[key]) {
      byAssignee[key] = { inProgress: 0, overdue: 0, blocked: 0, totalHours: 0 };
    }
    if (item.status === 'in_progress') byAssignee[key].inProgress++;
    if (item.status === 'blocked') byAssignee[key].blocked++;
    if (item.deadline && new Date(item.deadline) < new Date()) byAssignee[key].overdue++;
  }
  
  return { byAssignee };
}

module.exports = { getProjectDashboard, getResourceDashboard };
```

- [ ] **Step 2: Add routes**

```javascript
// GET /api/projects/:id/dashboard
// GET /api/dashboard/resources
```

- [ ] **Step 3: Run tests**

Run: `node --test tests/server.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/dashboard.js backend/server.js
git commit -m "feat: add progress and resource dashboards"
```

---

## Task 6: 前端工作项页面

**Files:**
- Create: `renderer/pages/work-items.js`
- Modify: `renderer/app.js`
- Modify: `renderer/index.html`

**Steps:**

- [ ] **Step 1: Create work-items page component**

```javascript
// renderer/pages/work-items.js
function renderWorkItemsPage(projectId) {
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div class="work-items-page">
      <h2>工作项</h2>
      <div class="work-items-filters">
        <select id="status-filter">
          <option value="">全部状态</option>
          <option value="todo">待开始</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </select>
        <button id="create-work-item">新建工作项</button>
      </div>
      <div id="work-items-list"></div>
    </div>
  `;
  
  loadWorkItems(projectId);
}

async function loadWorkItems(projectId) {
  const res = await fetch(`/api/projects/${projectId}/work-items`);
  const items = await res.json();
  const list = document.getElementById('work-items-list');
  list.innerHTML = items.map(item => renderWorkItemCard(item)).join('');
}

function renderWorkItemCard(item) {
  return `
    <div class="work-item-card status-${item.status}">
      <h4>${item.title}</h4>
      <span class="status-badge">${item.status}</span>
      <p>${item.description}</p>
      ${item.assignee ? `<span class="assignee">@${item.assignee}</span>` : ''}
    </div>
  `;
}
```

- [ ] **Step 2: Add navigation to app.js**

```javascript
// In app.js rail navigation
{ label: '工作项', page: 'work-items', icon: 'task' },
{ label: '看板', page: 'dashboard', icon: 'dashboard' },
```

- [ ] **Step 3: Add HTML structure**

```html
<!-- In index.html -->
<div id="work-items-page" class="page hidden"></div>
<div id="dashboard-page" class="page hidden"></div>
```

- [ ] **Step 4: Verify Electron starts**

Run: `npm start`
Expected: App starts, new nav items visible

- [ ] **Step 5: Commit**

```bash
git add renderer/pages/work-items.js renderer/app.js renderer/index.html
git commit -m "feat: add work items frontend page"
```

---

## Task 7: 前端看板页面

**Files:**
- Create: `renderer/pages/dashboard.js`
- Modify: `renderer/app.js`
- Modify: `renderer/index.html`

**Steps：**

- [ ] **Step 1: Create dashboard page**

```javascript
// renderer/pages/dashboard.js
function renderDashboardPage(projectId) {
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div class="dashboard-page">
      <h2>进度看板</h2>
      <div id="project-stats"></div>
      <div id="status-chart"></div>
      <div id="blocked-items"></div>
    </div>
  `;
  
  loadDashboard(projectId);
}

async function loadDashboard(projectId) {
  const res = await fetch(`/api/projects/${projectId}/dashboard`);
  const data = await res.json();
  
  document.getElementById('project-stats').innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${data.completionRate}%</span>
      <span class="stat-label">完成率</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${data.total}</span>
      <span class="stat-label">总工作项</span>
    </div>
  `;
}
```

- [ ] **Step 2: Add resource board**

```javascript
// renderer/pages/resource-board.js
function renderResourceBoard() {
  // Similar pattern, fetch /api/dashboard/resources
}
```

- [ ] **Step 3: Commit**

```bash
git add renderer/pages/dashboard.js renderer/pages/resource-board.js renderer/app.js renderer/index.html
git commit -m "feat: add dashboard and resource board frontend"
```

---

## Task 8: 端到端测试补全

**Files:**
- Modify: `tests/server.test.js`

**Steps：**

- [ ] **Step 1: Add work items E2E tests**

```javascript
// tests/server.test.js
// Test: Create work item
// Test: Update status with dependency check
// Test: Cycle dependency rejection
// Test: Legacy task mirroring
// Test: Dashboard aggregation
// Test: v8→v9 migration
```

- [ ] **Step 2: Run full test suite**

Run: `node --test tests/server.test.js`
Expected: 47 existing + new tests all pass

- [ ] **Step 3: Commit**

```bash
git add tests/server.test.js
git commit -m "test: add work items and dashboard E2E tests"
```

---

## 验收标准

### 功能验收
- [ ] 工作项 CRUD：创建、读取、更新、删除
- [ ] 状态机：8 种状态，合法转换
- [ ] 依赖检测：同项目、无自依赖、无循环
- [ ] 旧任务镜像：workflowTasks 自动映射到看板
- [ ] 事件日志：所有变更追加到 workItemEvents
- [ ] 进度看板：项目级统计、完成率、阻塞项
- [ ] 资源看板：按执行者聚合负载

### 数据验收
- [ ] v8 数据迁移后不影响现有功能
- [ ] 备份恢复兼容 v9 数据

### 测试验收
- [ ] 现有 47 项测试全部通过
- [ ] 新增工作项测试覆盖 CRUD + 状态机 + 依赖
- [ ] 新增看板测试覆盖聚合查询
- [ ] 新增迁移测试覆盖 v8→v9
