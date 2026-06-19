import { findProfile, loadConfig, setActiveProfile } from "./config.js";
import {
  applyProfileSettings,
  detectActiveProfileName,
  isProfileSynced,
  readClaudeSettings,
} from "./claude-settings.js";
import { createSwitchBackup } from "./backup.js";

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
