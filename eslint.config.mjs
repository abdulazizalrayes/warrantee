import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      ".next.broken-*/**",
      ".codex-quarantine/**",
      ".vercel/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/.temp/**",
      "supabase/migrations 2/**",
      "tests/e2e 2/**",
      "**/* 2.*",
      "**/* 3.*",
      "next-env.d.ts",
    ],
  },
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Preserve the pre-migration lint contract until React Compiler adoption is scoped separately.
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-var": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
