"use strict";

const RECEIPT_STATUSES = new Set(["progress", "completed", "failed", "cancelled"]);

function asText(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function tryParseJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  const object = trimmed.match(/\{[\s\S]*\}/);
  if (object) candidates.push(object[0]);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep looking for a structured receipt embedded in adapter output.
    }
  }
  return null;
}

function normalizeDeliverables(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && String(item.name || "").trim())
    .map((item) => ({
      type: String(item.type || "FILE").trim(),
      name: String(item.name).trim(),
      url: String(item.url || "").trim(),
      summary: String(item.summary || "").trim(),
    }))
    .slice(0, 20);
}

function parseTestReport(raw) {
  const text = asText(raw);
  const parsed = tryParseJson(text);
  const report = parsed?.testReport || parsed?.tests;
  if (report && typeof report === "object" && !Array.isArray(report)) {
    return {
      total: Number(report.total || 0),
      passed: Number(report.passed || report.pass || 0),
      failed: Number(report.failed || report.fail || 0),
      skipped: Number(report.skipped || report.skip || 0),
      durationMs: Number(report.durationMs || report.duration_ms || 0),
    };
  }
  const readMetric = (name) => Number(text.match(new RegExp(`(?:^|\\n)\\s*(?:ℹ\\s*)?${name}\\s+(\\d+)`, "i"))?.[1] || 0);
  const total = readMetric("tests");
  const passed = readMetric("pass");
  const failed = readMetric("fail");
  const skipped = readMetric("skipped");
  const durationMs = Number(text.match(/duration_ms\s+([\d.]+)/i)?.[1] || 0);
  if (!total && !passed && !failed && !skipped) return null;
  return { total, passed, failed, skipped, durationMs };
}

function parseAgentReceipt(raw, defaults = {}) {
  const rawSummary = asText(raw).trim();
  const parsed = tryParseJson(rawSummary);
  const receipt = parsed?.receipt && typeof parsed.receipt === "object" ? parsed.receipt : parsed || {};
  const requestedStatus = String(receipt.status || defaults.status || "progress").trim().toLowerCase();
  const status = RECEIPT_STATUSES.has(requestedStatus) ? requestedStatus : "progress";
  const progress = Number.isFinite(Number(receipt.progress ?? defaults.progress))
    ? Number(receipt.progress ?? defaults.progress)
    : status === "completed"
      ? 100
      : undefined;
  return {
    status,
    progress,
    summary: String(receipt.summary || defaults.summary || rawSummary || "Agent receipt synchronized.").trim().slice(0, 2000),
    deliverables: normalizeDeliverables(receipt.deliverables || defaults.deliverables),
    rawSummary: rawSummary.slice(0, 2000),
    workspaceChanges: Array.isArray(receipt.workspaceChanges)
      ? receipt.workspaceChanges.slice(0, 100)
      : Array.isArray(defaults.workspaceChanges)
        ? defaults.workspaceChanges.slice(0, 100)
        : [],
    testReport: parseTestReport(receipt.testReport || rawSummary),
  };
}

function receiptFromExecution(execution) {
  const status = execution.status === "cancelled" ? "cancelled" : execution.status === "succeeded" ? "completed" : "failed";
  const summary =
    status === "completed"
      ? `Local execution completed: ${execution.prompt.slice(0, 120)}`
      : status === "cancelled"
        ? `Local execution cancelled: ${execution.prompt.slice(0, 120)}`
        : execution.errorOutput.slice(0, 240) || "Local execution failed. Check execution logs.";
  return parseAgentReceipt(execution.output, {
    status,
    summary,
    workspaceChanges: execution.workspaceChanges,
  });
}

function extractSessionId(raw) {
  const text = asText(raw);
  const parsed = tryParseJson(text);
  const sessionId = parsed?.sessionId || parsed?.session?.id || parsed?.conversationId;
  if (sessionId) return String(sessionId).trim();
  const match = text.match(/(?:sessionId|session ID|conversationId)\s*[:=]\s*["']?([a-zA-Z0-9._-]+)/i);
  return match?.[1] || null;
}

module.exports = { extractSessionId, parseAgentReceipt, parseTestReport, receiptFromExecution };
