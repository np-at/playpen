
function closestOther<T extends keyof HTMLElementTagNameMap>(el: HTMLElement | void, selector: T): HTMLElementTagNameMap[T] | null {
  if (!el) return null;
  const r = el?.closest(selector);
  if (r && !r.isSameNode(el)) {
    return r;
  }
  return null;
}

/**
/**
  * Attempts to identify if the given element is rendered in the DOM
 * Checks display state of ancestors, detached status, visible portion of {@link HTMLDetailsElement} (I.E., if part of <summary> despite being in the closed state, )
  * @param {HTMLElement} el - The element to check for rendering.
 * @throws -
 * @return {boolean}
 */
export function isElRendered(el: HTMLElement): boolean {
  let c = 0;
  let cur: HTMLElement | null = el;

  // temporary type incorrectness
  let detailsAncestor: HTMLDetailsElement | null = el as HTMLDetailsElement;
  while ((detailsAncestor = closestOther(detailsAncestor, "details")) !== null) {
    c += 1;
    if (c >= 1000) {
      throw new Error("reached cycle limit");
    }
    if (!detailsAncestor.open) {
      const summaryNode = Array.from(detailsAncestor.children).filter((x) => x instanceof HTMLElement && x.tagName === "SUMMARY");
      if (summaryNode.length > 1) {
        console.error("invalid number of summary element children found", detailsAncestor);
        throw new Error("invalid number of summary element children found");
      } else if (summaryNode.length === 0) {
        continue;
      }

      if (!(summaryNode[0].compareDocumentPosition(el) === Node.DOCUMENT_POSITION_CONTAINED_BY)) {
        // not in summary node and controlling details element is closed means that this ancestor is not rendered
        return false;
      }
    }
  }
  c = 0;
  while (cur !== null && !cur.isSameNode(document.body)) {
    if (!cur.isConnected) {
      return false;
    }
    const computedStyle = window.getComputedStyle(cur);
    if (computedStyle.display === "none") return false;
    cur = cur.parentElement;
    c += 1;
    if (c >= 1000) {
      throw new Error("reached cycle limit");
    }
  }
  return true;
}
