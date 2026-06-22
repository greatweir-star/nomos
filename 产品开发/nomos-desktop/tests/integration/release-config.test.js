const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.join(__dirname, "../..");

describe("release/config", () => {
  it("默认启动 V0.0.3 Renderer 且 Electron 安全配置完整", () => {
    const main = fs.readFileSync(path.join(root, "electron/main.js"), "utf8");
    assert.match(main, /const useRendererV2 = !process\.argv\.includes\("--renderer-legacy"\)/);
    assert.match(main, /contextIsolation: true/);
    assert.match(main, /nodeIntegration: false/);
    assert.match(main, /sandbox: true/);
    assert.match(main, /webSecurity: true/);
    assert.match(main, /setPermissionRequestHandler/);
  });

  it("发布配置包含 macOS Apple Silicon、V1 产物和正式图标", () => {
    const pkg = require(path.join(root, "package.json"));
    assert.strictEqual(pkg.version, "0.0.3");
    assert.strictEqual(pkg.build.productName, "Nomos");
    assert.ok(pkg.build.files.includes("dist-ts/**/*"));
    assert.ok(pkg.build.files.includes("renderer-v2/**/*"));
    assert.ok(pkg.build.mac.target.some((target) => target.target === "dmg"));
    assert.equal(pkg.build.afterPack, "scripts/after-pack.js");
    const icon = fs.readFileSync(path.join(root, "build/icon.png"));
    assert.deepStrictEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
