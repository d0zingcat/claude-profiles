import readline from "node:readline";

export const PROMPT_BACK = "__prompt_back__";

type CancellablePromise<T> = Promise<T> & { cancel?: () => void };

export function isPromptBack(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "CancelPromptError" || error.name === "ExitPromptError"
  );
}

function onEscapeKey(onEscape: () => void): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY) return () => {};

  readline.emitKeypressEvents(stdin);

  const handler = (_str: string, key: readline.Key) => {
    if (key?.name === "escape") {
      onEscape();
    }
  };

  stdin.on("keypress", handler);
  return () => {
    stdin.removeListener("keypress", handler);
  };
}

export async function withPromptBack<T>(
  run: () => CancellablePromise<T>,
): Promise<T | typeof PROMPT_BACK> {
  const prompt = run();
  const cleanup = onEscapeKey(() => {
    prompt.cancel?.();
  });

  try {
    return await prompt;
  } catch (error) {
    if (isPromptBack(error)) return PROMPT_BACK;
    throw error;
  } finally {
    cleanup();
  }
}

export function isBackValue<T>(
  value: T | typeof PROMPT_BACK,
): value is typeof PROMPT_BACK {
  return value === PROMPT_BACK;
}

export const PROMPT_HINT_BACK = "（Esc 返回上一步）";
