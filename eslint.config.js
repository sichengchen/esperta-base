import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx", "tests/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    ignores: ["node_modules/", "dist/", "**/*.generated.ts"],
  },
];
