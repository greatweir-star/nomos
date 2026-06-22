const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function filesUnder(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(current));
    else if (entry.isFile()) result.push(current);
  }
  return result;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin" || process.env.NOMOS_ADHOC_SIGN !== "1") {
    return;
  }

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;
  for (const filePath of filesUnder(appPath)) {
    const type = execFileSync("file", [filePath], { encoding: "utf8" });
    if (!type.includes("Mach-O")) continue;
    try {
      execFileSync("codesign", ["--remove-signature", filePath], { stdio: "ignore" });
    } catch {
      // An unsigned nested binary is expected on some Electron releases.
    }
    execFileSync("codesign", ["--force", "--sign", "-", filePath], { stdio: "ignore" });
  }
  execFileSync("codesign", ["--deep", "--force", "--sign", "-", appPath], { stdio: "inherit" });
};
