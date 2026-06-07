"use strict";

const path = require("node:path");
const { createNomosServer } = require("./backend/server");

async function main() {
  const dataDir = path.join(__dirname, ".test-data");
  const backend = createNomosServer({
    dataDir,
    port: 2319,
  });
  const address = await backend.start();
  console.log(`TEST-SERVER-READY: ${address.url}`);

  // 写入 PID 文件，方便测试脚本结束后停止服务
  require("node:fs").writeFileSync(path.join(__dirname, ".test-server.pid"), String(process.pid));

  process.on("SIGINT", async () => {
    await backend.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
