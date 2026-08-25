import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.jsx"],
  format: ["esm"],
  external: ["react", "react-dom", "next"],
  banner: { js: '"use client";' },
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
