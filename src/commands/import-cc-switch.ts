import { checkbox, confirm } from "@inquirer/prompts";
import { listCcSwitchImportCandidates, ccSwitchDbExists } from "../cc-switch.js";
import { envToProfile } from "../claude-settings.js";
import { loadConfig, upsertProfile } from "../config.js";
import { switchToProfile } from "../switch.js";
import { CC_SWITCH_DB_PATH } from "../paths.js";
import type { Profile } from "../types.js";

export interface ImportCcSwitchOptions {
  db?: string;
  all?: boolean;
  overwrite?: boolean;
  applyCurrent?: boolean;
}

async function pickCandidates(
  candidates: Awaited<
    ReturnType<typeof listCcSwitchImportCandidates>
  >["importable"],
): Promise<typeof candidates> {
  if (candidates.length === 0) return [];

  const selected = await checkbox({
    message: "选择要导入的 cc-switch Claude provider",
    choices: candidates.map((item) => ({
      name: `${item.name}${item.isCurrent ? " (cc-switch 当前)" : ""} — ${item.env.ANTHROPIC_BASE_URL}`,
      value: item.id,
      checked: true,
    })),
  });

  return candidates.filter((item) => selected.includes(item.id));
}

export async function importFromCcSwitch(
  options: ImportCcSwitchOptions,
): Promise<void> {
  const dbPath = options.db ?? CC_SWITCH_DB_PATH;

  if (!(await ccSwitchDbExists(dbPath))) {
    throw new Error(`未找到 cc-switch 数据库: ${dbPath}`);
  }

  const { importable, skipped } = await listCcSwitchImportCandidates(dbPath);
  if (importable.length === 0) {
    throw new Error("cc-switch 中没有可导入的 Claude API provider");
  }

  if (skipped.length > 0) {
    console.log("以下 provider 已跳过:");
    for (const item of skipped) {
      console.log(`  - ${item.name}: ${item.reason}`);
    }
    console.log();
  }

  const selected = options.all
    ? importable
    : await pickCandidates(importable);

  if (selected.length === 0) {
    console.log("未选择任何 provider，已取消导入。");
    return;
  }

  let nextConfig = await loadConfig();
  const now = new Date().toISOString();
  let imported = 0;
  let updated = 0;
  let ignored = 0;

  for (const candidate of selected) {
    const existing = nextConfig.profiles.find((p) => p.name === candidate.name);
    if (existing && !options.overwrite) {
      console.log(`跳过已存在: ${candidate.name} (使用 --overwrite 覆盖)`);
      ignored += 1;
      continue;
    }

    const draft = envToProfile(candidate.name, candidate.env);
    const profile: Profile = {
      ...draft,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    nextConfig = await upsertProfile(nextConfig, profile);
    if (existing) {
      updated += 1;
      console.log(`已更新: ${candidate.name}`);
    } else {
      imported += 1;
      console.log(`已导入: ${candidate.name}`);
    }
  }

  console.log(
    `\n完成: 新增 ${imported}，更新 ${updated}，跳过 ${ignored}`,
  );

  const current = selected.find((item) => item.isCurrent);
  const shouldApplyCurrent = options.applyCurrent
    ? true
    : !options.all && current
      ? await confirm({
          message: `是否切换到 cc-switch 当前 provider「${current.name}」？`,
          default: true,
        })
      : false;

  if (shouldApplyCurrent && current) {
    await switchToProfile(current.name);
  }
}
