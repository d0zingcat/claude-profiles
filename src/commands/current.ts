import { loadConfig } from "../config.js";
import {
  detectActiveProfileName,
  readClaudeSettings,
} from "../claude-settings.js";
import { CLAUDE_SETTINGS_PATH, maskSecret } from "../paths.js";

export async function showCurrent(): Promise<void> {
  const config = await loadConfig();
  const settings = await readClaudeSettings();
  const env = settings.env ?? {};

  const active =
    config.active ??
    detectActiveProfileName(config.profiles, settings);

  if (active) {
    console.log(`当前 profile: ${active}`);
  } else {
    console.log("当前未匹配到已保存的 profile");
  }

  console.log(`配置文件: ${CLAUDE_SETTINGS_PATH}`);
  if (env.ANTHROPIC_BASE_URL) {
    console.log(`  BASE URL: ${env.ANTHROPIC_BASE_URL}`);
  } else {
    console.log("  BASE URL: (未设置，使用官方默认)");
  }

  const token = env.ANTHROPIC_AUTH_TOKEN ?? env.ANTHROPIC_API_KEY;
  if (token) {
    const key = env.ANTHROPIC_AUTH_TOKEN
      ? "AUTH TOKEN"
      : "API KEY";
    console.log(`  ${key}: ${maskSecret(token)}`);
  }
}
