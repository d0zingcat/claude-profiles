import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  shims: true,
  external: [],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
