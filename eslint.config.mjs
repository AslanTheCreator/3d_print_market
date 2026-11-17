import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals"),
  // Next.js 15 relies on Flat Config to discover .jsx during the build.
  { files: ["**/*.jsx"] },
  {
    // ESLint 8 disallowed top-level return when parsing modules.
    languageOptions: { parserOptions: { ecmaFeatures: { globalReturn: false } } },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "jsx-a11y/control-has-associated-label": [
        "error",
        {
          controlComponents: ["IconButton"],
          ignoreElements: ["button", "input"],
          depth: 0,
        },
      ],
    },
  },
];
