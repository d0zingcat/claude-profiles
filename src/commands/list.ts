import type { Profile } from "./types.js";
import { maskSecret } from "../paths.js";

export function printProfiles(
  profiles: Profile[],
  active?: string,
): void {
  if (profiles.length === 0) {
    console.log("暂无 profile，使用 `claude-profiles add <name>` 添加。");
    return;
  }

  const nameWidth = Math.max(4, ...profiles.map((p) => p.name.length));
  console.log(
    `${"NAME".padEnd(nameWidth)}  BASE URL                          TOKEN`,
  );
  console.log("-".repeat(nameWidth + 50));

  for (const profile of profiles) {
    const marker = profile.name === active ? "* " : "  ";
    const token = profile.authToken ?? profile.apiKey;
    const tokenDisplay = token ? maskSecret(token) : "-";
    console.log(
      `${marker}${profile.name.padEnd(nameWidth)}  ${profile.baseUrl.padEnd(34)}  ${tokenDisplay}`,
    );
  }

  if (active) {
    console.log(`\n当前激活: ${active}`);
  }
}
