import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskSecret } from "./paths.js";

describe("maskSecret", () => {
  it("短于等于 8 位时完全掩码", () => {
    assert.equal(maskSecret("short"), "****");
    assert.equal(maskSecret("12345678"), "****");
  });

  it("长于 8 位时保留首尾各 4 位", () => {
    assert.equal(maskSecret("abcdefghijklmnop"), "abcd...mnop");
  });
});
