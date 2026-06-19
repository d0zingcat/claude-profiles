import { findProfile, loadConfig, saveConfig, upsertProfile } from "../config.js";
import { isBackValue } from "../prompt-utils.js";
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

  let step = name ? 1 : 0;
  let profile!: Profile;
  let newName = "";
  let baseUrl = "";
  let auth: Pick<Profile, "authToken" | "apiKey"> = {};
  let models: Profile["models"];

  while (true) {
    if (step === 0) {
      const picked = await selectProfile(
        config.profiles,
        "选择要编辑的 profile",
        config.active,
      );
      if (isBackValue(picked)) {
        console.log("已取消");
        return;
      }
      const found = findProfile(config, picked);
      if (!found) {
        throw new Error(`未找到 profile: ${picked}`);
      }
      profile = found;
      step = 1;
      continue;
    }

    if (step === 1) {
      if (!profile) {
        const found = findProfile(config, name!);
        if (!found) throw new Error(`未找到 profile: ${name}`);
        profile = found;
      }

      console.log(`\n编辑 profile: ${profile.name}\n`);

      const result = await promptProfileName(
        config.profiles.filter((p) => p.name !== profile.name).map((p) => p.name),
        profile.name,
      );
      if (isBackValue(result)) {
        if (name) {
          console.log("已取消");
          return;
        }
        step = 0;
        continue;
      }
      newName = result;
      step = 2;
      continue;
    }

    if (step === 2) {
      const result = await promptBaseUrl(profile.baseUrl);
      if (isBackValue(result)) {
        step = 1;
        continue;
      }
      baseUrl = result;
      step = 3;
      continue;
    }

    if (step === 3) {
      const result = await promptEditAuth(profile);
      if (isBackValue(result)) {
        step = 2;
        continue;
      }
      auth = result;
      step = 4;
      continue;
    }

    if (step === 4) {
      const result = await promptModels(profile.models);
      if (isBackValue(result)) {
        step = 3;
        continue;
      }
      models = result;
      step = 5;
      continue;
    }

    const shouldApply =
      options.apply !== undefined
        ? options.apply
        : await promptApplyAfterSave(newName, config.active === profile.name);

    if (isBackValue(shouldApply)) {
      step = 4;
      continue;
    }

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
    return;
  }
}
