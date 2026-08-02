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

`0ef3bc1` (`fix(bookmarklets): consolidate selector generation`)
