import { isToolNode } from "./bookmarkletLifecycle.ts";
import { isElRendered, renderedParent } from "./isElRendered.ts";

type Focusable = HTMLElement | SVGElement;

function isInert(el: Element): boolean {
  for (let cur: Element | null = el; cur !== null; cur = renderedParent(cur)) {
    if (cur.hasAttribute("inert")) return true;
  }
  return false;
}

function isTabbable(el: Element): el is Focusable {
  if (!(el instanceof HTMLElement || el instanceof SVGElement) || el.tabIndex < 0) return false;
  // `tabIndex` reports 0 for <a>/<area> without href, but they are not focusable.
  if ((el.localName === "a" || el.localName === "area") && !el.hasAttribute("href") && !el.hasAttribute("tabindex")) return false;
  return !el.matches(":disabled") && !isInert(el) && !isToolNode(el) && isElRendered(el);
}

/** Children in composed-tree order: shadow content replaces light children, slots expand to what they render. */
function composedChildren(node: Element | ShadowRoot): Element[] {
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    return assigned.length > 0 ? assigned : Array.from(node.children);
  }
  if (node instanceof Element && node.shadowRoot !== null) return Array.from(node.shadowRoot.children);
  return Array.from(node.children);
}

/**
 * Sequential focus order under `root`, excluding playpen bookmarklet UI: positive tabindex ascending, then tabindex 0 in composed-tree order.
 * ponytail: positive tabindex is sorted globally, not per shadow scope as browsers do; the recorded layer catches the difference.
 * ponytail: iframe contents are skipped.
 */
export function computeTabOrder(root: Document | Element): Focusable[] {
  const found: Focusable[] = [];
  const visit = (node: Element | ShadowRoot): void => {
    for (const child of composedChildren(node)) {
      if (isTabbable(child)) found.push(child);
      visit(child);
    }
  };
  visit(root instanceof Document ? root.documentElement : root);
  return found.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
}

/**
 * Indices of steps whose target sits before the previous stop in reading order:
 * clearly higher on the page, or on the same row but further left.
 * ponytail: assumes LTR, top-to-bottom reading order.
 */
export function findBackwardJumps(rects: DOMRect[]): number[] {
  const jumps: number[] = [];
  for (let i = 1; i < rects.length; i++) {
    const prev = rects[i - 1];
    const next = rects[i];
    const up = next.top < prev.top - prev.height / 2;
    const sameRowLeft = next.top < prev.bottom && next.bottom > prev.top && next.left < prev.left;
    if (up || sameRowLeft) jumps.push(i);
  }
  return jumps;
}
