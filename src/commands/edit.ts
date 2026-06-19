import { findProfile, loadConfig, saveConfig, upsertProfile } from "../config.js";
import {
  promptApplyAfterSave,
  promptBaseUrl,
  promptEditAuth,
  promptModels,
  promptProfileName,
  selectProfile,
} from "../prompts.js";
import { switchToProfile } from "../switch.js";
import type { Profile } from "../types.js";

export interface EditOptions {
  apply?: boolean;
}

export async function editProfile(
  name: string | undefined,
  options: EditOptions,
): Promise<void> {
  const config = await loadConfig();
  if (config.profiles.length === 0) {
    throw new Error("暂无 profile，请先使用 add 添加");
  }

  const profileName =
    name ?? (await selectProfile(config.profiles, "选择要编辑的 profile", config.active));
  const profile = findProfile(config, profileName);
  if (!profile) {
    throw new Error(`未找到 profile: ${profileName}`);
  }

  console.log(`\n编辑 profile: ${profile.name}\n`);

  const newName = await promptProfileName(
    config.profiles.filter((p) => p.name !== profile.name).map((p) => p.name),
    profile.name,
  );

  const baseUrl = await promptBaseUrl(profile.baseUrl);
  const auth = await promptEditAuth(profile);
  const models = await promptModels(profile.models);

  const shouldApply =
    options.apply !== undefined
      ? options.apply
      : await promptApplyAfterSave(newName, config.active === profile.name);

  const now = new Date().toISOString();
  const updated: Profile = {
    ...profile,
    name: newName,
    baseUrl,
    ...auth,
    models,
    updatedAt: now,
  };

  if (newName !== profile.name) {
    await saveConfig({
      ...config,
      profiles: config.profiles
        .filter((p) => p.name !== profile.name)
        .concat(updated),
      active: config.active === profile.name ? updated.name : config.active,
    });
  } else {
    await upsertProfile(config, updated);
  }

  console.log(`\n已更新 profile: ${updated.name}`);

  if (shouldApply) {
    await switchToProfile(updated.name);
  }
}
