# Agent Notes

## Project

IOB Mago is being migrated from a single legacy `index.html` script into Vite + TypeScript modules while preserving the existing UI and browser-only/local-file behavior.

Work in this repo should be incremental and low-risk:

- Keep the UI visually unchanged unless the user explicitly asks for design changes.
- Prefer extracting small typed modules from `src/main.ts`.
- Add focused Vitest coverage for every extracted module.
- Do not revert unrelated user changes or generated migration state.
- Use `apply_patch` for edits.

## Commands

Use these from the repo root:

```powershell
npm run build
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
```

`npm test` through the normal shell wrapper has been flaky in this environment, so the explicit Node/NPM command above is preferred for tests.

Latest confirmed verification:

- `npm run build` passes.
- Test suite passes: 57 test files, 179 tests.

## Migration Shape

`src/main.ts` is still the wiring/orchestration file, but much behavior has already moved into typed modules:

- PDF operations: `src/pdf/operations.ts`, `bookmarks.ts`, `copy-pages.ts`, `render.ts`, `sign.ts`
- PDF action wrappers: `merge-action.ts`, `split-action.ts`, `page-actions.ts`, `sign-action.ts`, `sign-download-action.ts`, `split-download.ts`
- Signature preparation/loading: `signature-preparation.ts`, `signature-pdf-load.ts`, `prepared-signature-generation-action.ts`
- UI helpers: `src/ui/dom.ts`, `pdf-tools.ts`, `pdf-status.ts`, signature UI modules, support, drag/drop, contract progress
- State: `source-files.ts`, `page-order.ts`, `prepared-signature.ts`, signature state/action modules
- Utils: filenames, page ranges/selection, PDF bytes, signature geometry/image/png/recolor/tone, locale, contract progress

## Current Direction

The current active improvement plan is to keep reducing `src/main.ts`.

Best next cuts:

1. Continue extracting signature PNG UI orchestration now that `signature-generation-action.ts` and `signature-recolor-action.ts` exist.
2. Continue moving UI-side status/meta formatting into `src/ui/*`.
3. Keep PDF action modules as the pattern for other workflows.
4. Later, replace CDN globals with real imports only after the module boundaries are stable.

## Style

The user is driving fast in Spanish with "sigue/dale"; give short Spanish progress updates, keep moving, and verify with build/tests after meaningful edits.
