import { confirm } from "@inquirer/prompts";
import { loadConfig, upsertProfile } from "../config.js";
import {
  envToProfile,
  readClaudeSettings,
} from "../claude-settings.js";
import {
  promptAddMode,
  promptApplyAfterSave,
  promptBaseUrl,
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
): Promise<Omit<Profile, "createdAt" | "updatedAt">> {
  const profileName = await promptProfileName(
    config.profiles.map((p) => p.name),
    name,
  );

  const mode = options.fromCurrent
    ? "fromCurrent"
    : await promptAddMode();

  if (mode === "fromCurrent") {
    const settings = await readClaudeSettings();
    const env = settings.env ?? {};
    if (!env.ANTHROPIC_BASE_URL) {
      throw new Error("当前 ~/.claude/settings.json 中没有 ANTHROPIC_BASE_URL");
    }
    return envToProfile(profileName, env);
  }

  const baseUrl = await promptBaseUrl();
  const auth = await promptNewAuth();

  const addModels = await confirm({
    message: "配置模型映射？",
    default: false,
  });
  const models = addModels ? await promptModels() : undefined;

  return {
    name: profileName,
    baseUrl,
    ...auth,
    models,
  };
}

export async function addProfile(
  name: string | undefined,
  options: AddOptions,
): Promise<void> {
  const config = await loadConfig();

  const draft = isCliMode(name, options)
    ? await buildFromCli(name!, options)
    : await promptAddProfile(name, options, config);

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
  const shouldApply =
    options.apply !== undefined
      ? options.apply
      : cliMode
        ? false
        : await promptApplyAfterSave(profileName, config.active === profileName);

  if (shouldApply) {
    await switchToProfile(profileName);
  }
}
