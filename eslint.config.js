const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      ".expo/**",
      "node_modules/**",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];
