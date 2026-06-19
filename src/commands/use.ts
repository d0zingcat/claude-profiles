import { OFFICIAL_TARGET } from "../constants.js";
import { loadConfig } from "../config.js";
import { isBackValue } from "../prompt-utils.js";
import { selectUseTarget } from "../prompts.js";
import { switchToOfficial, switchToProfile } from "../switch.js";

export async function useProfile(name?: string): Promise<void> {
  if (name === "official" || name === OFFICIAL_TARGET) {
    await switchToOfficial();
    return;
  }

  if (name) {
    await switchToProfile(name);
    return;
  }

  const config = await loadConfig();
  const selected = await selectUseTarget(config.profiles, config.active);

  if (isBackValue(selected)) {
    console.log("已取消");
    return;
  }

  if (selected === OFFICIAL_TARGET) {
    await switchToOfficial();
  } else {
    await switchToProfile(selected);
  }
}
