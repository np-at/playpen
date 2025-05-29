/// <reference types="vitest" />
import {basename, resolve} from "node:path"
import {readdirSync} from "node:fs"
import type {ViteUserConfig} from "vitest/config";
import inlineTS from "./InlineTSPlugin.ts";
import Inspect from "vite-plugin-inspect"

function findFiles(matchRegex: RegExp | RegExp[], opts?: { startDir: string; ignore?: RegExp[] }): string[] {
    const startDir = opts?.startDir ?? __dirname;
    const ignoreRE = opts?.ignore ?? [/node_modules/, /\.git/]
    const _matchRE = Array.isArray(matchRegex) ? matchRegex : [matchRegex];
    const files = readdirSync(startDir, {withFileTypes: true, recursive: false})
    const matches: string[] = []
    for (const file of files) {
        const filePath = resolve(startDir, file.name)
        if (ignoreRE.some((re) => re.test(filePath))) {
            continue;
        }
        if (file.isDirectory()) {
            matches.push(...findFiles(matchRegex, {ignore: ignoreRE, startDir: filePath}));
        } else {
            if (_matchRE.some((re) => re.test(file.name))) {
                matches.push(filePath)
            }
        }
    }
    return matches;
}

const htmlFiles = findFiles(/.*\.html$/, {startDir: __dirname}).reduce<Record<string, string>>((prev, x) => {

    prev[basename(x, ".html")] = resolve(__dirname, x)
    return prev;
}, {});
console.warn(htmlFiles)

export default {
    appType: "mpa",
    root: "src/",
    build: {
        sourcemap: true,
        rollupOptions: {
            input: htmlFiles,

        },
        outDir: "../dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000
    },
    server: {
        port: 5922
    },
    plugins: [Inspect(), inlineTS()],
    test: {
        workspace: "./vitest.workspace.ts",
        coverage: {
            reportsDirectory: "coverage",
            include: ["**/*.{ts,js}"],
            provider: "istanbul",
            reporter: ["text", "json", "html", "cobertura"]
        }
    }
} satisfies ViteUserConfig
