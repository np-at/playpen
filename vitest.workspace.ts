import {defineWorkspace} from "vitest/config";

export default defineWorkspace([
    {
        extends: "./vite.config.ts",
        test: {
            name: "browser-tests",
            include:["**/*.test.ts"],
            environment: 'node',
            browser: {
                instances:[{browser: 'chromium'}],
                provider: 'playwright',
                enabled: true,
                headless: true,
                api:{
                    port: 12222
                },
                providerOptions: {
                    launch: {}
                }
            }
        }
    },
    {
        extends: './vite.config.ts',
        test: {
            includeTaskLocation: true,
            name: 'node-tests',
            include: ["src/**/*.spec.ts"],
            environment: 'node',
            typecheck: {
                tsconfig: 'tsconfig.json'
            }
        }
    }
])
