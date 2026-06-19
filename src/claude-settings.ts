import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ClaudeSettings, Profile, ProfileModels } from "./types.js";
import { PROFILE_ENV_KEYS } from "./types.js";
import { CLAUDE_BACKUP_DIR, CLAUDE_SETTINGS_PATH } from "./paths.js";

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const raw = await readFile(CLAUDE_SETTINGS_PATH, "utf8");
    return JSON.parse(raw) as ClaudeSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeClaudeSettings(
  settings: ClaudeSettings,
  options?: { skipBackup?: boolean },
): Promise<void> {
  await mkdir(dirname(CLAUDE_SETTINGS_PATH), { recursive: true });
  if (!options?.skipBackup) {
    await backupClaudeSettings();
  }
  const tmp = `${CLAUDE_SETTINGS_PATH}.tmp`;
  await writeFile(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  await rename(tmp, CLAUDE_SETTINGS_PATH);
}

async function backupClaudeSettings(): Promise<void> {
  try {
    await mkdir(CLAUDE_BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(
      CLAUDE_SETTINGS_PATH,
      join(CLAUDE_BACKUP_DIR, `settings-${stamp}.json`),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export function profileToEnv(profile: Profile): Record<string, string> {
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: profile.baseUrl,
    ...profile.env,
  };

  if (profile.authToken) {
    env.ANTHROPIC_AUTH_TOKEN = profile.authToken;
    delete env.ANTHROPIC_API_KEY;
  } else if (profile.apiKey) {
    env.ANTHROPIC_API_KEY = profile.apiKey;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }

  const models = profile.models;
  if (models?.haiku) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = models.haiku;
  if (models?.sonnet) env.ANTHROPIC_DEFAULT_SONNET_MODEL = models.sonnet;
  if (models?.opus) env.ANTHROPIC_DEFAULT_OPUS_MODEL = models.opus;
  if (models?.default) env.ANTHROPIC_MODEL = models.default;
  if (models?.reasoning) env.ANTHROPIC_REASONING_MODEL = models.reasoning;

  return env;
}

export function envToProfile(
  name: string,
  env: Record<string, string>,
): Omit<Profile, "createdAt" | "updatedAt"> {
  const models: ProfileModels = {};
  if (env.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
    models.haiku = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  }
  if (env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
    models.sonnet = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  }
  if (env.ANTHROPIC_DEFAULT_OPUS_MODEL) {
    models.opus = env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  }
  if (env.ANTHROPIC_MODEL) models.default = env.ANTHROPIC_MODEL;
  if (env.ANTHROPIC_REASONING_MODEL) {
    models.reasoning = env.ANTHROPIC_REASONING_MODEL;
  }

  const extraEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!(PROFILE_ENV_KEYS as readonly string[]).includes(key)) {
      extraEnv[key] = value;
    }
  }

  return {
    name,
    baseUrl: env.ANTHROPIC_BASE_URL ?? "",
    authToken: env.ANTHROPIC_AUTH_TOKEN,
    apiKey: env.ANTHROPIC_API_KEY,
    models: Object.keys(models).length > 0 ? models : undefined,
    env: Object.keys(extraEnv).length > 0 ? extraEnv : undefined,
  };
}

export async function applyProfileSettings(
  profile: Profile,
  currentSettings?: ClaudeSettings,
): Promise<void> {
  const settings = currentSettings ?? (await readClaudeSettings());
  const nextEnv = { ...(settings.env ?? {}) };

  for (const key of PROFILE_ENV_KEYS) {
    delete nextEnv[key];
  }

  Object.assign(nextEnv, profileToEnv(profile));

  await writeClaudeSettings(
    {
      ...settings,
      env: nextEnv,
    },
    { skipBackup: true },
  );
}

/** @deprecated 请使用 switchToProfile */
export async function applyProfile(profile: Profile): Promise<void> {
  await applyProfileSettings(profile);
}

export function detectActiveProfileName(
  profiles: Profile[],
  settings: ClaudeSettings,
): string | undefined {
  const env = settings.env ?? {};
  const baseUrl = env.ANTHROPIC_BASE_URL;
  if (!baseUrl) return undefined;

  const token = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY;

  return profiles.find((profile) => {
    if (profile.baseUrl !== baseUrl) return false;
    const profileToken = profile.authToken ?? profile.apiKey;
    if (!profileToken && !token) return true;
    return profileToken === token;
  })?.name;
}
