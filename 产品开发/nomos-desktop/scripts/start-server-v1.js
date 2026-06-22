"use strict";

const path = require("node:path");
const { createNomosServerV1 } = require("../dist-ts/server");

const server = createNomosServerV1({
  dataDir: path.join(__dirname, "..", ".local-data", "v1-dev"),
  rendererDir: path.join(__dirname, "..", "renderer-v2"),
  port: Number(process.env.NOMOS_V1_PORT || 4175),
});

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

server.start().catch((error) => {
  console.error(error);
  process.exit(1);
});
