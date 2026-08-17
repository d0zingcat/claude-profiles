import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOfficialSettings,
  buildProfileSettings,
  detectActiveProfileName,
  envToProfile,
  isOfficialSettings,
  isProfileSynced,
  profileToEnv,
} from "./claude-settings.js";
import type { Profile } from "./types.js";

const profile: Profile = {
  name: "work",
  baseUrl: "https://api.example.com",
  authToken: "token-1234567890",
  models: {
    haiku: "claude-haiku",
    sonnet: "claude-sonnet",
  },
  env: {
    CUSTOM_FLAG: "1",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("profileToEnv", () => {
  it("映射 profile 字段到环境变量", () => {
    const env = profileToEnv(profile);
    assert.equal(env.ANTHROPIC_BASE_URL, "https://api.example.com");
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, "token-1234567890");
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, "claude-haiku");
    assert.equal(env.CUSTOM_FLAG, "1");
  });

  it("使用 apiKey 时清除 authToken", () => {
    const env = profileToEnv({
      ...profile,
      authToken: undefined,
      apiKey: "sk-test-key",
    });
    assert.equal(env.ANTHROPIC_API_KEY, "sk-test-key");
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined);
  });
});

describe("envToProfile", () => {
  it("从环境变量还原 profile 字段", () => {
    const parsed = envToProfile("imported", profileToEnv(profile));
    assert.equal(parsed.name, "imported");
    assert.equal(parsed.baseUrl, profile.baseUrl);
    assert.equal(parsed.authToken, profile.authToken);
    assert.deepEqual(parsed.models, profile.models);
    assert.deepEqual(parsed.env, profile.env);
  });

  it("将 ANTHROPIC_CUSTOM_MODEL_OPTION* 保留为 extra env", () => {
    const parsed = envToProfile("imported", {
      ANTHROPIC_BASE_URL: "https://api.example.com",
      ANTHROPIC_AUTH_TOKEN: "token",
      ANTHROPIC_CUSTOM_MODEL_OPTION: "deepseek-v4-pro",
      ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: "DeepSeek V4 Pro",
    });
    assert.deepEqual(parsed.env, {
      ANTHROPIC_CUSTOM_MODEL_OPTION: "deepseek-v4-pro",
      ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: "DeepSeek V4 Pro",
    });
  });
});

describe("buildProfileSettings", () => {
  it("合并 profile 环境变量并保留其他 settings 字段", () => {
    const settings = buildProfileSettings(profile, {
      theme: "dark",
      env: {
        ANTHROPIC_BASE_URL: "https://old.example.com",
        KEEP_ME: "yes",
      },
    });

    assert.equal(settings.theme, "dark");
    assert.equal(settings.env?.KEEP_ME, "yes");
    assert.equal(settings.env?.ANTHROPIC_BASE_URL, profile.baseUrl);
    assert.equal(settings.env?.ANTHROPIC_AUTH_TOKEN, profile.authToken);
  });

  it("替换 ANTHROPIC_CUSTOM_MODEL_OPTION* 并清除旧值", () => {
    const settings = buildProfileSettings(
      {
        ...profile,
        env: {
          ANTHROPIC_CUSTOM_MODEL_OPTION: "deepseek-v4-pro",
          ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: "DeepSeek V4 Pro",
        },
      },
      {
        env: {
          ANTHROPIC_CUSTOM_MODEL_OPTION: "old-model",
          ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: "Old",
          ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION: "old desc",
          KEEP_ME: "yes",
        },
      },
    );

    assert.equal(settings.env?.ANTHROPIC_CUSTOM_MODEL_OPTION, "deepseek-v4-pro");
    assert.equal(settings.env?.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME, "DeepSeek V4 Pro");
    assert.equal(settings.env?.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION, undefined);
    assert.equal(settings.env?.KEEP_ME, "yes");
  });

  it("目标 profile 没有 custom model option 时清除旧值", () => {
    const settings = buildProfileSettings(profile, {
      env: {
        ANTHROPIC_CUSTOM_MODEL_OPTION: "old-model",
        KEEP_ME: "yes",
      },
    });

    assert.equal(settings.env?.ANTHROPIC_CUSTOM_MODEL_OPTION, undefined);
    assert.equal(settings.env?.KEEP_ME, "yes");
  });
});

describe("buildOfficialSettings", () => {
  it("移除 profile 相关环境变量", () => {
    const settings = buildOfficialSettings({
      theme: "dark",
      env: {
        ANTHROPIC_BASE_URL: "https://api.example.com",
        ANTHROPIC_CUSTOM_MODEL_OPTION: "old-model",
        ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: "Old",
        KEEP_ME: "yes",
      },
    });

    assert.equal(settings.theme, "dark");
    assert.deepEqual(settings.env, { KEEP_ME: "yes" });
  });
});

describe("isOfficialSettings", () => {
  it("无 profile 环境变量时判定为官方配置", () => {
    assert.equal(isOfficialSettings({ env: { KEEP_ME: "yes" } }), true);
    assert.equal(
      isOfficialSettings({ env: { ANTHROPIC_BASE_URL: "https://api.example.com" } }),
      false,
    );
    assert.equal(
      isOfficialSettings({ env: { ANTHROPIC_CUSTOM_MODEL_OPTION: "leftover" } }),
      false,
    );
  });
});

describe("isProfileSynced", () => {
  it("检测 settings 是否与 profile 一致", () => {
    const synced = isProfileSynced(profile, {
      env: profileToEnv(profile),
    });
    assert.equal(synced, true);

    const outOfSync = isProfileSynced(profile, {
      env: {
        ...profileToEnv(profile),
        ANTHROPIC_BASE_URL: "https://other.example.com",
      },
    });
    assert.equal(outOfSync, false);
  });

  it("custom model option 残留或取值不同时判定为未同步", () => {
    const withOption: Profile = {
      ...profile,
      env: { ANTHROPIC_CUSTOM_MODEL_OPTION: "deepseek-v4-pro" },
    };

    assert.equal(
      isProfileSynced(withOption, { env: profileToEnv(withOption) }),
      true,
    );
    assert.equal(
      isProfileSynced(withOption, {
        env: {
          ...profileToEnv(withOption),
          ANTHROPIC_CUSTOM_MODEL_OPTION: "other",
        },
      }),
      false,
    );
    assert.equal(
      isProfileSynced(profile, {
        env: {
          ...profileToEnv(profile),
          ANTHROPIC_CUSTOM_MODEL_OPTION: "leftover",
        },
      }),
      false,
    );
  });
});

describe("detectActiveProfileName", () => {
  it("根据 baseUrl 与 token 匹配 profile", () => {
    const name = detectActiveProfileName([profile], {
      env: profileToEnv(profile),
    });
    assert.equal(name, "work");
  });

  it("无法匹配时返回 undefined", () => {
    const name = detectActiveProfileName([profile], { env: {} });
    assert.equal(name, undefined);
  });
});
