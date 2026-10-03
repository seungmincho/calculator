import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next.js 16 exports native flat configs, including generated-output ignores.
const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  // Tool metadata can contain independent worktrees and generated bundles.
  { ignores: [".claude/**", ".agents/**", ".omx/**", ".codex/**", ".wrangler/**"] },
];

export default eslintConfig;
