# Task 2 report: bookmarklet traversal reliability

## Requirements met

- Reused `collectSelectorRoots()` as the single synchronous traversal primitive rather than adding another recursive walker.
- Extended its snapshot contract with `visited` roots and `skipped` cross-origin iframe metadata while retaining Task 1's `supported` / `unsupported` aliases for compatibility.
- Removed the `fetch(..., { mode: "no-cors" })` fallback. `digIntoIframes()` now returns the synchronous snapshot and never attempts to fetch inaccessible frames.
- Traversal is set-backed, so each reachable document or open shadow root is visited once and cycles are safe.
- Iframe detection uses `localName` and `contentDocument`; no top-realm `instanceof Element` or `HTMLElement` check determines iframe traversal.
- `ForceFocusOutline`, `TextSpacing`, and `showHeadings` now explicitly use one-time snapshots and label skipped cross-origin frames in the console.
- `MonitorAriaLive` uses the shared snapshot on activation and re-scans/observes newly attached open roots and same-origin iframe documents (including iframe loads); inaccessible frames are recorded for its caveat.
- Added browser tests for nested same-origin iframes, an inaccessible iframe, an open shadow root, duplicate-free visits, and roots added after the first snapshot.

## Changed files

- `src/utils/finder.ts`
- `src/utils/applyToShadows.ts`
- `src/utils/digIntoIframes.ts`
- `src/utils/traversal.test.ts` (new)
- `src/_bookmarklets/ForceFocusOutline.ts`
- `src/_bookmarklets/TextSpacing.ts`
- `src/_bookmarklets/showHeadings.ts`
- `src/_bookmarklets/MonitorAriaLive.ts`

## TDD record

### RED

Command:

```sh
pnpm vitest run src/utils/traversal.test.ts
```

Outcome: 2 failing tests as expected. The old iframe helper threw `SecurityError: Denied` while reading a blocked frame before its catch block, and `applyToShadows()` returned `undefined` instead of traversal metadata.

### GREEN

Command:

```sh
pnpm vitest run src/utils/traversal.test.ts
```

Outcome: 2/2 tests passed after introducing the synchronous shared snapshot contract and migrating both helpers.

## Validation

- `pnpm lint` — passed.
- `pnpm vitest run src/utils/traversal.test.ts src/utils/finder.test.ts src/_bookmarklets/MonitorAriaLive.test.ts src/_bookmarklets/bookmarkletTestHarness.test.ts` — passed: 4 files, 27 tests.
- `pnpm test` — passed: 15 files, 88 tests. This required approved local-loopback permission because browser Vitest binds `::1:12222`.
- `pnpm build` — passed (`tsc && vite build`). Vite reported the repository's existing large-chunk advisory, but exited successfully.
- `git diff --check` — passed.

## Concerns

- Closed shadow roots are not observable by page JavaScript and therefore cannot be enumerated in skipped metadata; consumers document them as unsupported. Cross-origin iframes are explicitly represented in `skipped` metadata.

## Commit

- `b447d0f fix(bookmarklets): unify root traversal`

## Review fix round 1

### Root causes and fixes

- `MutationObserver` does not report `attachShadow()` on an already-connected host. Rather than patch page prototypes, MonitorAriaLive now explicitly labels its root scan as a snapshot and tells users to re-run it for such roots.
- The monitor generated caveat text once, so later skipped frames were not shown. It now updates both the closed panel caveat and a status mirror on its owned host whenever a new inaccessible frame is discovered.
- `isElRendered()` used top-realm `instanceof HTMLElement`, top-document `body`, and top-window `getComputedStyle`. It now detects summary elements by `localName` and uses each element's owner document and realm.
- TextSpacing used the generic `phltsbkmklt` id as toggle state. It now uses `bookmarkletLifecycle` under the namespaced `text-spacing` tool identity, so only its own styles are removed.
- The previous duplicate assertion did not create a repeatable path. The traversal tests now use a cyclic root fixture and assert that the root is returned exactly once.

### Added or updated files

- `src/_bookmarklets/MonitorAriaLive.ts`
- `src/_bookmarklets/MonitorAriaLive.test.ts`
- `src/_bookmarklets/TextSpacing.ts`
- `src/_bookmarklets/TextSpacing.test.ts` (new)
- `src/utils/isElRendered.ts`
- `src/utils/isElRendered.test.ts` (new)
- `src/utils/traversal.test.ts`

### TDD record

#### RED

```sh
pnpm vitest run src/utils/isElRendered.test.ts src/_bookmarklets/TextSpacing.test.ts src/_bookmarklets/MonitorAriaLive.test.ts src/utils/traversal.test.ts
```

Outcome: 3 expected failures: iframe-realm content under closed `details` was reported rendered; TextSpacing removed a page-owned legacy style; and MonitorAriaLive had no updated caveat status after a dynamically added blocked frame. The strengthened cycle assertion already passed because the shared traversal set guard existed.

```sh
pnpm vitest run src/utils/isElRendered.test.ts
```

Outcome: the additional no-`defaultView` regression failed with `TypeError: Cannot read properties of null (reading 'getComputedStyle')`.

#### GREEN

```sh
pnpm lint && pnpm vitest run src/utils/isElRendered.test.ts src/_bookmarklets/TextSpacing.test.ts src/_bookmarklets/MonitorAriaLive.test.ts src/utils/traversal.test.ts && pnpm build
```

Outcome: lint passed; 4 focused files / 8 tests passed; `tsc && vite build` passed. The build retained the repository's existing large-chunk advisory.

### Fix-round validation

- Full suite and final commit validation are recorded with the fix commit.
