import { getRole } from "aria-api";
import { collectSelectorRoots, type SkippedSelectorRoot } from "./finder.ts";
import { isElRendered, renderedParent } from "./isElRendered.ts";

export interface NamedLinkResult {
  link: Element;
  naming: { attribute: string; value: string }[];
  descendants: { element: Element; role: string | undefined; focusable: boolean }[];
}

function children(element: Element): Element[] {
  if (element.localName === "slot") {
    const assigned = (element as HTMLSlotElement).assignedNodes({ flatten: true });
    if (assigned.length) return assigned.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
  }
  return Array.from(element.shadowRoot?.children ?? element.children);
}

function* descendants(element: Element): Generator<Element> {
  for (const child of children(element)) {
    if (child.hasAttribute("data-a11y-playpen-tool")) continue;
    yield child;
    yield* descendants(child);
  }
}

/** Include shadow wrappers of assigned slots, which ordinary DOM ancestry skips. */
function exposure(element: Element): { rendered: boolean; ariaHidden: boolean } {
  let ariaHidden = false;
  let branch = element;
  for (let current: Element | null = element; current !== null; current = current.assignedSlot ?? renderedParent(current)) {
    if (current.hasAttribute("inert") || current.hasAttribute("data-a11y-playpen-tool")) return { rendered: false, ariaHidden };
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.contentVisibility === "hidden") return { rendered: false, ariaHidden };
    if (current !== element && current.localName === "details" && !current.hasAttribute("open")) {
      const summary = Array.from(current.children).find((child) => child.localName === "summary");
      if (branch !== summary) return { rendered: false, ariaHidden };
    }
    if (current.getAttribute("aria-hidden")?.trim().toLowerCase() === "true") ariaHidden = true;
    branch = current;
  }
  return { rendered: isElRendered(element), ariaHidden };
}

/** A markup-based focusability check, including negative tabindex, without moving focus. */
function isFocusable(element: Element): boolean {
  if (element.matches(':disabled, input[type="hidden"]')) return false;
  if (element.ownerDocument.defaultView?.getComputedStyle(element).display === "contents") return false;
  const tabindex = element.getAttribute("tabindex");
  // HTML integer parsing accepts an ASCII-whitespace/sign/digit prefix, even with trailing junk.
  if (tabindex !== null && /^[\t\n\f\r ]*[+-]?[0-9]+/.test(tabindex)) return true;
  if (
    element.matches("a[href], area[href], button, input, select, textarea, iframe, object, embed, audio[controls], video[controls]")
  ) {
    return true;
  }
  if (element.localName === "summary" && element.parentElement?.localName === "details") {
    return Array.from(element.parentElement.children).find((child) => child.localName === "summary") === element;
  }
  // Only editing hosts are independently focusable, not every inherited editable descendant.
  return (
    Boolean((element as Element & { isContentEditable?: boolean }).isContentEditable) &&
    element.parentElement?.isContentEditable !== true
  );
}

// Global ARIA properties trigger presentation-role conflict resolution.
// https://www.w3.org/TR/wai-aria-1.2/#global_states
const GLOBAL_ARIA = new Set([
  "aria-atomic",
  "aria-busy",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "aria-disabled",
  "aria-dropeffect",
  "aria-errormessage",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-live",
  "aria-owns",
  "aria-relevant",
  "aria-roledescription",
]);

function effectiveRole(element: Element, focusable = isFocusable(element)): string | undefined {
  const role: string | undefined = getRole(element);
  if (role !== "none" && role !== "presentation") return role;
  if (!focusable && !element.getAttributeNames().some((name) => GLOBAL_ARIA.has(name))) return role;

  // aria-api reads getAttribute("role") and matches() to resolve roles. Mask only
  // the conflicting role; keep native selector matching in the original DOM so
  // contextual mappings work. Never remove attributes on the live page, even temporarily.
  const implicitRoleView = new Proxy(element, {
    get(target, key): unknown {
      if (key === "getAttribute") return (name: string) => (name === "role" ? null : target.getAttribute(name));
      if (key === "matches") return target.matches.bind(target);
      return Reflect.get(target, key, target) as unknown;
    },
  });
  return getRole(implicitRoleView);
}

/**
 * Review candidates, not automatic WCAG failures. Non-empty naming attributes are
 * reported as authored, including unresolved ID references; this does not claim
 * that the attribute supplies a valid computed name. Closed shadows are inaccessible.
 */
export function scanNamedLinks(root: Document): { results: NamedLinkResult[]; skipped: SkippedSelectorRoot[] } {
  const snapshot = collectSelectorRoots(root);
  const results: NamedLinkResult[] = [];
  for (const scope of snapshot.visited) {
    if (scope.nodeType !== Node.DOCUMENT_NODE) continue;
    const doc = scope as Document;
    for (const link of descendants(doc.documentElement)) {
      if (!link.matches("[aria-label], [aria-labelledby]") || effectiveRole(link) !== "link" || !exposure(link).rendered) continue;
      const naming = ["aria-label", "aria-labelledby"].flatMap((attribute) => {
        const value = link.getAttribute(attribute);
        return value?.trim() ? [{ attribute, value }] : [];
      });
      if (!naming.length) continue;
      const matches: NamedLinkResult["descendants"] = [];
      for (const element of descendants(link)) {
        const state = exposure(element);
        if (!state.rendered) continue;
        const focusable = isFocusable(element);
        const computedRole = effectiveRole(element, focusable);
        const role =
          !state.ariaHidden && computedRole && !["generic", "none", "presentation"].includes(computedRole) ? computedRole : undefined;
        if (role || focusable) matches.push({ element, role, focusable });
      }
      if (matches.length) results.push({ link, naming, descendants: matches });
    }
  }
  return { results, skipped: snapshot.skipped };
}
