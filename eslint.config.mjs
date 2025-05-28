import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintConfigPrettierFlat from "eslint-config-prettier/flat";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                ecmaVersion: 'latest',
                sourceType: 'module',
                tsconfigRootDir: import.meta.dirname,
            }
        }
    },
    {
        files: ["src/**/*.ts", "*.mjs"],
        rules: {
            "@typescript-eslint/no-unused-vars":"warn"
        }
    },
    {
        ignores: ["dist/","node_modules/", "build/", "dist/", "coverage/", "__screenshots__/"]
    },
    eslintConfigPrettierFlat
)
