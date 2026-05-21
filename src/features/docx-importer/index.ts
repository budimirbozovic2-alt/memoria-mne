/**
 * Public API of the docx-importer feature.
 *
 * Outside callers must import from this barrel only — deep imports
 * (e.g. `@/features/docx-importer/docx-parser`) are blocked by ESLint
 * (`no-restricted-imports` rule in `eslint.config.js`).
 */
export { default as DocxImporter } from "./DocxImporter";
export { parseDocxInWorker } from "./docx-parser";
