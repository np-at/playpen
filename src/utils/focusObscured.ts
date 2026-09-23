import { isToolNode } from "./bookmarkletLifecycle.ts";
import { renderedParent } from "./isElRendered.ts";

export type ObscuredStatus = "ok" | "partial" | "hidden" | "offscreen" | "unknown";
export type ObscuredResult = { status: ObscuredStatus; coveredBy: Element[] };

const GRID = 5;

/** `ancestor` is `node` or one of its ancestors, crossing shadow boundaries. */
export function composedContains(ancestor: Element, node: Element): boolean {
  for (let cur: Element | null = node; cur !== null; cur = renderedParent(cur)) {
    if (cur === ancestor) return true;
  }
  return false;
}

/**
 * The part of `el` that could be seen: its box clipped to the viewport and to overflow-clipping ancestors.
 * ponytail: ancestor clip uses the border box (ignores borders/scrollbars) and ignores fixed-position escape.
 */
function visibleRect(el: Element): DOMRect {
  const view = el.ownerDocument.defaultView;
  let { left, top, right, bottom } = el.getBoundingClientRect();
  const clip = (r: { left: number; top: number; right: number; bottom: number }): void => {
    left = Math.max(left, r.left);
    top = Math.max(top, r.top);
    right = Math.min(right, r.right);
    bottom = Math.min(bottom, r.bottom);
  };
  if (view !== null) clip({ left: 0, top: 0, right: view.innerWidth, bottom: view.innerHeight });
  for (let cur = renderedParent(el); cur !== null && cur.ownerDocument === el.ownerDocument; cur = renderedParent(cur)) {
    if (cur === el.ownerDocument.documentElement || cur === el.ownerDocument.body) break;
    const style = getComputedStyle(cur);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") clip(cur.getBoundingClientRect());
  }
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

/**
 * Whether a focused element is covered by other content (WCAG 2.4.11 hidden / 2.4.12 partial).
 * Samples the centres of a 5×5 grid over the visible part of the element and walks the hit-test
 * stack at each point, looking through this tool's own nodes.
 * ponytail: misses `pointer-events:none` coverers and ancestor ::before/::after overlays; counts
 * transparent overlays as covering; a sliver thinner than one grid cell can read as hidden.
 */
export function checkObscured(el: Element): ObscuredResult {
  const rect = visibleRect(el);
  if (rect.width === 0 || rect.height === 0) return { status: "offscreen", coveredBy: [] };

  const root = el.getRootNode() as Document | ShadowRoot;
  const coveredBy = new Set<Element>();
  let clear = 0;
  let covered = 0;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = rect.left + ((i + 0.5) * rect.width) / GRID;
      const y = rect.top + ((j + 0.5) * rect.height) / GRID;
      for (const hit of root.elementsFromPoint(x, y)) {
        if (isToolNode(hit)) continue;
        if (composedContains(el, hit) || composedContains(hit, el)) {
          clear++;
        } else {
          covered++;
          coveredBy.add(hit);
        }
        break;
      }
    }
  }
  const status: ObscuredStatus = clear + covered === 0 ? "unknown" : clear === 0 ? "hidden" : covered > 0 ? "partial" : "ok";
  return { status, coveredBy: [...coveredBy] };
}
