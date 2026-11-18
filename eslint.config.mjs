import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    // ESLint 8 disallowed top-level return when parsing modules.
    languageOptions: { parserOptions: { ecmaFeatures: { globalReturn: false } } },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/incompatible-library": "error",
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
