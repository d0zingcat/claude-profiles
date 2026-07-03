import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  formatBackupSummary,
  formatRelativeTime,
  reasonLabel,
} from "./format-time.js";
import type { SwitchBackup } from "./types.js";

const backup: SwitchBackup = {
  id: "backup-1",
  createdAt: "2026-01-01T10:00:00.000Z",
  fromProfile: "work",
  toProfile: "personal",
  reason: "switch",
  settings: {},
};

describe("formatRelativeTime", () => {
  it("未来时间显示刚刚", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T09:00:00Z") });
    assert.equal(formatRelativeTime("2026-01-01T10:00:00.000Z"), "刚刚");
    mock.timers.reset();
  });

  it("按分钟、小时、天格式化", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T10:30:00Z") });
    assert.equal(formatRelativeTime("2026-01-01T10:00:00.000Z"), "30 分钟前");
    mock.timers.reset();

    mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T14:00:00Z") });
    assert.equal(formatRelativeTime("2026-01-01T10:00:00.000Z"), "4 小时前");
    mock.timers.reset();

    mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-04T10:00:00Z") });
    assert.equal(formatRelativeTime("2026-01-01T10:00:00.000Z"), "3 天前");
    mock.timers.reset();
  });
});

describe("formatBackupSummary", () => {
  it("包含来源、目标、原因与最近标记", () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T11:00:00Z") });
    const summary = formatBackupSummary(backup, "backup-1");
    assert.match(summary, /work → personal/);
    assert.match(summary, /\[切换\]/);
    assert.match(summary, /\[最近\]/);
    mock.timers.reset();
  });
});

describe("reasonLabel", () => {
  it("映射备份原因", () => {
    assert.equal(reasonLabel("switch"), "切换");
    assert.equal(reasonLabel("restore"), "还原");
    assert.equal(reasonLabel("official"), "官方");
  });
});
