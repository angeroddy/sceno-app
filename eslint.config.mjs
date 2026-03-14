import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "__tests__/**",
    "app/**/__tests__/**",
    "components/**/__tests__/**",
    "jest.setup.ts",
    "components/advertiser-signup-form.old.tsx",
  ]),
]);

export default eslintConfig;
