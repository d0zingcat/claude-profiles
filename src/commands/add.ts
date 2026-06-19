import { loadConfig, upsertProfile } from "../config.js";
import {
  envToProfile,
  readClaudeSettings,
} from "../claude-settings.js";
import { isBackValue } from "../prompt-utils.js";
import {
  promptAddMode,
  promptApplyAfterSave,
  promptBaseUrl,
  promptConfirm,
  promptModels,
  promptNewAuth,
  promptProfileName,
} from "../prompts.js";
import { switchToProfile } from "../switch.js";
import type { Profile } from "../types.js";

export interface AddOptions {
  url?: string;
  token?: string;
  apiKey?: string;
  fromCurrent?: boolean;
  apply?: boolean;
}

function isCliMode(name: string | undefined, options: AddOptions): boolean {
  if (!name) return false;
  if (options.fromCurrent) return true;
  return Boolean(options.url && (options.token || options.apiKey));
}

async function buildFromCli(
  name: string,
  options: AddOptions,
): Promise<Omit<Profile, "createdAt" | "updatedAt">> {
  if (options.fromCurrent) {
    const settings = await readClaudeSettings();
    const env = settings.env ?? {};
    if (!env.ANTHROPIC_BASE_URL) {
      throw new Error("当前 ~/.claude/settings.json 中没有 ANTHROPIC_BASE_URL");
    }
    return envToProfile(name, env);
  }

  return {
    name,
    baseUrl: options.url!,
    authToken: options.token,
    apiKey: options.apiKey,
  };
}

async function promptAddProfile(
  name: string | undefined,
  options: AddOptions,
  config: Awaited<ReturnType<typeof loadConfig>>,
): Promise<Omit<Profile, "createdAt" | "updatedAt"> | null> {
  let step = 0;
  let profileName = "";
  let mode: "manual" | "fromCurrent" = "manual";
  let baseUrl = "";
  let auth: Pick<Profile, "authToken" | "apiKey"> = {};
  let models: Profile["models"];

  while (true) {
    if (step === 0) {
      const result = await promptProfileName(
        config.profiles.map((p) => p.name),
        name,
      );
      if (isBackValue(result)) {
        console.log("已取消");
        return null;
      }
      profileName = result;
      step = 1;
      continue;
    }

    if (step === 1) {
      if (options.fromCurrent) {
        mode = "fromCurrent";
      } else {
        const result = await promptAddMode();
        if (isBackValue(result)) {
          step = 0;
          continue;
        }
        mode = result;
      }

      if (mode === "fromCurrent") {
        const settings = await readClaudeSettings();
        const env = settings.env ?? {};
        if (!env.ANTHROPIC_BASE_URL) {
          throw new Error("当前 ~/.claude/settings.json 中没有 ANTHROPIC_BASE_URL");
        }
        return envToProfile(profileName, env);
      }

      step = 2;
      continue;
    }

    if (step === 2) {
      const result = await promptBaseUrl();
      if (isBackValue(result)) {
        step = 1;
        continue;
      }
      baseUrl = result;
      step = 3;
      continue;
    }

    if (step === 3) {
      const result = await promptNewAuth();
      if (isBackValue(result)) {
        step = 2;
        continue;
      }
      auth = result;
      step = 4;
      continue;
    }

    if (step === 4) {
      const addModels = await promptConfirm("配置模型映射？", false);
      if (isBackValue(addModels)) {
        step = 3;
        continue;
      }

      if (addModels) {
        const result = await promptModels();
        if (isBackValue(result)) {
          step = 4;
          continue;
        }
        models = result;
      } else {
        models = undefined;
      }

      return {
        name: profileName,
        baseUrl,
        ...auth,
        models,
      };
    }
  }
}

export async function addProfile(
  name: string | undefined,
  options: AddOptions,
): Promise<void> {
  const config = await loadConfig();

  const draft = isCliMode(name, options)
    ? await buildFromCli(name!, options)
    : await promptAddProfile(name, options, config);

  if (!draft) return;

  const profileName = draft.name;
  const existing = config.profiles.find((p) => p.name === profileName);
  const now = new Date().toISOString();

  const profile: Profile = {
    ...draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await upsertProfile(config, profile);
  console.log(`已保存 profile: ${profileName}`);

  const cliMode = isCliMode(name, options);
  if (cliMode && options.apply === undefined) return;

  const shouldApply =
    options.apply !== undefined
      ? options.apply
      : await promptApplyAfterSave(profileName, config.active === profileName);

  if (isBackValue(shouldApply)) return;

  if (shouldApply) {
    await switchToProfile(profileName);
  }
}
