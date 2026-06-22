/**
 * Nomos V0.0.3 Application Integration DTO
 * 与 API 字段合同保持一致
 */

import type { ConnectionStatus, NomosId } from "../../domain/shared/types";

export interface ConnectionProfileDto {
  id: NomosId;
  templateId: "alice" | "codex-cli" | "claude-code" | "kimi" | "openclaw";
  name: string;
  scope: "local" | "remote";
  reachRef: string;
  status: ConnectionStatus;
  manageable: boolean;
  versionLabel: string | null;
  concurrencyCapacity: number;
  activeSessions: number;
  credentialState: "not_required" | "system_managed" | "missing" | "invalid";
  lastCheckAt: string | null;
  lastError: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DiscoveredConnectionDto {
  discoveryId: string;
  templateId: ConnectionProfileDto["templateId"];
  label: string;
  commandOrEndpoint: string;
  versionLabel: string | null;
  detectedAt: string;
}

export interface AdapterTemplateDto {
  id: NomosId;
  name: string;
  provider: string;
  scope: "local" | "remote";
  connectorType: string;
  dispatchMode: string;
  receiptMode: string;
  supportsDispatch: boolean;
  supportsExecution: boolean;
  configurable: boolean;
  capabilities: string[];
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
