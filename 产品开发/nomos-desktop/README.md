# Nomos Desktop V0.0.3

Nomos 是一个本地优先的数字员工项目指挥台。V0.0.3 使用 Electron、React、TypeScript 和 SQLite，覆盖连接、组织、流程、项目、派发、回执、验收、备份与诊断的最小业务闭环。

本版本的产品、架构、研发和验收资料位于仓库的 `项目管理/版本级资料/V0.0.3`。

## 当前能力

- 连接管理：检测、测试和启停 Codex、Claude、Kimi、Alice 等连接。
- 数字组织：Skill、岗位、数字员工、权限申请和运行时凭证隔离。
- 流程与项目：流程定义、版本校验发布、项目快照和工作项。
- 派发闭环：候选筛选、排序、确认、容量占用、执行、回执、验收与返工。
- 系统保障：SQLite 完整性诊断、审计、敏感信息扫描、备份恢复和旧数据迁移。
- 本地安全：仅监听回环地址、Origin 校验、安全响应头、会话密钥不落盘。

## 本地开发

```powershell
npm install
npm run release:check
npm start
```

只启动新版浏览器服务：

```shell
npm run start:server:v1
```

服务会在可用的本地端口启动。桌面端默认使用新版界面；需要查看历史界面时使用 `npm run start:legacy`。

## 打包

```shell
npm run dist:mac
npm run dist:win
```

制品输出到 `release` 目录。macOS 生成 DMG/ZIP（Apple Silicon），Windows 生成可解压运行的 x64 ZIP。Windows 构建机也可运行 `npm run dist:win:portable` 生成单文件便携版。

## 数据目录

桌面版数据保存在 Electron 当前用户数据目录下的 SQLite 数据库中；开发服务数据保存在项目目录的 `.local-data-v1`。升级或迁移前请先在“设置 → 备份恢复”创建备份。
