import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROMPT_BACK,
  PROMPT_THEME,
  isBackValue,
  isPromptBack,
  withPromptBack,
} from "./prompt-utils.js";

describe("isPromptBack", () => {
  it("识别 CancelPromptError", () => {
    const error = new Error("cancelled");
    error.name = "CancelPromptError";
    assert.equal(isPromptBack(error), true);
  });

  it("识别 ExitPromptError", () => {
    const error = new Error("exit");
    error.name = "ExitPromptError";
    assert.equal(isPromptBack(error), true);
  });

  it("忽略其他错误", () => {
    assert.equal(isPromptBack(new Error("boom")), false);
    assert.equal(isPromptBack("cancelled"), false);
  });
});

describe("isBackValue", () => {
  it("识别 PROMPT_BACK", () => {
    assert.equal(isBackValue(PROMPT_BACK), true);
  });

  it("忽略普通值", () => {
    assert.equal(isBackValue("profile-a"), false);
  });
});

describe("withPromptBack", () => {
  it("正常返回提示结果", async () => {
    const result = await withPromptBack(() =>
      Promise.resolve("ok") as ReturnType<typeof Promise.resolve>,
    );
    assert.equal(result, "ok");
  });

  it("捕获 CancelPromptError 并返回 PROMPT_BACK", async () => {
    const result = await withPromptBack(() => {
      const error = new Error("cancelled");
      error.name = "CancelPromptError";
      return Promise.reject(error);
    });
    assert.equal(result, PROMPT_BACK);
  });

  it("重新抛出非取消错误", async () => {
    await assert.rejects(
      () =>
        withPromptBack(() => Promise.reject(new Error("unexpected failure"))),
      /unexpected failure/,
    );
  });
});

describe("PROMPT_THEME", () => {
  it("启用 emacs 键位以支持 Ctrl+N/P", () => {
    assert.deepEqual(PROMPT_THEME.keybindings, ["emacs"]);
  });
});
