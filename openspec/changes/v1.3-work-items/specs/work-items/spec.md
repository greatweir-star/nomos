# Delta for Work Items & Dashboards

> Change: v1.3-work-items
> Based on: PRD_V1_3_WORK_ITEMS_AND_DASHBOARDS.md

---

## ADDED Requirements

### Requirement: 工作项模型

The system SHALL support `workItems[]` and `workItemEvents[]` in `nomos-data.json` (v8 → v9 migration).

#### Scenario: Create work item from flow stage
- GIVEN a project with `flowInstanceId` and active stage
- WHEN user creates a work item under the stage
- THEN the system SHALL store it in `workItems[]` with `source: "flow_stage"`
- AND link it via `flowInstanceId + stageId + templateStageId`
- AND inherit stage context and role suggestions from `flowTemplates`

#### Scenario: Create manual work item
- GIVEN any project
- WHEN user creates a work item without binding to a flow stage
- THEN the system SHALL store it with `source: "manual"`
- AND allow free assignment of owner, role, skill, priority, deadline

#### Scenario: Mirror legacy workflow task
- GIVEN an old project with `workflowTasks[]`
- WHEN user opens the project
- THEN the system SHALL generate read-only mirror work items with `source: "legacy_workflow_task"`
- AND map `stageKey` to display stage: goal/design/prd/develop/test/deploy/acceptance
- AND keep original task dispatch logic unchanged

### Requirement: 工作项状态机

The system SHALL enforce work item state transitions.

#### Scenario: Normal state flow
- GIVEN a work item in `todo` state
- WHEN all dependencies are `done` or `cancelled`
- THEN the system SHALL allow transition to `ready`
- AND from `ready` to `in_progress`
- AND from `in_progress` to `review_pending`
- AND from `review_pending` to `done`

#### Scenario: Blocked by dependency
- GIVEN a work item with unfinished dependencies
- WHEN user attempts to set it to `in_progress`
- THEN the system SHALL return HTTP 409
- AND provide the list of incomplete dependency IDs

#### Scenario: Cancelled work item
- GIVEN a work item in any state
- WHEN user cancels it
- THEN the system SHALL set state to `cancelled`
- AND cancelled items SHALL satisfy dependency checks for downstream items

### Requirement: 工作项依赖

The system SHALL support `dependsOn: string[]` with validation.

#### Scenario: Add valid dependency
- GIVEN two work items in the same project
- WHEN user adds dependency from A to B
- THEN the system SHALL verify both items exist
- AND verify they are in the same project
- AND verify no self-dependency
- AND verify no cycle would be created

#### Scenario: Detect cycle
- GIVEN work items A → B → C
- WHEN user attempts to add C → A dependency
- THEN the system SHALL reject with cycle detection error
- AND prevent the dependency creation

### Requirement: 工作项事件日志

The system SHALL append all state changes to `workItemEvents[]`.

#### Scenario: Status change event
- GIVEN a work item status update
- WHEN the update is persisted
- THEN the system SHALL append `status.changed` event
- WITH `before`, `after`, `changedBy`, `timestamp`

#### Scenario: Assignee change event
- GIVEN a work item reassignment
- WHEN the new assignee is saved
- THEN the system SHALL append `assignee.changed` event
- WITH `before`, `after`, `changedBy`, `reason`

### Requirement: 进度看板

The system SHALL provide multi-view progress dashboards.

#### Scenario: Project view
- GIVEN a project with work items
- WHEN user opens project dashboard
- THEN the system SHALL show all work items grouped by state
- AND show completion percentage
- AND highlight blocked/waiting items

#### Scenario: Resource view
- GIVEN multiple projects with assigned work items
- WHEN user opens resource dashboard
- THEN the system SHALL show per-assignee workload
- AND show in-progress count, overdue count, blocked count
- AND show estimated remaining hours

### Requirement: 数据迁移 v8 → v9

The system SHALL migrate existing data without loss.

#### Scenario: Migrate existing project
- GIVEN a v8 `nomos-data.json`
- WHEN system starts with v1.3
- THEN `migrateData()` SHALL add empty `workItems[]` and `workItemEvents[]`
- AND preserve all existing fields
- AND backup original file before migration

---

## MODIFIED Requirements

### Requirement: Project data model

The system MUST support `workItems` and `workItemEvents` fields.
(Previously: Only `projects`, `agents`, `flowTemplates`, `flowInstances`, etc.)

---

## REMOVED Requirements

None. V1.3 is purely additive with backward compatibility.
