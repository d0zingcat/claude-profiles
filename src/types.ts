export interface ProfileModels {
  haiku?: string;
  sonnet?: string;
  opus?: string;
  default?: string;
  reasoning?: string;
}

export interface Profile {
  name: string;
  baseUrl: string;
  authToken?: string;
  apiKey?: string;
  models?: ProfileModels;
  /** Extra env vars merged into ~/.claude/settings.json env */
  env?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilesConfig {
  version: 1;
  active?: string;
  /** 最近一次切换前的备份 ID，供 restore 一键还原 */
  lastBackupId?: string;
  profiles: Profile[];
}

export interface SwitchBackup {
  id: string;
  createdAt: string;
  fromProfile?: string;
  toProfile: string;
  reason: "switch" | "restore";
  settings: ClaudeSettings;
}

export interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

export const PROFILE_ENV_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
] as const;
