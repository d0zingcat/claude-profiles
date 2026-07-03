import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findProfile } from "./config.js";
import type { ProfilesConfig } from "./types.js";

const config: ProfilesConfig = {
  version: 1,
  active: "work",
  profiles: [
    {
      name: "work",
      baseUrl: "https://work.example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      name: "personal",
      baseUrl: "https://personal.example.com",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
};

describe("findProfile", () => {
  it("按名称查找 profile", () => {
    assert.equal(findProfile(config, "work")?.baseUrl, "https://work.example.com");
  });

  it("未找到时返回 undefined", () => {
    assert.equal(findProfile(config, "missing"), undefined);
  });
});
