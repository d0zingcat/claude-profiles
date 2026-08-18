import { readFile } from "node:fs/promises";
import { loadConfig, saveConfig } from "../config.js";
import { isBackValue, PROMPT_BACK } from "../prompt-utils.js";
import {
  mergeImportedProfiles,
  parseProfilesImport,
} from "../profile-transfer.js";
import { selectCheckboxWithBack } from "../prompts.js";
import { switchToProfile } from "../switch.js";

export interface ImportProfilesOptions {
  all?: boolean;
  overwrite?: boolean;
  apply?: string;
}

function isStdinSource(file: string | undefined): file is undefined | "-" {
  return !file || file === "-";
}

async function readInput(file: string | undefined): Promise<string> {
  if (isStdinSource(file)) {
    return new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk: string) => {
        data += chunk;
      });
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
  }

  return readFile(file, "utf8");
}

async function pickProfileNames(
  names: string[],
): Promise<string[] | typeof PROMPT_BACK> {
  return selectCheckboxWithBack(
    "选择要导入的 profile",
    names.map((name) => ({
      name,
      value: name,
      checked: true,
    })),
    { emptyMessage: "请至少选择一个 profile" },
  );
}

export async function importProfiles(
  file: string | undefined,
  options: ImportProfilesOptions,
): Promise<void> {
  const raw = await readInput(file);
  const imported = parseProfilesImport(raw);

  if (imported.profiles.length === 0) {
    console.log("导入文件中没有 profile。");
    return;
  }

  const selectedNames =
    options.all || isStdinSource(file)
      ? imported.profiles.map((profile) => profile.name)
      : await pickProfileNames(imported.profiles.map((profile) => profile.name));

  if (isBackValue(selectedNames)) {
    console.log("已取消");
    return;
  }

  if (options.apply) {
    const canApply = imported.profiles.some(
      (profile) => profile.name === options.apply,
    );
    if (!canApply) {
      throw new Error(`无法切换，未找到 profile: ${options.apply}`);
    }
  }

  const config = await loadConfig();
  const result = mergeImportedProfiles(config, imported, {
    overwrite: options.overwrite,
    selectedNames,
  });

  await saveConfig(result.config);

  for (const name of result.skipped) {
    console.log(`跳过已存在: ${name} (使用 --overwrite 覆盖)`);
  }

  console.log(
    `完成: 新增 ${result.imported}，更新 ${result.updated}，跳过 ${result.skipped.length}`,
  );

  if (options.apply) {
    await switchToProfile(options.apply);
  }
}
