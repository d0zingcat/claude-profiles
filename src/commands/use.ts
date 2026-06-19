import { loadConfig } from "../config.js";
import { selectProfile } from "../prompts.js";
import { switchToProfile } from "../switch.js";

export async function useProfile(name?: string): Promise<void> {
  if (name) {
    await switchToProfile(name);
    return;
  }

  const config = await loadConfig();
  if (config.profiles.length === 0) {
    throw new Error("暂无 profile，请先使用 add 添加");
  }

  const selected = await selectProfile(
    config.profiles,
    "选择要切换的 profile",
    config.active,
  );
  await switchToProfile(selected);
}
