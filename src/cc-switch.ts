import { access } from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import type { ClaudeSettings } from "./types.js";

async function openCcSwitchDb(dbPath: string): Promise<DatabaseSync> {
  const sqlite = "node:sqlite";
  const { DatabaseSync: Db } = await import(sqlite);
  return new Db(dbPath, { readOnly: true });
}

export interface CcSwitchProviderRow {
  id: string;
  name: string;
  appType: string;
  settingsConfig: string;
  isCurrent: boolean;
  sortIndex: number | null;
}

export interface CcSwitchImportCandidate {
  id: string;
  name: string;
  isCurrent: boolean;
  env: Record<string, string>;
  settings: ClaudeSettings;
}

export async function ccSwitchDbExists(dbPath: string): Promise<boolean> {
  try {
    await access(dbPath);
    return true;
  } catch {
    return false;
  }
}

export async function readCcSwitchClaudeProviders(
  dbPath: string,
): Promise<CcSwitchProviderRow[]> {
  const db = await openCcSwitchDb(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT id, name, app_type, settings_config, is_current, sort_index
         FROM providers
         WHERE app_type = 'claude'
         ORDER BY sort_index ASC, name ASC`,
      )
      .all() as Array<{
      id: string;
      name: string;
      app_type: string;
      settings_config: string;
      is_current: number;
      sort_index: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      appType: row.app_type,
      settingsConfig: row.settings_config,
      isCurrent: row.is_current === 1,
      sortIndex: row.sort_index,
    }));
  } finally {
    db.close();
  }
}

export function parseCcSwitchProvider(
  row: CcSwitchProviderRow,
): CcSwitchImportCandidate | { skipReason: string } {
  let settings: ClaudeSettings;
  try {
    settings = JSON.parse(row.settingsConfig) as ClaudeSettings;
  } catch {
    return { skipReason: "settings_config 不是合法 JSON" };
  }

  const env = settings.env ?? {};
  if (!env.ANTHROPIC_BASE_URL) {
    return { skipReason: "无 API 端点（可能是官方 OAuth 登录）" };
  }

  if (!env.ANTHROPIC_AUTH_TOKEN && !env.ANTHROPIC_API_KEY) {
    return { skipReason: "缺少认证信息" };
  }

  return {
    id: row.id,
    name: row.name,
    isCurrent: row.isCurrent,
    env,
    settings,
  };
}

export async function listCcSwitchImportCandidates(
  dbPath: string,
): Promise<{
  importable: CcSwitchImportCandidate[];
  skipped: Array<{ name: string; reason: string }>;
}> {
  const rows = await readCcSwitchClaudeProviders(dbPath);
  const importable: CcSwitchImportCandidate[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const row of rows) {
    const parsed = parseCcSwitchProvider(row);
    if ("skipReason" in parsed) {
      skipped.push({ name: row.name, reason: parsed.skipReason });
      continue;
    }
    importable.push(parsed);
  }

  return { importable, skipped };
}
