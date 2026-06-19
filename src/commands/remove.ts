import { loadConfig, removeProfile } from "../config.js";

export async function removeProfileByName(name: string): Promise<void> {
  const config = await loadConfig();
  const exists = config.profiles.some((p) => p.name === name);
  if (!exists) {
    throw new Error(`未找到 profile: ${name}`);
  }

  await removeProfile(config, name);
  console.log(`已删除 profile: ${name}`);
}
