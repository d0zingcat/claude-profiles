import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProfilesExport,
  mergeImportedProfiles,
  parseProfilesImport,
} from "./profile-transfer.js";
import type { ProfilesConfig } from "./types.js";

const baseConfig: ProfilesConfig = {
  version: 1,
  active: "work",
  profiles: [
    {
      name: "work",
      baseUrl: "https://work.example.com",
      authToken: "sk-work",
      apiKey: "api-work",
      models: { default: "claude-sonnet" },
      env: { EXTRA_FLAG: "1" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      name: "personal",
      baseUrl: "https://personal.example.com",
      createdAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-04T00:00:00.000Z",
    },
  ],
};

describe("buildProfilesExport", () => {
  it("builds the versioned export envelope with all profiles by default", () => {
    const exported = buildProfilesExport(baseConfig, {
      exportedAt: "2026-07-04T00:00:00.000Z",
    });

    assert.equal(exported.tool, "claude-profiles");
    assert.equal(exported.schemaVersion, 1);
    assert.equal(exported.exportedAt, "2026-07-04T00:00:00.000Z");
    assert.equal(exported.active, "work");
    assert.equal(exported.profiles.length, 2);
    assert.equal(exported.profiles[0]?.authToken, "sk-work");
    assert.equal(exported.profiles[0]?.apiKey, "api-work");
  });

  it("filters to selected profile names", () => {
    const exported = buildProfilesExport(baseConfig, {
      exportedAt: "2026-07-04T00:00:00.000Z",
      profileNames: ["personal"],
    });

    assert.deepEqual(exported.profiles.map((profile) => profile.name), [
      "personal",
    ]);
    assert.equal(exported.active, undefined);
  });

  it("omits secrets when includeSecrets is false", () => {
    const exported = buildProfilesExport(baseConfig, {
      exportedAt: "2026-07-04T00:00:00.000Z",
      includeSecrets: false,
    });

    assert.equal(exported.profiles[0]?.authToken, undefined);
    assert.equal(exported.profiles[0]?.apiKey, undefined);
    assert.equal(exported.profiles[0]?.baseUrl, "https://work.example.com");
    assert.deepEqual(exported.profiles[0]?.models, {
      default: "claude-sonnet",
    });
    assert.deepEqual(exported.profiles[0]?.env, { EXTRA_FLAG: "1" });
  });
});

describe("parseProfilesImport", () => {
  it("parses the versioned export envelope", () => {
    const parsed = parseProfilesImport(
      JSON.stringify({
        tool: "claude-profiles",
        schemaVersion: 1,
        exportedAt: "2026-07-04T00:00:00.000Z",
        active: "work",
        profiles: [baseConfig.profiles[0]],
      }),
    );

    assert.equal(parsed.active, "work");
    assert.equal(parsed.profiles[0]?.name, "work");
    assert.equal(parsed.profiles[0]?.authToken, "sk-work");
  });

  it("parses a raw ProfilesConfig object", () => {
    const parsed = parseProfilesImport(JSON.stringify(baseConfig));

    assert.equal(parsed.active, "work");
    assert.equal(parsed.profiles.length, 2);
  });

  it("rejects invalid JSON", () => {
    assert.throws(
      () => parseProfilesImport("{"),
      /导入文件不是有效 JSON/,
    );
  });

  it("rejects unsupported schema versions", () => {
    assert.throws(
      () =>
        parseProfilesImport(
          JSON.stringify({
            tool: "claude-profiles",
            schemaVersion: 2,
            profiles: [],
          }),
        ),
      /不支持的导入格式版本: 2/,
    );
  });
});

describe("mergeImportedProfiles", () => {
  it("imports new profiles and skips existing profiles by default", () => {
    const result = mergeImportedProfiles(
      baseConfig,
      {
        active: "new",
        profiles: [
          {
            name: "work",
            baseUrl: "https://changed.example.com",
            createdAt: "2026-02-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
          {
            name: "new",
            baseUrl: "https://new.example.com",
            createdAt: "2026-02-02T00:00:00.000Z",
            updatedAt: "2026-02-02T00:00:00.000Z",
          },
        ],
      },
      { now: "2026-07-04T00:00:00.000Z" },
    );

    assert.equal(result.imported, 1);
    assert.equal(result.updated, 0);
    assert.deepEqual(result.skipped, ["work"]);
    assert.equal(
      result.config.profiles.find((profile) => profile.name === "work")?.baseUrl,
      "https://work.example.com",
    );
    assert.equal(
      result.config.profiles.find((profile) => profile.name === "new")?.createdAt,
      "2026-07-04T00:00:00.000Z",
    );
  });

  it("overwrites existing profiles while preserving createdAt", () => {
    const result = mergeImportedProfiles(
      baseConfig,
      {
        profiles: [
          {
            name: "work",
            baseUrl: "https://changed.example.com",
            createdAt: "2026-02-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
      {
        overwrite: true,
        now: "2026-07-04T00:00:00.000Z",
      },
    );

    const work = result.config.profiles.find((profile) => profile.name === "work");
    assert.equal(result.imported, 0);
    assert.equal(result.updated, 1);
    assert.equal(work?.baseUrl, "https://changed.example.com");
    assert.equal(work?.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(work?.updatedAt, "2026-07-04T00:00:00.000Z");
  });

  it("limits imports to selected names", () => {
    const result = mergeImportedProfiles(
      baseConfig,
      {
        profiles: [
          {
            name: "new-a",
            baseUrl: "https://a.example.com",
            createdAt: "2026-02-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
          {
            name: "new-b",
            baseUrl: "https://b.example.com",
            createdAt: "2026-02-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
      {
        selectedNames: ["new-b"],
        now: "2026-07-04T00:00:00.000Z",
      },
    );

    assert.equal(result.imported, 1);
    assert.equal(
      result.config.profiles.some((profile) => profile.name === "new-a"),
      false,
    );
    assert.equal(
      result.config.profiles.some((profile) => profile.name === "new-b"),
      true,
    );
  });
});
