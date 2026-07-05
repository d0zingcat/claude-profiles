import { writeFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { buildProfilesExport } from "../profile-transfer.js";

export interface ExportProfilesOptions {
  secrets?: boolean;
  profile?: string[];
}

async function writeOutput(file: string | undefined, content: string): Promise<void> {
  if (!file || file === "-") {
    process.stdout.write(content);
    return;
  }

  await writeFile(file, content, "utf8");
}

export async function exportProfiles(
  file: string | undefined,
  options: ExportProfilesOptions,
): Promise<void> {
  const config = await loadConfig();
  const profileNames = options.profile;
  const missing = profileNames?.filter(
    (name) => !config.profiles.some((profile) => profile.name === name),
  );

  if (missing && missing.length > 0) {
    throw new Error(`未找到 profile: ${missing.join(", ")}`);
  }

  const exported = buildProfilesExport(config, {
    includeSecrets: options.secrets ?? true,
    profileNames,
  });

  const content = `${JSON.stringify(exported, null, 2)}\n`;
  await writeOutput(file, content);

  if (file && file !== "-") {
    const secretLabel = options.secrets === false ? "不含认证信息" : "包含认证信息";
    console.log(
      `已导出 ${exported.profiles.length} 个 profile 到 ${file}（${secretLabel}）`,
    );
  }
}
