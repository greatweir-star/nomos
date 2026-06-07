"use strict";

const path = require("node:path");
const { createNomosServer } = require("../backend/server");

async function main() {
  const backend = createNomosServer({
    dataDir: path.join(__dirname, "..", ".local-data"),
    port: Number(process.env.PORT || 4174),
  });
  const address = await backend.start();
  console.log(`nomos local backend: ${address.url}`);

  async function shutdown() {
    await backend.stop();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
