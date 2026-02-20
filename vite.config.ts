/// <reference types="vitest" />
import { relative, resolve } from "node:path";
import { readdirSync } from "node:fs";
import type { ViteUserConfig } from "vitest/config";
import inlineTS from "./vite_plugins/InlineTSPlugin.js";
import type { Plugin } from "vite";

const SOURCE_ROOT = "src/";

function findFiles(matchRegex: RegExp | RegExp[], opts?: { startDir: string; ignore?: RegExp[] }): string[] {
  const startDir = opts?.startDir ?? __dirname;
  const ignoreRE = opts?.ignore ?? [/node_modules/, /\.git/, /dist/];
  const _matchRE = Array.isArray(matchRegex) ? matchRegex : [matchRegex];
  const files = readdirSync(startDir, { withFileTypes: true, recursive: false });
  const matches: string[] = [];
  for (const file of files) {
    const filePath = resolve(startDir, file.name);
    if (ignoreRE.some((re) => re.test(filePath))) {
      continue;
    }
    if (file.isDirectory()) {
      matches.push(...findFiles(matchRegex, { ignore: ignoreRE, startDir: filePath }));
    } else {
      if (_matchRE.some((re) => re.test(file.name))) {
        console.log(`adding ${filePath}`);
        matches.push(filePath);
      }
    }
  }
  return matches;
}

const htmlFiles = findFiles(/.*\.html$/, { startDir: __dirname }).reduce<Record<string, string>>((prev, x) => {
  const key = relative(SOURCE_ROOT, x);
  // if (basename(key, ".html") === "index") {
  //   key = dirname(key);
  // }

  prev[key] = resolve(__dirname, x);
  // if (key.endsWith("/")) {
  //   prev[key.slice(0, -1)] = resolve(__dirname, x);
  // }
  return prev;
}, {});

// console.warn(htmlFiles);
function siteMapPlugin(): Plugin<void> {
  const virtualModuleId = "virtual:site-map";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  return {
    name: "my-plugin", // required, will show up in warnings and errors
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(this, id) {
      if (id === resolvedVirtualModuleId) {
        return `export const htmlFiles = ${JSON.stringify(htmlFiles)}`;
      }
    },
  };
}

export default {
  appType: "mpa",
  root: SOURCE_ROOT,
  css: {
    transformer: "postcss",
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import", "color-functions", "global-builtin", "if-function"],
      },
    },
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      input: htmlFiles,
    },
    outDir: "../dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5922,
  },
  plugins: [siteMapPlugin(), inlineTS()],
  test: {
    projects: [
      {
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
    ],
    coverage: {
      reportsDirectory: "coverage",
      include: ["**/*.{ts,js}"],
      provider: "istanbul",
      reporter: ["text", "json", "html", "cobertura"],
    },
  },
} satisfies ViteUserConfig;
