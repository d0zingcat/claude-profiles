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
