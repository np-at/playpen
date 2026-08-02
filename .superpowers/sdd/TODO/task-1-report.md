# Task 1 report: Consolidate selector generation

## Implementation summary

- Added `findSelector(element)`, the shared selector API. It derives the query root with `getRootNode()`, returns the selector plus its `Document` or open `ShadowRoot`, and verifies `root.querySelector(selector) === element` before reporting support.
- Same-origin iframe documents and open shadow roots are supported. Closed shadow roots and other roots return structured unsupported results.
- Updated Pathify, MakeSkele, and MonitorAriaLive to use the shared API; removed Pathify's class-combination traversal, broken fallback, and obsolete ID-toggle key handler.
- Corrected XPath ID literal escaping and text/comment sibling indexing.

## Files changed

- `src/utils/finder.ts`
- `src/utils/DOMPath.ts`
- `src/_bookmarklets/Pathify.ts`
- `src/_bookmarklets/MakeSkele.ts`
- `src/_bookmarklets/MonitorAriaLive.ts`
- `src/utils/finder.test.ts` (new)
- `src/utils/DOMPath.test.ts` (new)

## TDD evidence

RED command:

```text
pnpm test src/utils/finder.test.ts src/utils/DOMPath.test.ts
```

Result: failed as expected. `findSelector` was not exported; XPath with an ID containing both quote styles was invalid; and text/comment paths were not indexed via `childNodes`.

GREEN command:

```text
pnpm test src/utils/finder.test.ts src/utils/DOMPath.test.ts
```

Result: 2 test files passed, 12 tests passed.

## Validation

```text
pnpm build && pnpm test
```

Result: TypeScript and Vite build completed successfully; 12 test files and 79 tests passed.

## Self-review

- The focused tests cover duplicate IDs, CSS-special characters, ancestor context, first/middle/last siblings, SVG, MathML, open and closed shadow roots, same-origin iframe documents, XPath mixed-quote IDs, and text/comment indexing.
- The shared API checks the generated selector against the exact root before returning it, so callers cannot accidentally receive an ancestor or cross-root selector.
- `git diff --check` completed with no whitespace errors.

## Concerns

None.

## Commit

`e325650` (`fix(bookmarklets): consolidate selector generation`)

## Review round 1 follow-up

### Changes

- Made the legacy string-only `finder()` implementation private and migrated `ShowImageAlt` to `findSelector()`.
- Added `collectSelectorRoots()` in `src/utils/finder.ts`. It discovers open shadow roots and recursively reachable same-origin iframe documents, including nested cross-window iframe trees, and records inaccessible iframe roots as `{ reason: "cross-origin-iframe", frame }` without fetching them.
- Updated Pathify and MakeSkele to use the shared root collection. They now retain each complete `SelectorResult` while operating, including its actual root; MakeSkele stores the root in every node representation.
- Updated MonitorAriaLive to retain the exact selector result in its displayed selector context, and updated ShowImageAlt navigation to query the returned root rather than the ambient document.

### TDD evidence

RED command:

```text
pnpm test src/utils/finder.test.ts
```

Result: failed as expected because `collectSelectorRoots` was not exported.

Second RED command:

```text
pnpm test src/utils/finder.test.ts
```

Result: the new nested same-origin iframe test failed because `instanceof HTMLIFrameElement` did not recognize an iframe from its parent iframe's window.

GREEN command:

```text
pnpm test src/utils/finder.test.ts
```

Result: 1 test file passed, 13 tests passed.

### Validation

```text
pnpm test src/utils/finder.test.ts src/utils/DOMPath.test.ts
pnpm build
pnpm test
```

Result: focused suite passed with 2 files and 15 tests; TypeScript and Vite build passed; full suite passed with 12 files and 82 tests.
