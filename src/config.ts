import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ProfilesConfig } from "./types.js";
import { CONFIG_DIR, CONFIG_FILE } from "./paths.js";

function emptyConfig(): ProfilesConfig {
  return { version: 1, profiles: [] };
}

export async function loadConfig(): Promise<ProfilesConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as ProfilesConfig;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      throw new Error("Invalid config format");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyConfig();
    }
    throw error;
  }
}

export async function saveConfig(config: ProfilesConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  const tmp = `${CONFIG_FILE}.tmp`;
  await writeFile(tmp, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rename(tmp, CONFIG_FILE);
}

export async function upsertProfile(
  config: ProfilesConfig,
  profile: ProfilesConfig["profiles"][number],
): Promise<ProfilesConfig> {
  const index = config.profiles.findIndex((p) => p.name === profile.name);
  const next = { ...config, profiles: [...config.profiles] };
  if (index === -1) {
    next.profiles.push(profile);
  } else {
    next.profiles[index] = profile;
  }
  await saveConfig(next);
  return next;
}

export async function removeProfile(
  config: ProfilesConfig,
  name: string,
): Promise<ProfilesConfig> {
  const next: ProfilesConfig = {
    ...config,
    profiles: config.profiles.filter((p) => p.name !== name),
    active: config.active === name ? undefined : config.active,
  };
  await saveConfig(next);
  return next;
}

export async function setActiveProfile(
  config: ProfilesConfig,
  name: string | undefined,
): Promise<ProfilesConfig> {
  const next = { ...config, active: name };
  await saveConfig(next);
  return next;
}

export function findProfile(
  config: ProfilesConfig,
  name: string,
): ProfilesConfig["profiles"][number] | undefined {
  return config.profiles.find((p) => p.name === name);
}
