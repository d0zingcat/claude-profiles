import { confirm, input, password, select } from "@inquirer/prompts";
import { maskSecret } from "./paths.js";
import type { Profile, ProfileModels } from "./types.js";

type AuthType = "token" | "apiKey";
type EditAuthType = AuthType | "keep";

export async function selectProfile(
  profiles: Profile[],
  message: string,
  active?: string,
): Promise<string> {
  return select({
    message,
    choices: profiles.map((p) => ({
      name: `${p.name}${p.name === active ? " (当前)" : ""} — ${p.baseUrl}`,
      value: p.name,
    })),
  });
}

export async function promptProfileName(
  existingNames: string[],
  defaultName?: string,
): Promise<string> {
  return input({
    message: "名称",
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
  }).then((value) => value.trim());
}

export async function promptAddMode(): Promise<"manual" | "fromCurrent"> {
  return select({
    message: "添加方式",
    choices: [
      { name: "手动填写 API 端点与认证信息", value: "manual" },
      { name: "从当前 ~/.claude/settings.json 导入", value: "fromCurrent" },
    ],
  });
}

export async function promptBaseUrl(defaultValue?: string): Promise<string> {
  return input({
    message: "API 端点 (ANTHROPIC_BASE_URL)",
    default: defaultValue,
    validate: (value) => (value.trim() ? true : "端点 URL 不能为空"),
  }).then((value) => value.trim());
}

export async function promptNewAuth(): Promise<
  Pick<Profile, "authToken" | "apiKey">
> {
  const authType = await select<AuthType>({
    message: "认证方式",
    choices: [
      { name: "AUTH TOKEN (ANTHROPIC_AUTH_TOKEN)", value: "token" },
      { name: "API KEY (ANTHROPIC_API_KEY)", value: "apiKey" },
    ],
  });

  const secret = await password({
    message:
      authType === "token"
        ? "ANTHROPIC_AUTH_TOKEN"
        : "ANTHROPIC_API_KEY",
    mask: "*",
    validate: (value) => (value.trim() ? true : "认证信息不能为空"),
  });

  if (authType === "token") {
    return { authToken: secret.trim(), apiKey: undefined };
  }

  return { authToken: undefined, apiKey: secret.trim() };
}

export async function promptEditAuth(
  profile: Profile,
): Promise<Pick<Profile, "authToken" | "apiKey">> {
  const currentType: EditAuthType = profile.authToken
    ? "token"
    : profile.apiKey
      ? "apiKey"
      : "keep";

  const authType = await select<EditAuthType>({
    message: "认证方式",
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
  });

  if (authType === "keep") {
    return { authToken: profile.authToken, apiKey: profile.apiKey };
  }

  const secret = await password({
    message:
      authType === "token"
        ? "ANTHROPIC_AUTH_TOKEN (留空保持不变)"
        : "ANTHROPIC_API_KEY (留空保持不变)",
    mask: "*",
  });

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
): Promise<string | undefined> {
  const hint = current ? ` (当前: ${current}，留空保持不变)` : " (留空跳过)";
  return input({
    message: `${message}${hint}`,
    default: current ?? "",
  }).then((value) => {
    const trimmed = value.trim();
    if (!trimmed) return current;
    return trimmed;
  });
}

export async function promptModels(
  current?: ProfileModels,
): Promise<ProfileModels | undefined> {
  const haiku = await optionalInput("Haiku 模型", current?.haiku);
  const sonnet = await optionalInput("Sonnet 模型", current?.sonnet);
  const opus = await optionalInput("Opus 模型", current?.opus);
  const defaultModel = await optionalInput("默认模型", current?.default);
  const reasoning = await optionalInput("推理模型", current?.reasoning);

  const models: ProfileModels = {};
  if (haiku) models.haiku = haiku;
  if (sonnet) models.sonnet = sonnet;
  if (opus) models.opus = opus;
  if (defaultModel) models.default = defaultModel;
  if (reasoning) models.reasoning = reasoning;

  return Object.keys(models).length > 0 ? models : undefined;
}

export async function promptApplyAfterSave(
  profileName: string,
  isActive: boolean,
  forced?: boolean,
): Promise<boolean> {
  if (forced) return true;
  return confirm({
    message: `保存后立即切换到「${profileName}」？`,
    default: isActive,
  });
}
