import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Existing app composition and legacy shared artwork; do not allow these names elsewhere.
    files: ["./src/app/providers/**", "./src/shared/assets/**"],
    rules: {
      "fsd/segments-by-purpose": "off",
    },
  },
  {
    rules: {
      "fsd/insignificant-slice": "off",
    },
  },
]);
