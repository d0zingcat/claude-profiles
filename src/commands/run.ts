import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProfileSettings, readClaudeSettings } from "../claude-settings.js";
import { findProfile, loadConfig } from "../config.js";
import { isBackValue } from "../prompt-utils.js";
import { selectProfile } from "../prompts.js";

function getPassthroughArgs(): string[] {
  const idx = process.argv.indexOf("--");
  return idx === -1 ? [] : process.argv.slice(idx + 1);
}

function runClaude(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "未找到 claude 命令，请先安装 Claude Code 并确保其在 PATH 中",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve(128 + (signal === "SIGTERM" ? 15 : 2));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

export async function runWithProfile(
  name?: string,
  claudeArgs: string[] = getPassthroughArgs(),
): Promise<void> {
  const config = await loadConfig();

  if (config.profiles.length === 0) {
    throw new Error("暂无 profile，请先使用 claude-profiles add 添加");
  }

  let profileName = name;

  if (!profileName) {
    const selected = await selectProfile(
      config.profiles,
      "选择要临时使用的 profile",
      config.active,
    );

    if (isBackValue(selected)) {
      console.log("已取消");
      return;
    }

    profileName = selected;
  }

  const profile = findProfile(config, profileName);
  if (!profile) {
    throw new Error(`未找到 profile: ${profileName}`);
  }

  const currentSettings = await readClaudeSettings();
  const sessionSettings = buildProfileSettings(profile, currentSettings);

  const tempDir = await mkdtemp(join(tmpdir(), "clp-run-"));
  const settingsPath = join(tempDir, "settings.json");

  try {
    await writeFile(
      settingsPath,
      `${JSON.stringify(sessionSettings, null, 2)}\n`,
      "utf8",
    );

    console.log(`临时使用 profile: ${profile.name}`);
    console.log(`  BASE URL: ${profile.baseUrl}`);
    console.log("  退出后 ~/.claude/settings.json 保持不变");

    const exitCode = await runClaude(["--settings", settingsPath, ...claudeArgs]);
    process.exitCode = exitCode === 0 ? undefined : exitCode;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
