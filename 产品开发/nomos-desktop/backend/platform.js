"use strict";

const os = require("node:os");
const path = require("node:path");

function getDefaultDataDir() {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
    return path.join(home, "Alice", "Nomos");
  }
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Nomos");
  }
  return path.join(home, ".local", "share", "nomos");
}

function getAliceDataDir() {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
    return path.join(home, "Alice", "AliceData");
  }
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Alice");
  }
  return path.join(home, ".local", "share", "alice");
}

function getDefaultRendererDir() {
  return path.join(__dirname, "..", "renderer");
}

module.exports = { getDefaultDataDir, getAliceDataDir, getDefaultRendererDir };
