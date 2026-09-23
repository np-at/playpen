/**
 * Focus Not Obscured (WCAG 2.4.11 AA / 2.4.12 AAA).
 *
 * Live: every element you focus is checked once scrolling settles; if other
 * content covers it, it is boxed in red, its coverers dashed, and a row is added
 * to the panel. Sweep: focuses every tabbable in turn, checks each, then puts
 * focus and scroll back.
 *
 * Run again to remove.
 */
import { activateBookmarklet, isToolNode, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";
import { clearCurrentSelectionBoxes, drawBox } from "../utils/drawUtils.ts";
import { findSelector, formatSelector } from "../utils/finder.ts";
import { checkObscured, type ObscuredStatus } from "../utils/focusObscured.ts";
import { withPageStatesRestored } from "../utils/focusStyle.ts";
import { makeDraggableDisplay } from "../utils/makeDraggableOverlay.ts";
import { renderedParent } from "../utils/isElRendered.ts";
import { computeTabOrder } from "../utils/tabOrder.ts";

const TOOL_NAME = "focus-obscured";
const SETTLE_MS = 150;
type Problem = Exclude<ObscuredStatus, "ok"> | "could not focus";
const LABELS: Record<Problem, string> = {
  hidden: "Hidden (2.4.11 AA fail)",
  partial: "Partly covered (2.4.12 AAA)",
  offscreen: "Off-screen",
  unknown: "Could not judge",
  "could not focus": "Could not focus",
};

const describe = (el: Element): string => formatSelector(findSelector(el));
const isFocused = (el: Element): boolean => (el.getRootNode() as Document | ShadowRoot).activeElement === el;

function run(lifecycle: BookmarkletLifecycle): void {
  const panel = makeDraggableDisplay(lifecycle);
  Object.assign(panel.style, {
    background: "white",
    color: "black",
    font: "13px system-ui, sans-serif",
    padding: "8px",
    border: "2px solid black",
  });
  const sweepButton = document.createElement("button");
  sweepButton.type = "button";
  sweepButton.textContent = "Sweep";
  const list = document.createElement("ol");
  list.style.paddingLeft = "20px";
  panel.append(sweepButton, list);
  document.body.appendChild(panel);

  /** Writes one result into `row` (created if needed); returns the row, or undefined if there is nothing to report. */
  const render = (el: Element, problem: Problem | "ok", coveredBy: Element[], row?: HTMLLIElement): HTMLLIElement | undefined => {
    if (problem === "ok") {
      row?.remove();
      return undefined;
    }
    const target = row ?? list.appendChild(document.createElement("li"));
    target.dataset.obscuredStatus = problem;
    target.textContent = `${LABELS[problem]}: ${describe(el)}${coveredBy.length > 0 ? ` — covered by ${coveredBy.map(describe).join(", ")}` : ""}`;
    drawBox(lifecycle, el, {
      append: true,
      group: "problem",
      utilityName: TOOL_NAME,
      style: { borderColor: "red", borderWidth: "3px" },
    });
    for (const coverer of coveredBy) {
      drawBox(lifecycle, coverer, {
        append: true,
        group: "problem",
        utilityName: TOOL_NAME,
        style: { borderColor: "red", borderStyle: "dashed" },
      });
    }
    return target;
  };

  // Live mode: one check per focus, once scrolling settles; re-checks replace the same row.
  let sweeping = false;
  let current: Element | undefined;
  let liveRow: HTMLLIElement | undefined;
  let settleTimer: number | undefined;
  const checkCurrent = (): void => {
    if (current === undefined || !isFocused(current)) return;
    clearCurrentSelectionBoxes(lifecycle);
    const { status, coveredBy } = checkObscured(current);
    liveRow = render(current, status, coveredBy, liveRow);
    if (liveRow !== undefined) console.warn(`Focus Not Obscured: ${status}`, current, coveredBy);
  };
  lifecycle.listen(
    document,
    "focusin",
    (event) => {
      const target = event.composedPath()[0];
      if (sweeping || !(target instanceof Element) || isToolNode(target)) return;
      current = target;
      liveRow = undefined;
      clearCurrentSelectionBoxes(lifecycle);
      window.clearTimeout(settleTimer);
      settleTimer = lifecycle.timeout(checkCurrent, SETTLE_MS);
    },
    true,
  );
  // If focus starts a scroll, wait for scrollend instead of checking mid-scroll (browsers without scrollend keep the timer).
  if ("onscrollend" in window) {
    lifecycle.listen(
      document,
      "scroll",
      () => {
        window.clearTimeout(settleTimer);
      },
      { capture: true, passive: true },
    );
  }
  // ponytail: a header that slides in on a transition after scrollend is missed; refocus to re-check.
  lifecycle.listen(
    document,
    "scrollend",
    () => {
      if (!sweeping) checkCurrent();
    },
    true,
  );

  lifecycle.listen(sweepButton, "click", () => {
    if (sweeping) return;
    sweeping = true;
    sweepButton.disabled = true;
    panel.dataset.sweep = "running";
    void sweep().finally(() => {
      panel.dataset.sweep = "done";
      sweepButton.disabled = false;
      sweeping = false;
    });
  });

  // Plain rAF, not lifecycle.animationFrame: teardown cancels those, which would strand the sweep before it restores the page.
  const nextFrame = (): Promise<void> =>
    new Promise((resolve) =>
      requestAnimationFrame(() => {
        resolve();
      }),
    );

  async function sweep(): Promise<void> {
    liveRow = undefined;
    list.replaceChildren();
    clearCurrentSelectionBoxes(lifecycle);
    const results: { problem: Problem; element: string; coveredBy: string }[] = [];
    // focus() scrolls nested scrollers too; withPageStatesRestored only puts the window back.
    const scrolls = new Map<Element, [number, number]>();
    // ponytail: focus handlers run during the sweep, so menus and the like may open and close.
    const outcome = await withPageStatesRestored([document], async () => {
      for (const el of computeTabOrder(document)) {
        if (!lifecycle.active) break;
        for (let cur = renderedParent(el); cur !== null; cur = renderedParent(cur)) {
          if (!scrolls.has(cur)) scrolls.set(cur, [cur.scrollLeft, cur.scrollTop]);
        }
        el.focus();
        await nextFrame();
        await nextFrame();
        const { status, coveredBy } = isFocused(el) ? checkObscured(el) : { status: "could not focus" as const, coveredBy: [] };
        if (status === "ok") continue;
        render(el, status, coveredBy);
        results.push({ problem: status, element: describe(el), coveredBy: coveredBy.map(describe).join(", ") });
      }
      for (const [el, [left, top]] of scrolls) el.scrollTo({ left, top, behavior: "instant" });
    });
    for (const failure of outcome.restorationFailures) {
      list.appendChild(document.createElement("li")).textContent = "Could not fully restore focus/scroll after sweep (see console)";
      console.warn("Focus Not Obscured: restoration failure", failure);
    }
    for (const mutation of outcome.historyMutations) {
      list.appendChild(document.createElement("li")).textContent = "Sweep changed browser history (see console)";
      console.warn("Focus Not Obscured: sweep changed history", mutation);
    }
    if (results.length > 0) console.table(results);
    else list.appendChild(document.createElement("li")).textContent = "Sweep found no problems";
  }
}

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) run(lifecycle);
