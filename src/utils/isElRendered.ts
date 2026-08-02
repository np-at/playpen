const DOCUMENT_POSITION_CONTAINED_BY = 16;
const MAX_ANCESTORS = 1000;

/** The composed parent that can affect an element, including shadow and iframe boundaries. */
export function renderedParent(el: Element): Element | null {
  if (el.parentElement !== null) return el.parentElement;

  const root = el.getRootNode();
  if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in root) return root.host as Element;

  if (root === el.ownerDocument) {
    try {
      return el.ownerDocument.defaultView?.frameElement ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

function firstSummary(details: Element): Element | null {
  return Array.from(details.children).find((child) => child.localName === "summary") ?? null;
}

function containsByDocumentPosition(container: Element, node: Element): boolean {
  return container.isSameNode(node) || (container.compareDocumentPosition(node) & DOCUMENT_POSITION_CONTAINED_BY) !== 0;
}

/**
 * Whether an element is visually rendered.
 *
 * `display:none`, `content-visibility:hidden`, inherited `visibility:hidden`,
 * disconnected nodes, and closed-details content are not rendered. A
 * descendant may override inherited visibility with `visibility:visible`.
 * `aria-hidden` is intentionally not considered: it changes the accessibility
 * tree, not visual rendering. Use {@link isElAriaHidden} for that check.
 */
export function isElRendered(el: Element): boolean {
  let cur: Element | null = el;
  let branch: Element = el;
  let visibilityRoot: Element = el;
  let ancestorCount = 0;

  while (cur !== null) {
    ancestorCount += 1;
    if (ancestorCount >= MAX_ANCESTORS) throw new Error("reached cycle limit");
    if (!cur.isConnected) return false;

    const view = cur.ownerDocument.defaultView;
    if (view === null) return false;
    const style = view.getComputedStyle(cur);
    if (style.display === "none" || style.contentVisibility === "hidden") return false;

    if (cur.isSameNode(visibilityRoot) && (style.visibility === "hidden" || style.visibility === "collapse")) {
      return false;
    }

    if (!cur.isSameNode(el) && cur.localName === "details" && !cur.hasAttribute("open")) {
      const summary = firstSummary(cur);
      if (summary === null || !containsByDocumentPosition(summary, branch)) return false;
    }

    const next = renderedParent(cur);
    if (next !== null && next.ownerDocument !== cur.ownerDocument) visibilityRoot = next;
    branch = cur;
    cur = next;
  }
  return true;
}

/** Whether `el` is excluded from the accessibility tree by an ARIA ancestor. */
export function isElAriaHidden(el: Element): boolean {
  let cur: Element | null = el;
  let ancestorCount = 0;
  while (cur !== null) {
    ancestorCount += 1;
    if (ancestorCount >= MAX_ANCESTORS) throw new Error("reached cycle limit");
    if (cur.getAttribute("aria-hidden")?.trim().toLowerCase() === "true") return true;
    cur = renderedParent(cur);
  }
  return false;
}
