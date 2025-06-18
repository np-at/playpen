import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettierFlat from "eslint-config-prettier/flat";
import htmlEslint from "@html-eslint/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    files: ["**/*.ts", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        ecmaVersion: "latest",
        sourceType: "module",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts", "*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/prefer-readonly": "error",

      "require-atomic-updates": "error",
    },
  },
  {
    ...htmlEslint.configs["flat/recommended"],
    files: ["**/*.html"],
  },
  {
    files: ["**/*.html"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.html"],
    rules: {
      // disable style
      "@html-eslint/indent": "off",
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/element-newline": "off",
      "@html-eslint/id-naming-convention": "off",
      "@html-eslint/max-element-depth": "off",
      "@html-eslint/no-extra-spacing-attrs": "off",
      "@html-eslint/no-multiple-empty-lines": "off",
      "@html-eslint/no-trailing-spaces": "off",
      "@html-eslint/quotes": "off",
      "@html-eslint/sort-attrs": "off",

      "@html-eslint/no-abstract-roles": "error",
      "@html-eslint/no-heading-inside-button": "error",
      "@html-eslint/no-invalid-role": "error",
      "@html-eslint/no-positive-tabindex": "error",
      "@html-eslint/no-non-scalable-viewport": "error",
      "@html-eslint/require-meta-viewport": "error",
      "@html-eslint/no-nested-interactive": "error",

      // other
      "@html-eslint/no-target-blank": "error",
      "@html-eslint/no-duplicate-attrs": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "build/", "dist/", "coverage/", "__screenshots__/"],
  },
  eslintConfigPrettierFlat,
);
