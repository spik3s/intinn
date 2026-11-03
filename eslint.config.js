import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/coverage/**",
      "apps/bot/src/db/migrations/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read config from apps/bot/src/env.ts",
        },
      ],
    },
  },
  {
    files: ["apps/bot/src/env.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  { files: ["**/*.{js,cjs}"], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", __dirname: "readonly" },
    },
  },
  prettier,
);
