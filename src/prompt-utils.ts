export const PROMPT_BACK = "__prompt_back__";

export function isPromptBack(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "CancelPromptError" || error.name === "ExitPromptError"
  );
}

export async function withPromptBack<T>(
  run: () => Promise<T>,
): Promise<T | typeof PROMPT_BACK> {
  try {
    return await run();
  } catch (error) {
    if (isPromptBack(error)) return PROMPT_BACK;
    throw error;
  }
}

export function isBackValue<T>(
  value: T | typeof PROMPT_BACK,
): value is typeof PROMPT_BACK {
  return value === PROMPT_BACK;
}

export const PROMPT_HINT_BACK = "（Esc 返回上一步）";
