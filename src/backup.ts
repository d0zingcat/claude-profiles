import {
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, saveConfig } from "./config.js";
import { SWITCH_BACKUPS_DIR } from "./paths.js";
import type { ClaudeSettings, SwitchBackup } from "./types.js";

const MAX_BACKUPS = 20;

function backupPath(id: string): string {
  return join(SWITCH_BACKUPS_DIR, `${id}.json`);
}

export async function createSwitchBackup(input: {
  fromProfile?: string;
  toProfile: string;
  reason: SwitchBackup["reason"];
  settings: ClaudeSettings;
}): Promise<SwitchBackup> {
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const backup: SwitchBackup = {
    id,
    createdAt: new Date().toISOString(),
    fromProfile: input.fromProfile,
    toProfile: input.toProfile,
    reason: input.reason,
    settings: structuredClone(input.settings),
  };

  await mkdir(SWITCH_BACKUPS_DIR, { recursive: true });
  const tmp = `${backupPath(id)}.tmp`;
  await writeFile(tmp, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  await rename(tmp, backupPath(id));

  const config = await loadConfig();
  await saveConfig({ ...config, lastBackupId: id });
  await pruneOldBackups();

  return backup;
}

export async function getBackup(id: string): Promise<SwitchBackup | undefined> {
  try {
    const raw = await readFile(backupPath(id), "utf8");
    return JSON.parse(raw) as SwitchBackup;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function getLatestBackup(): Promise<SwitchBackup | undefined> {
  const config = await loadConfig();
  if (config.lastBackupId) {
    const backup = await getBackup(config.lastBackupId);
    if (backup) return backup;
  }

  const backups = await listBackups();
  return backups[0];
}

export async function listBackups(): Promise<SwitchBackup[]> {
  try {
    const files = await readdir(SWITCH_BACKUPS_DIR);
    const backups: SwitchBackup[] = [];

    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const raw = await readFile(join(SWITCH_BACKUPS_DIR, file), "utf8");
      backups.push(JSON.parse(raw) as SwitchBackup);
    }

    return backups.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function pruneOldBackups(): Promise<void> {
  const backups = await listBackups();
  const stale = backups.slice(MAX_BACKUPS);
  await Promise.all(stale.map((backup) => unlink(backupPath(backup.id))));
}
