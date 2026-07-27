# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A no-framework playpen of accessibility (a11y) tooling: a set of browser **bookmarklets** plus standalone **demo pages**, built with Vite in multi-page-app mode and deployed to GitHub Pages under `/playpen/`. Plain TypeScript + DOM APIs — no UI framework.

## Commands

Package manager is **pnpm** (Node 25 via `mise.toml`).

```bash
pnpm dev            # vite dev server on http://localhost:5922
pnpm build          # tsc typecheck + vite build -> dist/
pnpm bld            # vite build only (skips typecheck)
pnpm lint           # eslint (cached) over ts/html
pnpm lint:fix       # auto-fixes; note it rewrites HTML attribute spacing across src/
pnpm fmt            # prettier --write
pnpm test           # vitest run: both projects (browser + node)
pnpm exec knip      # unused files/exports/deps
```

`pnpm lint` currently exits non-zero (~35 pre-existing errors, mostly `require-meta-viewport` on demo HTML and `strictTypeChecked` findings in `src/utils/`). Don't treat a red lint as something you broke — diff against `main` first. `lint:fix` will also reformat unrelated HTML files; check `git status` after running it.

Single test / project selection (paths are relative to the repo root even though vite `root` is `src/`):

```bash
pnpm vitest run --project node-tests src/utils/diffAccName.spec.ts
pnpm vitest run --project browser-tests -t "some test name"
```

The `test:watch` script is `vitest test --watch` — `test` there is a **positional filename filter**, not a subcommand, so it only picks up files with "test" in the path (i.e. `*.test.ts`) and silently skips every `*.spec.ts`. Prefer `pnpm vitest --watch`.

Test file naming decides where a test runs (`vite.config.ts` → `test.projects`):

- `*.spec.ts` → **node-tests** project (node environment, typecheck enabled)
- `*.test.ts` → **browser-tests** project (real Chromium via `@vitest/browser-playwright`, headless; requires `pnpm exec playwright install chromium`)

`playwright.config.ts` exists for e2e against `tests/`, but that directory doesn't exist yet and its `webServer.command` (`pnpm run serve`) is not a defined script — treat Playwright as not currently wired up; use `pnpm test` (vitest).

CI (`.github/workflows/workflow.yml`) runs `pnpm test` then `vite build --base /playpen/` and deploys `dist/` to Pages on push to `main`. Note CI does **not** run lint or `tsc`. Version skew to watch: `mise.toml` pins Node 25 locally, CI uses `node-version: 20.x` — a Node-25-only API passes locally and fails the deploy.

`pnpm-workspace.yaml` holds pnpm settings only (`onlyBuiltDependencies`, `minimumReleaseAgeExclude`); there are no workspace packages.

## Architecture

### Multi-page app: HTML files are the entry points

`vite.config.ts` sets `root: "src/"` and walks the tree at config time for every `*.html`, feeding them all to `build.rollupOptions.input`. **To add a page, just drop an `index.html` + `index.ts` under `src/demos/<name>/` — no config edit needed.** The same scan is exposed to runtime code as the virtual module `virtual:site-map` (`siteMapPlugin`), which `src/main.ts` reads to render the homepage table of contents. `src/aria-api.d.ts` / `src/vite-env.d.ts` hold ambient types; `vite_plugins/InlineTS.d.ts` declares both `*?inlineTS` (default-exports a `string`) and `virtual:site-map`.

### Bookmarklets and the `?inlineTS` pipeline

`src/_bookmarklets/*.ts` are standalone scripts meant to run pasted into a `javascript:` URL on an arbitrary third-party page. They are **not** normal modules — importing one with the `?inlineTS` suffix routes it through `vite_plugins/InlineTSPlugin.ts`, which:

1. bundles it with esbuild (`iife`, tree-shaken, minified, `mangleProps: /_$/`),
2. wraps it in `(async ()=>{ ... })()`, URI-encodes it, escapes quotes,
3. emits `export default "'javascript:...'"` — a string, not executable code.

So `import x from "./foo.ts?inlineTS"` gives you a **URL string** you assign to `anchor.href`. `src/main.ts` does exactly this for every bookmarklet and renders the link list. Adding a bookmarklet means adding the file _and_ a `void import(...?inlineTS).then(x => makeLink(x.default, "Name"))` line in `main.ts`.

Consequences to keep in mind when editing `_bookmarklets/`:

- Everything the bookmarklet needs must be bundled — it runs on a page that has none of this repo's code. Keep deps small; each import inflates the URL.
- Property mangling strips names ending in `_`; avoid that suffix unless you want it mangled.
- No sourcemap is returned by the plugin on purpose (the emitted module is one string literal, so positions are meaningless).

### Shared utilities

`src/utils/` is the common layer both bookmarklets and demos pull from: `assert.ts` (throwing type-narrowing assert), `finder.ts` / `DOMPath.ts` (CSS-selector generation for an element), `pointerSelector.ts` + `PointerSelectorClass.ts` (click-to-pick-an-element overlays), `applyToShadows.ts` / `digIntoIframes.ts` (traversing shadow DOM and same-origin iframes — most a11y checks need both), `drawUtils.ts` / `makeDraggableOverlay.ts` (on-page visual overlays), `diffAccName.ts` (Levenshtein, for accessible-name vs visible-label mismatch).

A11y facts come from `aria-api` (role/name/description computation) and `axe-core` (rule runs).

### Demos

Each dir under `src/demos/` is self-contained. `acr_form` is the largest: a Monaco-backed editor for OpenACR reports — `State.ts` holds form state, `table.ts` renders the grid, `OpenACR.ts` + `openacr.schema.json` define the data shape, and Monaco workers are imported via Vite's `?worker` suffix.

## Conventions

- TypeScript is `strict` with `checkJs`, `verbatimModuleSyntax`, and `allowImportingTsExtensions` — **relative imports include the `.ts` extension** (`import { assert } from "./utils/assert.ts"`).
- ESLint runs `typescript-eslint` **strictTypeChecked** with type-aware linting on all `.ts`, plus `@html-eslint` on `.html` where the enabled rules are almost entirely a11y ones (no abstract roles, no positive tabindex, no nested interactive, require viewport…). HTML formatting rules are deliberately off.
- Prettier: 135 char width, 2 spaces, semicolons. Run `pnpm fmt` rather than hand-wrapping.
- `knip.config.ts` derives its entry points by regex-parsing `<script type="module">` and `<link rel=stylesheet>` out of every discovered HTML file (skipping commented-out ones). If knip reports a file as unused, check that the HTML reference is real and uncommented before deleting.
- Build target is `baseline-widely-available`; this is a modern-browser-only playpen, no polyfills.
