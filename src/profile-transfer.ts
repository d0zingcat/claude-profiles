import type { Profile, ProfilesConfig } from "./types.js";

export interface ProfilesExport {
  tool: "claude-profiles";
  schemaVersion: 1;
  exportedAt: string;
  active?: string;
  profiles: Profile[];
}

export interface BuildProfilesExportOptions {
  exportedAt?: string;
  includeSecrets?: boolean;
  profileNames?: string[];
}

export interface ImportedProfiles {
  active?: string;
  profiles: Profile[];
}

export interface MergeImportedProfilesOptions {
  overwrite?: boolean;
  selectedNames?: string[];
  now?: string;
}

export interface MergeImportedProfilesResult {
  config: ProfilesConfig;
  imported: number;
  updated: number;
  skipped: string[];
}

function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    models: profile.models ? { ...profile.models } : undefined,
    env: profile.env ? { ...profile.env } : undefined,
  };
}

function withoutSecrets(profile: Profile): Profile {
  const clone = cloneProfile(profile);
  delete clone.authToken;
  delete clone.apiKey;
  return clone;
}

export function buildProfilesExport(
  config: ProfilesConfig,
  options: BuildProfilesExportOptions = {},
): ProfilesExport {
  const includeSecrets = options.includeSecrets ?? true;
  const selectedNames = options.profileNames
    ? new Set(options.profileNames)
    : undefined;
  const profiles = config.profiles
    .filter((profile) => !selectedNames || selectedNames.has(profile.name))
    .map((profile) => (includeSecrets ? cloneProfile(profile) : withoutSecrets(profile)));

  const active =
    config.active && profiles.some((profile) => profile.name === config.active)
      ? config.active
      : undefined;

  return {
    tool: "claude-profiles",
    schemaVersion: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    active,
    profiles,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`导入文件字段无效: ${field}`);
  }
  return value;
}

function assertOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return assertString(value, field);
}

function parseProfile(value: unknown, index: number): Profile {
  if (!isRecord(value)) {
    throw new Error(`导入文件字段无效: profiles[${index}]`);
  }

  const profile: Profile = {
    name: assertString(value.name, `profiles[${index}].name`),
    baseUrl: assertString(value.baseUrl, `profiles[${index}].baseUrl`),
    authToken: assertOptionalString(
      value.authToken,
      `profiles[${index}].authToken`,
    ),
    apiKey: assertOptionalString(value.apiKey, `profiles[${index}].apiKey`),
    createdAt:
      assertOptionalString(value.createdAt, `profiles[${index}].createdAt`) ??
      new Date(0).toISOString(),
    updatedAt:
      assertOptionalString(value.updatedAt, `profiles[${index}].updatedAt`) ??
      new Date(0).toISOString(),
  };

  if (isRecord(value.models)) {
    profile.models = {};
    for (const key of ["haiku", "sonnet", "opus", "default", "reasoning"] as const) {
      const model = value.models[key];
      if (model !== undefined) profile.models[key] = assertString(model, `profiles[${index}].models.${key}`);
    }
    if (Object.keys(profile.models).length === 0) delete profile.models;
  }

  if (isRecord(value.env)) {
    profile.env = {};
    for (const [key, envValue] of Object.entries(value.env)) {
      profile.env[key] = assertString(envValue, `profiles[${index}].env.${key}`);
    }
    if (Object.keys(profile.env).length === 0) delete profile.env;
  }

  return profile;
}

export function parseProfilesImport(raw: string): ImportedProfiles {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("导入文件不是有效 JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("导入文件必须是 JSON 对象");
  }

  if (parsed.tool === "claude-profiles") {
    if (parsed.schemaVersion !== 1) {
      throw new Error(`不支持的导入格式版本: ${String(parsed.schemaVersion)}`);
    }
    if (!Array.isArray(parsed.profiles)) {
      throw new Error("导入文件字段无效: profiles");
    }
    return {
      active: assertOptionalString(parsed.active, "active"),
      profiles: parsed.profiles.map(parseProfile),
    };
  }

  if (parsed.version === 1 && Array.isArray(parsed.profiles)) {
    return {
      active: assertOptionalString(parsed.active, "active"),
      profiles: parsed.profiles.map(parseProfile),
    };
  }

  throw new Error("导入文件不是 claude-profiles 导出格式");
}

export function mergeImportedProfiles(
  config: ProfilesConfig,
  imported: ImportedProfiles,
  options: MergeImportedProfilesOptions = {},
): MergeImportedProfilesResult {
  const selectedNames = options.selectedNames
    ? new Set(options.selectedNames)
    : undefined;
  const now = options.now ?? new Date().toISOString();
  const next: ProfilesConfig = {
    ...config,
    profiles: config.profiles.map(cloneProfile),
  };

  let importedCount = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const candidate of imported.profiles) {
    if (selectedNames && !selectedNames.has(candidate.name)) continue;

    const existingIndex = next.profiles.findIndex(
      (profile) => profile.name === candidate.name,
    );

    if (existingIndex >= 0 && !options.overwrite) {
      skipped.push(candidate.name);
      continue;
    }

    const existing = existingIndex >= 0 ? next.profiles[existingIndex] : undefined;
    const profile: Profile = {
      ...cloneProfile(candidate),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      next.profiles[existingIndex] = profile;
      updated += 1;
    } else {
      next.profiles.push(profile);
      importedCount += 1;
    }
  }

  return {
    config: next,
    imported: importedCount,
    updated,
    skipped,
  };
}
