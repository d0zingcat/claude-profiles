import { checkbox, confirm, input, password, select, Separator } from "@inquirer/prompts";
import {
  formatBackupSummary,
} from "./format-time.js";
import { maskSecret } from "./paths.js";
import {
  PROMPT_BACK,
  PROMPT_HINT_BACK,
  isBackValue,
  withPromptBack,
} from "./prompt-utils.js";
import type { Profile, ProfileModels, SwitchBackup } from "./types.js";
import { OFFICIAL_TARGET } from "./constants.js";

type AuthType = "token" | "apiKey";
type EditAuthType = AuthType | "keep";

export async function selectUseTarget(
  profiles: Profile[],
  active?: string,
): Promise<string | typeof PROMPT_BACK> {
  return withPromptBack(() =>
    select({
      message: `选择要切换的配置 ${PROMPT_HINT_BACK}`,
      choices: [
        {
          name: "官方配置 (Official) — 清除第三方 API 端点",
          value: OFFICIAL_TARGET,
        },
        ...profiles.map((p) => ({
          name: `${p.name}${p.name === active ? " (当前)" : ""} — ${p.baseUrl}`,
          value: p.name,
        })),
        { name: "← 返回 / 取消", value: PROMPT_BACK },
      ],
    }),
  );
}

export async function selectProfile(
  profiles: Profile[],
  message: string,
  active?: string,
): Promise<string | typeof PROMPT_BACK> {
  return withPromptBack(() =>
    select({
      message: `${message} ${PROMPT_HINT_BACK}`,
      choices: [
        ...profiles.map((p) => ({
          name: `${p.name}${p.name === active ? " (当前)" : ""} — ${p.baseUrl}`,
          value: p.name,
        })),
        { name: "← 返回 / 取消", value: PROMPT_BACK },
      ],
    }),
  );
}

export async function selectBackupAction(): Promise<
  "restore" | "delete" | "skip" | typeof PROMPT_BACK
> {
  return withPromptBack(() =>
    select({
      message: `选择操作 ${PROMPT_HINT_BACK}`,
      choices: [
        { name: "还原备份", value: "restore" as const },
        { name: "删除备份", value: "delete" as const },
        { name: "仅查看，不操作", value: "skip" as const },
        { name: "← 退出", value: PROMPT_BACK },
      ],
    }),
  );
}

type CheckboxChoice<T extends string> = {
  name: string;
  value: T;
  checked?: boolean;
  description?: string;
};

export async function selectCheckboxWithBack<T extends string>(
  message: string,
  choices: CheckboxChoice<T>[],
  options?: {
    validate?: (values: T[]) => string | boolean;
    emptyMessage?: string;
  },
): Promise<T[] | typeof PROMPT_BACK> {
  const result = await withPromptBack(() =>
    checkbox({
      message: `${message}（空格多选，回车确认，Esc 返回上一步）`,
      choices: [
        { name: "← 返回上一步", value: PROMPT_BACK as T },
        new Separator(),
        ...choices,
      ],
      validate: (value) => {
        if ((value as string[]).includes(PROMPT_BACK)) return true;
        if (options?.validate) return options.validate(value as T[]);
        return value.length > 0
          ? true
          : (options?.emptyMessage ?? "请至少选择一项");
      },
    }),
  );

  if (isBackValue(result)) return PROMPT_BACK;
  if ((result as string[]).includes(PROMPT_BACK)) return PROMPT_BACK;
  return (result as T[]).filter((v) => v !== PROMPT_BACK);
}

export async function selectBackupsToDelete(
  backups: SwitchBackup[],
  latestId?: string,
): Promise<string[] | typeof PROMPT_BACK> {
  return selectCheckboxWithBack(
    "选择要删除的备份",
    backups.map((backup) => ({
      name: formatBackupSummary(backup, latestId),
      value: backup.id,
      description: backup.id,
    })),
    { emptyMessage: "请至少选择一个备份" },
  );
}

export async function selectBackup(
  backups: SwitchBackup[],
  latestId?: string,
  options?: {
    message?: string;
    allowSkip?: boolean;
    allowBack?: boolean;
    skipLabel?: string;
  },
): Promise<string | typeof PROMPT_BACK | undefined> {
  const choices = backups.map((backup) => ({
    name: formatBackupSummary(backup, latestId),
    value: backup.id,
    description: backup.id,
  }));

  if (options?.allowBack !== false) {
    choices.unshift({
      name: "← 返回上一步",
      value: PROMPT_BACK,
      description: "",
    });
  }

  if (options?.allowSkip) {
    choices.push({
      name: options.skipLabel ?? "(取消)",
      value: "",
      description: "",
    });
  }

  const selected = await withPromptBack(() =>
    select({
      message: `${options?.message ?? "选择备份"} ${options?.allowBack !== false ? PROMPT_HINT_BACK : ""}`.trim(),
      choices,
      default: latestId && backups.some((b) => b.id === latestId)
        ? latestId
        : backups[0]?.id,
    }),
  );

  if (selected === PROMPT_BACK) return PROMPT_BACK;
  return selected || undefined;
}


export async function promptProfileName(
  existingNames: string[],
  defaultName?: string,
): Promise<string | typeof PROMPT_BACK> {
  return withPromptBack(() =>
    input({
      message: `名称 ${PROMPT_HINT_BACK}`,
      default: defaultName,
      validate: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return "名称不能为空";
        if (!defaultName || trimmed !== defaultName) {
          if (existingNames.includes(trimmed)) {
            return `profile 已存在: ${trimmed}`;
          }
        }
        return true;
      },
    }).then((value) => value.trim()),
  );
}

export async function promptAddMode(): Promise<
  "manual" | "fromCurrent" | typeof PROMPT_BACK
> {
  return withPromptBack(() =>
    select({
      message: `添加方式 ${PROMPT_HINT_BACK}`,
      choices: [
        { name: "手动填写 API 端点与认证信息", value: "manual" as const },
        { name: "从当前 ~/.claude/settings.json 导入", value: "fromCurrent" as const },
      ],
    }),
  );
}

export async function promptBaseUrl(
  defaultValue?: string,
): Promise<string | typeof PROMPT_BACK> {
  return withPromptBack(() =>
    input({
      message: `API 端点 (ANTHROPIC_BASE_URL) ${PROMPT_HINT_BACK}`,
      default: defaultValue,
      validate: (value) => (value.trim() ? true : "端点 URL 不能为空"),
    }).then((value) => value.trim()),
  );
}

export async function promptNewAuth(): Promise<
  (Pick<Profile, "authToken" | "apiKey">) | typeof PROMPT_BACK
> {
  const authType = await withPromptBack(() =>
    select<AuthType>({
      message: `认证方式 ${PROMPT_HINT_BACK}`,
      choices: [
        { name: "AUTH TOKEN (ANTHROPIC_AUTH_TOKEN)", value: "token" },
        { name: "API KEY (ANTHROPIC_API_KEY)", value: "apiKey" },
      ],
    }),
  );
  if (isBackValue(authType)) return PROMPT_BACK;

  const secret = await withPromptBack(() =>
    password({
      message: `ANTHROPIC_${authType === "token" ? "AUTH_TOKEN" : "API_KEY"} ${PROMPT_HINT_BACK}`,
      mask: "*",
      validate: (value) => (value.trim() ? true : "认证信息不能为空"),
    }),
  );
  if (isBackValue(secret)) return PROMPT_BACK;

  if (authType === "token") {
    return { authToken: secret.trim(), apiKey: undefined };
  }

  return { authToken: undefined, apiKey: secret.trim() };
}

export async function promptEditAuth(
  profile: Profile,
): Promise<(Pick<Profile, "authToken" | "apiKey">) | typeof PROMPT_BACK> {
  const currentType: EditAuthType = profile.authToken
    ? "token"
    : profile.apiKey
      ? "apiKey"
      : "keep";

  const authType = await withPromptBack(() =>
    select<EditAuthType>({
      message: `认证方式 ${PROMPT_HINT_BACK}`,
      choices: [
        {
          name: profile.authToken
            ? `AUTH TOKEN (当前 ${maskSecret(profile.authToken)})`
            : "AUTH TOKEN (ANTHROPIC_AUTH_TOKEN)",
          value: "token",
        },
        {
          name: profile.apiKey
            ? `API KEY (当前 ${maskSecret(profile.apiKey)})`
            : "API KEY (ANTHROPIC_API_KEY)",
          value: "apiKey",
        },
        { name: "保持不变", value: "keep" },
      ],
      default: currentType,
    }),
  );
  if (isBackValue(authType)) return PROMPT_BACK;

  if (authType === "keep") {
    return { authToken: profile.authToken, apiKey: profile.apiKey };
  }

  const secret = await withPromptBack(() =>
    password({
      message: `ANTHROPIC_${authType === "token" ? "AUTH_TOKEN" : "API_KEY"} (留空保持不变) ${PROMPT_HINT_BACK}`,
      mask: "*",
    }),
  );
  if (isBackValue(secret)) return PROMPT_BACK;

  if (authType === "token") {
    return {
      authToken: secret.trim() || profile.authToken,
      apiKey: undefined,
    };
  }

  return {
    authToken: undefined,
    apiKey: secret.trim() || profile.apiKey,
  };
}

async function optionalInput(
  message: string,
  current?: string,
): Promise<string | typeof PROMPT_BACK | undefined> {
  const hint = current ? ` (当前: ${current}，留空保持不变)` : " (留空跳过)";
  const value = await withPromptBack(() =>
    input({
      message: `${message}${hint} ${PROMPT_HINT_BACK}`,
      default: current ?? "",
    }),
  );
  if (isBackValue(value)) return PROMPT_BACK;
  const trimmed = value.trim();
  if (!trimmed) return current;
  return trimmed;
}

export async function promptModels(
  current?: ProfileModels,
): Promise<ProfileModels | undefined | typeof PROMPT_BACK> {
  const haiku = await optionalInput("Haiku 模型", current?.haiku);
  if (isBackValue(haiku)) return PROMPT_BACK;
  const sonnet = await optionalInput("Sonnet 模型", current?.sonnet);
  if (isBackValue(sonnet)) return PROMPT_BACK;
  const opus = await optionalInput("Opus 模型", current?.opus);
  if (isBackValue(opus)) return PROMPT_BACK;
  const defaultModel = await optionalInput("默认模型", current?.default);
  if (isBackValue(defaultModel)) return PROMPT_BACK;
  const reasoning = await optionalInput("推理模型", current?.reasoning);
  if (isBackValue(reasoning)) return PROMPT_BACK;

  const models: ProfileModels = {};
  if (haiku) models.haiku = haiku;
  if (sonnet) models.sonnet = sonnet;
  if (opus) models.opus = opus;
  if (defaultModel) models.default = defaultModel;
  if (reasoning) models.reasoning = reasoning;

  return Object.keys(models).length > 0 ? models : undefined;
}

export async function promptConfirm(
  message: string,
  defaultValue = true,
): Promise<boolean | typeof PROMPT_BACK> {
  return withPromptBack(() =>
    confirm({
      message: `${message} ${PROMPT_HINT_BACK}`,
      default: defaultValue,
    }),
  );
}

export async function promptApplyAfterSave(
  profileName: string,
  isActive: boolean,
  forced?: boolean,
): Promise<boolean | typeof PROMPT_BACK> {
  if (forced) return true;
  return promptConfirm(`保存后立即切换到「${profileName}」？`, isActive);
}
