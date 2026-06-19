import {
  createSwitchBackup,
  getBackup,
  getLatestBackup,
  listBackups,
} from "../backup.js";
import {
  detectActiveProfileName,
  readClaudeSettings,
  writeClaudeSettings,
} from "../claude-settings.js";
import { loadConfig, setActiveProfile } from "../config.js";

function formatTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}

export function printBackups(
  backups: Awaited<ReturnType<typeof listBackups>>,
  latestId?: string,
): void {
  if (backups.length === 0) {
    console.log("暂无切换备份。");
    return;
  }

  const idWidth = Math.max(2, ...backups.map((b) => b.id.length));
  console.log(
    `${"ID".padEnd(idWidth)}  FROM               TO                 TIME                 REASON`,
  );
  console.log("-".repeat(idWidth + 62));

  for (const backup of backups) {
    const marker = backup.id === latestId ? "* " : "  ";
    const from = (backup.fromProfile ?? "-").padEnd(18);
    const to = backup.toProfile.padEnd(18);
    const reason = backup.reason === "restore" ? "restore" : "switch";
    console.log(
      `${marker}${backup.id.padEnd(idWidth)}  ${from}  ${to}  ${formatTime(backup.createdAt)}  ${reason}`,
    );
  }

  if (latestId) {
    console.log(`\n最近一次备份: ${latestId}`);
    console.log("一键还原: claude-profiles restore");
  }
}

export async function showBackups(): Promise<void> {
  const config = await loadConfig();
  const backups = await listBackups();
  printBackups(backups, config.lastBackupId);
}

export async function restoreBackup(id?: string): Promise<void> {
  const backup = id ? await getBackup(id) : await getLatestBackup();
  if (!backup) {
    throw new Error(id ? `未找到备份: ${id}` : "没有可还原的备份");
  }

  const currentSettings = await readClaudeSettings();
  const config = await loadConfig();
  const fromProfile =
    config.active ?? detectActiveProfileName(config.profiles, currentSettings);

  await createSwitchBackup({
    fromProfile,
    toProfile: backup.fromProfile ?? "(unknown)",
    reason: "restore",
    settings: currentSettings,
  });

  await writeClaudeSettings(backup.settings, { skipBackup: true });
  await setActiveProfile(config, backup.fromProfile);

  console.log(`已还原到备份: ${backup.id}`);
  if (backup.fromProfile) {
    console.log(`  恢复 profile: ${backup.fromProfile}`);
  }
  console.log(`  备份时间: ${formatTime(backup.createdAt)}`);
}
