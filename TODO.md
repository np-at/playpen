# Bookmarklet Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Check off items only after their acceptance checks pass.

**Goal:** Correct the bookmarklet review findings without duplicating lifecycle, selector, traversal, or overlay fixes in
individual bookmarklets.

**Architecture:** Work from shared foundations outward. First establish browser-level regression coverage and repair the
utilities that own teardown, overlays, selectors, traversal, and rendered-state logic. Then update related bookmarklet groups,
followed by the larger standalone tools and build-size safeguards.

**Tech stack:** TypeScript, DOM APIs, Vitest browser tests with Playwright, Vite, esbuild.

## Global constraints

- Bookmarklets run on arbitrary third-party pages and must not assume ownership of page IDs, classes, globals, inline styles,
  event-handler properties, hash/history, focus, or scroll position.
- Every persistent bookmarklet must support idempotent activation and complete teardown when run again or closed.
- Teardown must remove listeners, observers, timers, animation frames, injected DOM/styles/classes, and reversible page edits.
- Shared fixes belong in `src/utils/`; do not reproduce traversal, selector, overlay, or lifecycle code in bookmarklet entries.
- Open shadow roots and same-origin iframes must either work or be reported as explicitly unsupported.
- Cross-origin iframes and closed shadow roots must be skipped without attempting an unreadable `no-cors` fetch.
- Keep generated bookmarklet URLs small; imported dependencies are bundled into the URL.

---

## P0 — Regression harness and shared lifecycle

These tasks establish the contracts required by all later work.

### Browser-level bookmarklet regression coverage

**Files:** `vite.config.ts`, new tests under `src/_bookmarklets/` or `src/utils/`

- [ ] Add a browser-test helper that can execute a bookmarklet entry against a fixture document and return its injected nodes,
  listeners/state handles, and console output.
- [ ] Add a repeated-run test contract: activate, activate again or close, then assert that no tool-owned nodes, styles, timers,
  observers, or page-intercepting listeners remain.
- [ ] Add fixtures for a scrolled document, duplicate page IDs/classes, open shadow roots, same-origin iframes, and inaccessible
  cross-origin iframe stubs.
- [ ] Add tests proving tools do not change the page's original focus, scroll position, URL/hash/history, or inline styles after
  teardown unless the tool explicitly documents an intervention.
- [ ] Run `pnpm test` and confirm the new tests fail for the currently known lifecycle and coordinate defects before fixing them.

### Shared lifecycle ownership

**Files:** new `src/utils/bookmarkletLifecycle.ts`; migrate consumers in later tasks

- [ ] Introduce a namespaced lifecycle abstraction backed by `AbortController` that owns event listeners and provides cleanup
  registration for observers, timeouts, animation frames, injected nodes/styles/classes, and reversible attribute edits.
- [ ] Define a collision-resistant tool identity convention (for example, `data-a11y-playpen-tool="<tool-name>"`) and stop using
  generic IDs such as `a11y-bookmarklet`, `rootSvg`, `infoPanel`, `bounding-rect`, and `segment-rect` as ownership markers.
- [ ] Make activation idempotent: activating a running tool dispatches its registered teardown rather than creating a second
  instance.
- [ ] Add tests proving cleanup is safe when page-owned nodes happen to use the same legacy IDs or classes.
- [ ] Run `pnpm test`, `pnpm lint`, and `pnpm build`.

---

## P1 — Shared pointer, overlay, and dragging utilities

### Repair pointer selection lifecycle

**Files:** `src/utils/PointerSelectorClass.ts`; consumers `AxifyTargeted.ts`, `HoverTest.ts`,
`IdentifyExplicitNames.ts`

- [x] Add an explicit `destroy()` operation that removes the document listener and overlay listeners, clears the debounce timer,
  removes the overlay, and prevents delayed callbacks from reattaching it.
- [x] Stop assigning the instance to the generic `window.PointerSelector` property; keep ownership in the lifecycle registry.
- [x] Replace synthetic `mouseover` dispatch into the inspected page with capture-phase pointer tracking that does not trigger page
  behavior.
- [x] Accept `Element`, rather than claiming every selected SVG/MathML element is an `HTMLElement`.
- [x] Add keyboard cancellation with Escape and tests for selection, cancellation, repeated activation, pending debounce cleanup,
  SVG targets, and page mouseover handlers.
- [x] Remove the entirely commented-out legacy `src/utils/pointerSelector.ts` after verifying it has no consumers.

### Correct overlay geometry and ownership

**Files:** `src/utils/drawUtils.ts`; consumers `ShowImageAlt.ts`, `dupeIdCheck.ts`, `fcs.ts`

- [x] Pick one coordinate system: use `position: fixed` with `getBoundingClientRect()` or add `scrollX`/`scrollY` for absolute
  overlays. Apply it consistently to boxes and labels.
- [x] Scope cleanup through the lifecycle/tool marker instead of deleting all page elements matching `.bounding-rect`,
  `.segment-rect`, or a caller-provided ID.
- [x] Inject one namespaced stylesheet per active tool and remove it during teardown instead of appending global rules repeatedly.
- [x] Add redraw support for scroll, resize, and target geometry changes without leaking listeners.
- [x] Add tests at non-zero horizontal and vertical scroll offsets and tests protecting page-owned matching classes.

### Make draggable overlays non-destructive

**Files:** `src/utils/makeDraggableOverlay.ts`; consumer `ShowImageAlt.ts`

- [x] Replace assignments to `document.onmousemove` and `document.onmouseup` with abortable pointer events and pointer capture.
- [x] Do not begin dragging from interactive descendants; add a dedicated drag handle.
- [x] Resolve the conflicting `left`/`right` positioning after the first drag and keep the panel within the viewport.
- [x] Support pointer cancellation and teardown while dragging.
- [x] Add tests proving existing page-level mouse/pointer handlers remain installed and panel buttons remain operable.

---

## P1 — Shared selectors and DOM traversal

### Consolidate selector generation

**Files:** `src/utils/finder.ts`, `src/utils/DOMPath.ts`, `src/_bookmarklets/Pathify.ts`,
`src/_bookmarklets/MakeSkele.ts`, `src/_bookmarklets/MonitorAriaLive.ts`

- [x] Define one supported selector API that derives its query root from `input.getRootNode()` and returns both the selector and
  its document/shadow-root context.
- [x] Verify every generated selector by asserting that querying the same root returns exactly the input element.
- [x] Support same-origin iframe documents and open shadow roots, or return an explicit structured unsupported result.
- [x] In `DOMPath.xPath`, escape IDs containing quotes and index text/comment nodes through `childNodes`, not `children`.
- [x] Remove Pathify's `findShortestUniqueClassCombination()` and broken fallback: it can return an ancestor selector and computes
  `:nth-of-type()` one position too high.
- [x] Add tests for duplicate IDs, CSS-special characters, unique ancestor classes, first/middle/last siblings, SVG/MathML,
  shadow-root targets, iframe targets, and XPath IDs containing both quote styles.

### Repair document/shadow/iframe traversal

**Files:** `src/utils/applyToShadows.ts`, `src/utils/digIntoIframes.ts`; consumers `ForceFocusOutline.ts`,
`TextSpacing.ts`, `showHeadings.ts`, `MonitorAriaLive.ts`

- [ ] Replace the unreadable asynchronous `fetch(..., {mode: "no-cors"})` fallback with a synchronous traversal result that
  records skipped cross-origin frames.
- [ ] Prevent duplicate visits and recursion cycles; return visited documents/roots and skipped-root metadata.
- [ ] Decide how consumers handle frames or shadow roots added after activation: observe them or explicitly label the scan as a
  snapshot.
- [ ] Avoid top-realm `instanceof Element`/`HTMLElement` checks for iframe nodes; use `nodeType`, `ownerDocument.defaultView`, or
  constructors from the node's realm.
- [ ] Add nested same-origin iframe, cross-origin iframe, open shadow-root, and dynamically added root tests.

### Correct rendered-state detection

**Files:** `src/utils/isElRendered.ts`, `src/utils/ariaLive.ts`; consumers `FocusStyleCheck.ts`,
`MonitorAriaLive.ts`, `showHeadings.ts`

- [ ] Change the `<details>/<summary>` containment check to use the `compareDocumentPosition()` bitmask.
- [ ] Walk through shadow hosts and use `el.ownerDocument.defaultView?.getComputedStyle(el)` for iframe elements.
- [ ] Define and test whether "rendered" includes `visibility: hidden`, `content-visibility`, `aria-hidden`, disconnected nodes,
  and hidden ancestors; keep visual rendering and AT-hidden checks separate where needed.
- [ ] Add tests for closed details, descendants of the first summary, hidden shadow hosts, iframe elements, and `aria-hidden`
  ancestors.

### Make assertions portable

**Files:** `src/utils/assert.ts`

- [ ] Guard the V8-only `Error.captureStackTrace` call so assertions preserve their intended error on Firefox and Safari.
- [ ] Add a browser test that temporarily removes `Error.captureStackTrace`.

---

## P1 — Focus inspection tools

### Rebuild FocusStyleCheck around actual focus

**Files:** `src/_bookmarklets/FocusStyleCheck.ts`; shared lifecycle/rendering utilities

- [ ] Replace fragment navigation and `location.assign()` with `el.focus({preventScroll: true})`.
- [ ] Wait for an animation frame, verify `document.activeElement === el`, and only then collect focused styles.
- [ ] Preserve and restore the original active element, scroll position, URL/hash/history, and any temporary attributes.
- [ ] Do not add permanent IDs to tested elements.
- [ ] Replace the incomplete selector with tested focusability logic covering native controls, links, summary, editable content,
  media controls, and programmatically focusable elements while excluding disabled/inert/hidden candidates.
- [ ] Distinguish "could not focus" from "focused but no visible style difference" in output.
- [ ] Add tests for `:focus`, `:focus-visible`, pseudo-element focus styles, programmatic-only targets, and no page-state changes.

### Repair the focus trace tool (`fcs`)

**Files:** `src/_bookmarklets/fcs.ts`, `src/utils/drawUtils.ts`

- [ ] Migrate focus, scroll, and resize listeners plus injected CSS/SVG to shared lifecycle teardown.
- [ ] Record focus coordinates when either `top` or `left` is zero.
- [ ] Namespace the root SVG and actually clear it when resetting the trace.
- [ ] Use the valid SVG `fill` attribute and `Math.atan2(dY, dX)` for arrow direction.
- [ ] Size/position the trace layer consistently across the full scrolled document.
- [ ] Add toggle, viewport-edge, scroll, and repeated-run tests.

### Consolidate focus-outline and text-spacing style toggles

**Files:** `src/_bookmarklets/ForceFocusOutline.ts`, `src/_bookmarklets/TextSpacing.ts`,
`src/utils/applyToShadows.ts`

- [ ] Use shared namespaced style injection and teardown rather than duplicate recursive helpers.
- [ ] Handle documents without a normal `<head>`.
- [ ] Apply to newly discovered open shadows/same-origin frames or state clearly that activation is a snapshot.
- [ ] Ensure partial remnants in a frame/shadow root are removed even when the top-document style is missing.
- [ ] Add repeated-toggle and dynamically added root tests.

---

## P1 — Element naming and image inspection

### Correct IdentifyExplicitNames

**Files:** `src/_bookmarklets/IdentifyExplicitNames.ts`, `src/utils/PointerSelectorClass.ts`

- [ ] Include the selected target itself when it has `aria-label`.
- [ ] Add a target to the `aria-labelledby` group only when the valid attribute exists; remove the unconditional and duplicate
  additions.
- [ ] Report misspelled `aria-labeledby` as invalid markup rather than treating it as a naming mechanism.
- [ ] Resolve native labels with `HTMLLabelElement.control`/`HTMLElement.labels` so labels outside the selected subtree are found.
- [ ] Separate valid native labelable elements from ARIA roles that a `<label>` cannot label.
- [ ] Replace multi-argument `console.dir()` calls with a structured object or `console.table()`.
- [ ] Add tests for target-level attributes, multiple external labels, implicit labels, broken `for`, invalid spelling, and SVG
  selection.

### Correct image checks

**Files:** `src/_bookmarklets/ImageCheck.ts`, `src/_bookmarklets/ShowImageAlt.ts`,
`src/utils/makeDraggableOverlay.ts`, `src/utils/drawUtils.ts`

- [ ] In ImageCheck, distinguish missing `alt` from valid decorative `alt=""`; make suspicious-text heuristics
  case-insensitive warnings rather than hard failures.
- [ ] Include a root image when the scan root itself matches instead of scanning descendants only.
- [ ] In ShowImageAlt, append each result `<li>` to the existing `<ul>` rather than re-appending the list to its container.
- [ ] Classify native `<img>` separately from SVG and `[role="img"]`; do not call a non-image element's missing `alt` an error.
- [ ] For SVG/ARIA images, report accessible-name state and its source instead of applying HTML `alt` rules.
- [ ] Correctly handle combinations such as `alt=""` plus an explicit ARIA name/role.
- [ ] Migrate the resize listener, display panel, scrims, and boxes to shared lifecycle teardown.
- [ ] Add semantic-state, scrolling, resize, result-list, close, and repeated-run tests.

---

## P2 — Duplicate ID tools

### Replace FindDuplicateIds' destructive scan

**Files:** `src/_bookmarklets/FindDuplicateIds.ts`, shared overlay/traversal utilities

- [ ] Replace the O(n²) repeated filtering with a single `Map<string, Element[]>` pass.
- [ ] Stop overwriting element border/outline inline styles; use removable overlays.
- [ ] Include open shadow roots and same-origin iframe results with root context, or label the result scope.
- [ ] Add teardown and tests proving original inline styles remain unchanged.

### Harden the DupeId panel

**Files:** `src/_bookmarklets/dupeIdCheck.ts`, shared lifecycle/overlay utilities

- [ ] Replace the generic `a11y-bookmarklet` ID and validate any reused panel by tool ownership and element type.
- [ ] Use a class/data marker for multiple highlight boxes instead of assigning the same ID to every overlay.
- [ ] Exclude tool-owned UI from duplicate detection without excluding page elements that merely share a legacy ID.
- [ ] Make result activation work on focus and click, not mouseover alone.
- [ ] Add tests for page-owned `a11y-bookmarklet`, duplicate tool IDs, keyboard use, no-results state, and cleanup.

---

## P2 — Heading inspection

### Repair ShowHeadings ordering, frame support, and teardown

**Files:** `src/_bookmarklets/showHeadings.ts`, shared lifecycle/traversal/rendering utilities

- [ ] Tear down old resize and hover listeners before replacing an existing panel.
- [ ] Prevent result-link clicks from navigating the inspected page's top-level fragment.
- [ ] Preserve document/composed order instead of appending all light-DOM, then shadow, then iframe headings.
- [ ] Compute visibility using each heading's document/window and account for AT-hidden ancestors.
- [ ] Translate same-origin iframe coordinates through the frame chain before highlighting.
- [ ] Define how outline-level transitions behave across separate iframe documents and shadow trees.
- [ ] Replace page-wide O(elements × headings) hover lookup with a precomputed heading-to-content mapping or ancestor walk.
- [ ] Add ordering, iframe highlight, hidden heading, click-navigation, hover-toggle, close, and repeated-run tests.

---

## P2 — ARIA live-region monitor

### Make live-region semantics realm- and visibility-safe

**Files:** `src/utils/ariaLive.ts`, `src/utils/ariaLive.test.ts`

- [ ] Resolve the first recognized fallback role token rather than requiring the first role token itself to be recognized.
- [ ] Normalize `aria-relevant` tokens case-insensitively.
- [ ] Replace top-realm `HTMLImageElement` and `HTMLInputElement` checks with tag/realm-safe checks.
- [ ] Exclude content hidden by an ancestor from the accessibility tree, including `aria-hidden`.
- [ ] Document and test the approximation used for descendant accessible names inside live-region content.
- [ ] Add iframe-realm, role fallback, uppercase token, hidden ancestor, image/input, atomic subtree, and removal tests.

### Harden MonitorAriaLive observation and highlighting

**Files:** `src/_bookmarklets/MonitorAriaLive.ts`

- [ ] Observe dynamically inserted same-origin iframes and register their open shadow roots without top-realm `instanceof`
  failures.
- [ ] Translate highlight rectangles from nested iframe viewports into top-document coordinates.
- [ ] When capture is paused, continue updating snapshots or reset them on resume so stale "before" text does not create false
  announcements.
- [ ] Surface clipboard failures instead of silently discarding rejected `navigator.clipboard.writeText()` promises.
- [ ] Add dynamic iframe, nested frame, pause/resume snapshot, highlight, clipboard rejection, close, and repeated-run tests.

### Make Replay and Freeze safe and accurately described

**Files:** `src/_bookmarklets/MonitorAriaLive.ts`

- [ ] Remove or redesign Replay so it does not serialize through `innerHTML` and destroy descendant listeners/property state.
- [ ] Track and cancel every replay timeout during close; no page mutation may occur after teardown.
- [ ] Preserve exact original global timer/rAF function references and do not overwrite page changes made after hooks were
  installed.
- [ ] Rename or explain Freeze to state that it only defers newly scheduled top-window timers/rAF; existing intervals and iframe
  activity continue.
- [ ] Decide whether media and CSS animations in same-origin frames are included; implement or explicitly list the limitation.
- [ ] Add tests for descendant event listeners/form state, close during replay, existing intervals, iframe activity, timer identity,
  and another script replacing a timer function while the monitor is active.

---

## P2 — Pathify redesign

This depends on shared lifecycle and selector work; do not patch the current selector algorithm in isolation.

**Files:** `src/_bookmarklets/Pathify.ts`, shared lifecycle/selector utilities

- [ ] Replace per-element click/focus/hover listeners with one delegated, abortable listener set.
- [ ] Make Close and Escape remove every panel, download link, temporary container/style/class, listener, and accumulated state.
- [ ] Initialize keyboard selection safely; arrow/Enter commands must be ignored until an element is selected.
- [ ] Replace `innerHTML` with `textContent` for page-derived selectors/status messages.
- [ ] Either restore a real XPath/ID-reference mode or remove the `x` toggle and unreachable legacy XPath code.
- [ ] Generate download data only after current accumulated content is updated and avoid hidden empty anchors in the inspected
  page.
- [ ] Use namespaced tool markers and prevent tool UI from becoming selectable page content.
- [ ] Add selector identity, keyboard-before-selection, delegated click, close/Escape, repeated-run, special-character,
  download-output, and page-interaction restoration tests.

---

## P3 — Remaining standalone tools

### Make TextObserver toggleable

**Files:** `src/_bookmarklets/TextObserver.ts`, shared lifecycle utility

- [ ] Give the canary a tool-owned marker and reuse or tear down an existing instance.
- [ ] Disconnect the `ResizeObserver` and remove the canary on close/re-run.
- [ ] Prevent the canary's large text run from changing page scroll dimensions.
- [ ] Provide a small output/status surface instead of console-only raw entries, or document console output as intentional.
- [ ] Add activation, font/spacing resize, teardown, repeated-run, and no-layout-impact tests.

### Make MakeSkele non-mutating and order-sensitive

**Files:** `src/_bookmarklets/MakeSkele.ts`, `src/utils/finder.ts`; consider `src/utils/Murmurhash.ts`

- [ ] Store computed hash data in a `WeakMap` instead of `hash_data` expandos and `data-hash` attributes.
- [ ] Remove stale-cache behavior so a new run reflects DOM changes.
- [ ] Hash tag, ordered attributes, ordered text/child records, and child boundaries rather than summing commutative child hashes.
- [ ] Define whether scripts, styles, comments, shadow roots, and iframe documents contribute, then test that contract.
- [ ] Use the consolidated selector API and include root context in serialized output.
- [ ] Add tests proving sibling reordering changes the hash, mutations invalidate results, page attributes remain untouched, and
  repeated runs are stable.

### Improve axe bookmarklet delivery

**Files:** `src/_bookmarklets/Axify.ts`, `src/_bookmarklets/AxifyTargeted.ts`,
`vite_plugins/InlineTSPlugin.ts`, `src/main.ts`

- [ ] Add a build-time report and enforce an agreed maximum encoded bookmarklet URL length.
- [ ] Evaluate a reduced custom axe build versus a small runtime loader; document CSP, offline, integrity, and network tradeoffs
  before changing delivery.
- [ ] Add a compact on-page result/error summary while retaining full console objects for developer inspection.
- [ ] Ensure targeted results are ignored or labeled if the selected element disconnects before axe resolves.
- [ ] Add successful run, rejected run, disconnected target, generated URL size, and browser execution smoke tests.

---

## P3 — Final consolidation and verification

- [ ] Remove duplicated shadow traversal, overlay CSS, teardown, and selector code made obsolete by the shared utilities.
- [ ] Run `pnpm exec knip` and remove only newly confirmed dead exports/files; preserve unrelated user work.
- [ ] Run `pnpm fmt`, inspect the diff for unrelated formatting, and revert unrelated formatter changes.
- [ ] Run `pnpm test`; expected result: all node and browser tests pass with no unhandled errors.
- [ ] Run `pnpm lint`; expected result: exit code 0.
- [ ] Run `pnpm build`; expected result: exit code 0 and every generated bookmarklet URL is within the configured size budget.
- [ ] Manually smoke-test every bookmarklet on a normal page, a vertically/horizontally scrolled page, a page with an open shadow
  root, and a page with same-origin plus cross-origin iframes.
- [ ] For every persistent tool, activate it twice and verify the second activation cleanly closes or replaces the first.
- [ ] Confirm all 17 bookmarklets are still linked from `src/main.ts` and no tool leaves page mutations after teardown.
