import "vitest/config.d.ts";
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./vite.config.ts",
    test: {
      name: "browser-tests",
      include: ["**/*.test.ts"],

      browser: {
        instances: [{ browser: "chromium" }],
        provider: "playwright",
        enabled: true,
        headless: true,
        api: {
          port: 12222,
        },
      },
    },
  },
  {
    extends: "./vite.config.ts",
    test: {
      includeTaskLocation: true,
      name: "node-tests",
      include: ["**/*.spec.{ts,js}"],
      environment: "node",
      typecheck: {
        tsconfig: "tsconfig.json",
      },
    },
  },
]);
