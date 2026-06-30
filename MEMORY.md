# Migration Memory

## What We Are Doing

We are modernizing IOB Mago without changing the visible UI. The main goal is to turn a large legacy script into a Vite + TypeScript codebase with small modules and tests.

The user wants steady progress, not long proposals. Continue extracting code and verifying.

## Current State

- Vite + TypeScript are installed.
- `index.html` now loads `src/main.ts` as a module.
- `src/main.ts` still contains orchestration, especially signature/generation flows.
- Many modules and tests already exist under `src/`.
- `MODERNIZATION_PLAN.md` contains a detailed running log.
- Latest verified suite: 75 test files, 253 tests.
- Latest verified build: `npm run build` passes.

## Recently Completed

Recent useful extractions:

- `src/pdf/merge-action.ts`
- `src/pdf/split-action.ts`
- `src/pdf/page-actions.ts`
- `src/pdf/split-download.ts`
- `src/ui/pdf-status.ts`
- `src/state/prepared-signature.ts`
- `getPreparedSignatureMetaText` in `src/ui/signature-preview.ts`
- `src/pdf/signature-generation-action.ts`
- `src/pdf/signature-recolor-action.ts`
- `src/pdf/prepared-signature-actions.ts`
- `src/state/signature-preview.ts`
- `src/state/active-signature.ts`
- `src/pdf/active-signature-action.ts`
- `src/pdf/prepared-signature-generation-action.ts`
- `src/pdf/sign-download-action.ts`
- `src/state/signature-marker-actions.ts`
- `src/state/signature-marker-click-action.ts`
- `src/state/signature-drag-action.ts`
- `src/state/signature-generation-schedule-action.ts`
- `src/ui/delete-pdf-flow.ts` — extract `eliminarPaginas` from main.ts
- `src/ui/reorder-pdf-flow.ts` — extract `ordenarPaginasPdf` from main.ts
- `src/ui/rotate-pdf-flow.ts` — extract `rotarPaginasPortrait` from main.ts
- `src/ui/order-list.ts:renderOrderPageListWithI18n` — simplify `actualizarOrderList()` in main.ts
- Replaced all CDN dependencies with real npm imports (`pdf-lib`, `pdfjs-dist`, `file-saver`, `jszip`)
- Removed CDN `<script>` tags from `index.html` and global type declarations from `src/global.d.ts`
- `src/ui/source-file-flow.ts` — extract source file orchestration (`actualizarSourceList`, `analizarSourceCards`, etc.) from main.ts into `setupSourceFileFlow()`
- `src/ui/contract-progress-flow.ts` — extract contract progress orchestration (`calcularAvance`, `autoCalcularAvance`, celebration logic, localStorage init) into `setupContractProgressFlow()`
- `vite.config.ts` — added chunk splitting (`manualChunks`) separating `pdf-lib` + `pdfjs-dist` into `pdf-vendor` chunk, reducing main app bundle from 958 kB → 172 kB

`main.ts` no longer keeps loose `preparedSignatureBlob`, `preparedSignatureFileName`, `preparedSignaturePreviewUrl`, or `preparedSignatureCanvas` variables. Those moved into `createPreparedSignatureState()`.

## Next Recommended Work

Current `main.ts` ~747 lines. Chunk splitting applied — app bundle 172 kB (gzip 54 kB).

Próximo paso si se quiere seguir mejorando:

- Evaluar migración a Vue o React como siguiente fase de la arquitectura

## Verification

After edits, run:

```powershell
npm run build
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
```

Update `MODERNIZATION_PLAN.md` whenever a new module/test is added or test counts change.
