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
  {
    files: ["app/**/*.{ts,tsx,js,jsx}", "components/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/context",
              importNames: ["useApp"],
              message:
                "Use focused context hooks (useAuth/useNetwork/usePreferences/useActions/etc.) instead of useApp.",
            },
          ],
        },
      ],
    },
  },
];
