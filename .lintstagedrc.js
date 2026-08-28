/**
 * lint-staged configuration.
 *
 * Agent skills live directly in .agents/skills/ (the single source, consumed
 * by dsh out of the box); there is no mirroring to maintain.
 *
 * Decision records (docs/decisions/) get a full check via the formatting
 * rule below: touching any decision file re-runs the whole verify script.
 */
export default {
  "*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml}": ["prettier --write"],
  "*.{ts,tsx}": ["eslint --fix"],
  "docs/decisions/**/*": () => ["node scripts/verify-decision-records.mjs"],
};
