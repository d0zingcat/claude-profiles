import {
  createSwitchBackup,
  deleteBackup,
  deleteBackups,
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
import {
  formatBackupSummary,
  formatLocalDateTime,
  formatRelativeTime,
  reasonLabel,
} from "../format-time.js";
import { isBackValue } from "../prompt-utils.js";
import {
  promptConfirm,
  selectBackup,
  selectBackupAction,
  selectBackupsToDelete,
} from "../prompts.js";

export interface BackupsOptions {
  list?: boolean;
  restore?: boolean;
  delete?: boolean;
}

export interface RestoreOptions {
  latest?: boolean;
}

export interface DeleteOptions {
  yes?: boolean;
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
    `${"ID".padEnd(idWidth)}  更新时间                         FROM → TO                      类型`,
  );
  console.log("-".repeat(idWidth + 72));

  for (const backup of backups) {
    const marker = backup.id === latestId ? "* " : "  ";
    const updatedAt = `${formatLocalDateTime(backup.createdAt)} (${formatRelativeTime(backup.createdAt)})`;
    const route = `${(backup.fromProfile ?? "-").padEnd(12)} → ${backup.toProfile}`;
    console.log(
      `${marker}${backup.id.padEnd(idWidth)}  ${updatedAt.padEnd(32)}  ${route.padEnd(28)}  ${reasonLabel(backup.reason)}`,
    );
  }

  if (latestId) {
    console.log(`\n最近一次备份: ${latestId}`);
    console.log("快速还原: claude-profiles undo");
    console.log("仅列出: claude-profiles backups --list");
  }
}

export async function showBackups(options: BackupsOptions = {}): Promise<void> {
  const config = await loadConfig();
  const backups = await listBackups();
  printBackups(backups, config.lastBackupId);

  if (backups.length === 0) return;
  if (options.list) return;

  if (options.restore) {
    await runRestoreFlow(backups, config.lastBackupId, false);
    return;
  }

  if (options.delete) {
    await runDeleteFlow(backups, config.lastBackupId, false);
    return;
  }

  await runBackupManageLoop(backups, config.lastBackupId);
}

export async function restoreBackup(
  id?: string,
  options: RestoreOptions = {},
): Promise<void> {
  if (id) {
    await restoreBackupById(id);
    return;
  }

  if (options.latest) {
    const backup = await getLatestBackup();
    if (!backup) {
      throw new Error("没有可还原的备份");
    }
    await restoreBackupById(backup.id);
    return;
  }

  const config = await loadConfig();
  const backups = await listBackups();
  if (backups.length === 0) {
    throw new Error("没有可还原的备份");
  }

  printBackups(backups, config.lastBackupId);
  console.log();
  await runRestoreFlow(backups, config.lastBackupId, false);
}

export async function deleteBackupById(
  id: string | undefined,
  options: DeleteOptions = {},
): Promise<void> {
  if (id) {
    const backup = await deleteBackup(id);
    console.log(`已删除备份: ${backup.id}`);
    console.log(`  ${formatBackupSummary(backup)}`);
    return;
  }

  const config = await loadConfig();
  const backups = await listBackups();
  if (backups.length === 0) {
    throw new Error("没有可删除的备份");
  }

  printBackups(backups, config.lastBackupId);
  console.log();
  await runDeleteFlow(backups, config.lastBackupId, false, options.yes);
}

async function runBackupManageLoop(
  backups: Awaited<ReturnType<typeof listBackups>>,
  latestId?: string,
): Promise<void> {
  while (true) {
    const action = await selectBackupAction();
    if (isBackValue(action)) {
      console.log("已退出");
      return;
    }
    if (action === "skip") return;

    if (action === "restore") {
      const done = await runRestoreFlow(backups, latestId, true);
      if (done) return;
      continue;
    }

    const done = await runDeleteFlow(backups, latestId, true);
    if (done) return;
  }
}

async function runRestoreFlow(
  backups: Awaited<ReturnType<typeof listBackups>>,
  latestId: string | undefined,
  allowBack: boolean,
): Promise<boolean> {
  while (true) {
    const selected = await selectBackup(backups, latestId, {
      message: "选择要还原的备份",
      allowBack,
    });

    if (isBackValue(selected)) return false;
    if (!selected) return allowBack ? false : true;

    await restoreBackupById(selected);
    return true;
  }
}

async function runDeleteFlow(
  backups: Awaited<ReturnType<typeof listBackups>>,
  latestId: string | undefined,
  allowBack: boolean,
  skipConfirm = false,
): Promise<boolean> {
  while (true) {
    const selected = await selectBackupsToDelete(backups, latestId);
    if (isBackValue(selected)) return false;

    while (true) {
      const confirmed =
        skipConfirm ||
        (await promptConfirm(
          `确认删除 ${selected.length} 个备份？此操作不可恢复`,
          false,
        ));

      if (isBackValue(confirmed)) break;

      if (!confirmed) {
        continue;
      }

      const count = await deleteBackups(selected);
      console.log(`已删除 ${count} 个备份`);
      return true;
    }
  }
}

async function restoreBackupById(id: string): Promise<void> {
  const backup = await getBackup(id);
  if (!backup) {
    throw new Error(`未找到备份: ${id}`);
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
  console.log(`  ${formatBackupSummary(backup)}`);
  if (backup.fromProfile) {
    console.log(`  恢复 profile: ${backup.fromProfile}`);
  }
}
