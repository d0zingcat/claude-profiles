import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".claude-profiles");
export const CONFIG_FILE = join(CONFIG_DIR, "profiles.json");
export const SWITCH_BACKUPS_DIR = join(CONFIG_DIR, "backups");
export const CLAUDE_SETTINGS_PATH = join(homedir(), ".claude", "settings.json");
export const CLAUDE_BACKUP_DIR = join(homedir(), ".claude", "backups");
export const CC_SWITCH_DB_PATH = join(homedir(), ".cc-switch", "cc-switch.db");

export function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
