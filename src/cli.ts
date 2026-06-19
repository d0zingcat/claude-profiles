import { Command } from "commander";
import { addProfile } from "./commands/add.js";
import { restoreBackup, showBackups } from "./commands/backups.js";
import { showCurrent } from "./commands/current.js";
import { editProfile } from "./commands/edit.js";
import { importFromCcSwitch } from "./commands/import-cc-switch.js";
import { printProfiles } from "./commands/list.js";
import { removeProfileByName } from "./commands/remove.js";
import { useProfile } from "./commands/use.js";
import { loadConfig } from "./config.js";
import { CC_SWITCH_DB_PATH } from "./paths.js";

const program = new Command();

program
  .name("claude-profiles")
  .description("管理并切换多个 Claude API 端点配置")
  .version("0.1.0");

program
  .command("list")
  .alias("ls")
  .description("列出所有 profile")
  .action(async () => {
    const config = await loadConfig();
    printProfiles(config.profiles, config.active);
  });

program
  .command("add [name]")
  .description("添加或更新 profile（交互式，也支持命令行参数）")
  .option("--url <url>", "API 端点 URL (ANTHROPIC_BASE_URL)")
  .option("--token <token>", "认证 Token (ANTHROPIC_AUTH_TOKEN)")
  .option("--api-key <key>", "API Key (ANTHROPIC_API_KEY)")
  .option("--from-current", "从当前 ~/.claude/settings.json 导入")
  .option("--apply", "保存后立即切换到此 profile")
  .action(async (name: string | undefined, options) => {
    await addProfile(name, options);
  });

program
  .command("use [name]")
  .alias("switch")
  .description("切换到指定 profile（无参数时交互选择）")
  .action(async (name?: string) => {
    await useProfile(name);
  });

program
  .command("edit [name]")
  .description("交互式编辑 profile")
  .option("--apply", "保存后立即切换到此 profile")
  .action(async (name: string | undefined, options) => {
    await editProfile(name, options);
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("删除 profile")
  .action(async (name: string) => {
    await removeProfileByName(name);
  });

program
  .command("current")
  .description("显示当前生效的配置")
  .action(async () => {
    await showCurrent();
  });

program
  .command("backups")
  .alias("backup")
  .description("列出切换前的配置备份")
  .action(async () => {
    await showBackups();
  });

program
  .command("restore [id]")
  .alias("undo")
  .description("一键还原到切换前的配置（默认还原最近一次）")
  .action(async (id?: string) => {
    await restoreBackup(id);
  });

const importCmd = program
  .command("import")
  .description("从外部来源导入 profile");

importCmd
  .command("cc-switch")
  .description("从 cc-switch 数据库导入 Claude provider")
  .option("--db <path>", "cc-switch 数据库路径", CC_SWITCH_DB_PATH)
  .option("--all", "导入全部可导入的 provider（非交互）")
  .option("--overwrite", "覆盖同名 profile")
  .option("--apply-current", "导入后切换到 cc-switch 当前 provider")
  .action(async (options) => {
    await importFromCcSwitch(options);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`错误: ${message}`);
  process.exitCode = 1;
});
