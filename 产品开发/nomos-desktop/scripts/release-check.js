"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const failures = [];
if (!pkg.scripts?.["release:check"] || !pkg.devDependencies?.electron || !pkg.build?.files) {
  failures.push("package.json 缺少开发、验证或打包配置");
}
const requireFile = (relative) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) failures.push(`缺少发布文件：${relative}`);
};

if (pkg.version !== "0.0.3") failures.push(`版本号应为 0.0.3，当前为 ${pkg.version}`);
if (pkg.build?.productName !== "Nomos") failures.push("productName 必须为 Nomos");
for (const file of ["dist-ts/server/index.js", "renderer-v2/index.html", "build/icon.png", "build/icon.svg", "electron/main.js"]) requireFile(file);

const rendererFiles = fs.existsSync(path.join(root, "renderer-v2", "assets"))
  ? fs.readdirSync(path.join(root, "renderer-v2", "assets")).filter((file) => file.endsWith(".js"))
  : [];
const rendererText = rendererFiles.map((file) => fs.readFileSync(path.join(root, "renderer-v2", "assets", file), "utf8")).join("\n");
if (/mockDashboard|示例员工|固定告警/.test(rendererText)) failures.push("生产 Renderer 包含 Mock/固定演示数据标识");

const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
for (const rule of ["contextIsolation: true", "nodeIntegration: false", "sandbox: true", "webSecurity: true", "setPermissionRequestHandler"]) {
  if (!main.includes(rule)) failures.push(`Electron 安全配置缺失：${rule}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Nomos ${pkg.version} 发布静态门禁通过；Renderer 资源 ${rendererFiles.length} 个。`);
