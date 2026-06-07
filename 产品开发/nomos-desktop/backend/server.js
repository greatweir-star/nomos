"use strict";

const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const { JsonStore } = require("./store");
const { ExecutionManager } = require("./executor");
const { DeploymentManager } = require("./deployment");
const { AliceCoordinator } = require("./alice");
const { sendError, serveStatic } = require("./utils");
const handleSystem = require("./routes/system");
const handleProjects = require("./routes/projects");
const handleAgents = require("./routes/agents");
const handleBridge = require("./routes/bridge");
const handleOrg = require("./routes/org");
const handleFlow = require("./routes/flow");

const FETCH_BLOCKED_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103,
  104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513,
  514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

function createRequestHandler({ store, rendererDir, executionManager, aliceCoordinator, deploymentManager }) {
  return async function handleRequest(request, response) {
    const url = new URL(request.url, "http://127.0.0.1");
    const segments = url.pathname.split("/").filter(Boolean);
    const host = request.headers.host || "";
    const origin = request.headers.origin;

    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
        sendError(response, 403, "仅允许本机访问");
        return;
      }

      if (segments[0] === "api" && origin) {
        const originUrl = new URL(origin);
        const isLocalOrigin = /^(127\.0\.0\.1|localhost)$/.test(originUrl.hostname);
        if (!isLocalOrigin || originUrl.host !== host) {
          sendError(response, 403, "请求来源不受信任");
          return;
        }
      }

      if (segments[0] !== "api") {
        serveStatic(response, rendererDir, url.pathname);
        return;
      }

      const handlers = [
        handleSystem,
        handleProjects,
        handleAgents,
        handleBridge,
        handleOrg,
        handleFlow,
      ];

      for (const handler of handlers) {
        if (await handler(request, response, url, segments, store, executionManager, aliceCoordinator, deploymentManager)) {
          return;
        }
      }

      sendError(response, 404, "接口不存在");
    } catch (error) {
      sendError(response, 500, error.message || "服务异常");
    }
  };
}

function createNomosServer({
  dataDir,
  rendererDir = path.join(__dirname, "..", "renderer"),
  host = "127.0.0.1",
  port = 0,
  executionManagerOptions = {},
  aliceCoordinatorOptions = {},
  deploymentManagerOptions = {},
}) {
  const store = new JsonStore({ dataDir });
  store.load();
  const executionManager = new ExecutionManager({ store, ...executionManagerOptions });
  const aliceCoordinator = new AliceCoordinator({ store, ...aliceCoordinatorOptions });
  const deploymentManager = new DeploymentManager({ store, executionManager, ...deploymentManagerOptions });
  const server = http.createServer(createRequestHandler({ store, rendererDir, executionManager, aliceCoordinator, deploymentManager }));

  return {
    store,
    executionManager,
    aliceCoordinator,
    deploymentManager,
    start() {
      return new Promise((resolve, reject) => {
        const listen = () => server.listen(port, host, () => {
          const address = server.address();
          if (port === 0 && FETCH_BLOCKED_PORTS.has(address.port)) {
            server.close(listen);
            return;
          }
          server.removeListener("error", reject);
          resolve({
            host,
            port: address.port,
            url: `http://${host}:${address.port}`,
          });
        });
        server.once("error", reject);
        listen();
      });
    },
    async stop() {
      await executionManager.shutdown();
      return new Promise((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

module.exports = { createNomosServer };
