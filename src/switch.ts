import { findProfile, loadConfig, setActiveProfile } from "./config.js";
import {
  applyProfileSettings,
  buildOfficialSettings,
  detectActiveProfileName,
  isOfficialSettings,
  isProfileSynced,
  readClaudeSettings,
  writeClaudeSettings,
} from "./claude-settings.js";
import { createSwitchBackup } from "./backup.js";

export async function switchToOfficial(): Promise<void> {
  const config = await loadConfig();
  const currentSettings = await readClaudeSettings();

  if (isOfficialSettings(currentSettings) && !config.active) {
    console.log("当前已是 Claude 官方配置");
    return;
  }

  const fromProfile =
    config.active ?? detectActiveProfileName(config.profiles, currentSettings);

  await createSwitchBackup({
    fromProfile,
    toProfile: "(official)",
    reason: "official",
    settings: currentSettings,
  });

  await writeClaudeSettings(
    buildOfficialSettings(currentSettings),
    { skipBackup: true },
  );
  await setActiveProfile(config, undefined);

  console.log("已还原到 Claude 官方配置");
  console.log("  已清除第三方 API 端点与认证信息");
  console.log("  切换前配置已备份，可用 claude-profiles restore 一键还原");
}

export async function switchToProfile(name: string): Promise<void> {
  const config = await loadConfig();
  const profile = findProfile(config, name);
  if (!profile) {
    throw new Error(`未找到 profile: ${name}`);
  }

  const currentSettings = await readClaudeSettings();

  if (config.active === name && isProfileSynced(profile, currentSettings)) {
    console.log(`当前已是 profile: ${name}`);
    return;
  }

  const fromProfile =
    config.active ?? detectActiveProfileName(config.profiles, currentSettings);

  await createSwitchBackup({
    fromProfile,
    toProfile: name,
    reason: "switch",
    settings: currentSettings,
  });

  await applyProfileSettings(profile, currentSettings);
  await setActiveProfile(config, name);

  console.log(`已切换到 profile: ${name}`);
  console.log(`  BASE URL: ${profile.baseUrl}`);
  console.log(`  切换前配置已备份，可用 claude-profiles restore 一键还原`);
}
