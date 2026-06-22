import { switchToOfficial } from "../switch.js";

export async function useOfficial(): Promise<void> {
  await switchToOfficial();
}
