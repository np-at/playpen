import { isElAriaHidden, isElRendered, renderedParent } from "./isElRendered.ts";

export type FocusStyleDifference = {
  target: "element" | "::before" | "::after";
  property: string;
  unfocused: string;
  focused: string;
};

export type FocusStyleInspection =
  | { status: "style-difference"; element: HTMLElement; differences: FocusStyleDifference[] }
  | { status: "no-visible-difference"; element: HTMLElement }
  | { status: "could-not-focus"; element: HTMLElement; reason: "focus-was-not-retained" | "no-window" };

export type FocusStyleReport = {
  styleDifferences: Array<Extract<FocusStyleInspection, { status: "style-difference" }>>;
  noVisibleDifference: HTMLElement[];
  couldNotFocus: Array<Extract<FocusStyleInspection, { status: "could-not-focus" }>>;
};

type StyleTarget = FocusStyleDifference["target"];
type StyleSnapshot = Record<StyleTarget, Record<string, string>>;

const FOCUS_CANDIDATE_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a[href]",
  "summary",
  "[contenteditable]",
  "audio[controls]",
  "video[controls]",
  "[tabindex]",
].join(",");

function hasInertAncestor(element: Element): boolean {
  let current: Element | null = element;
  while (current !== null) {
    if (current.hasAttribute("inert")) return true;
    current = renderedParent(current);
  }
  return false;
}

function isFirstSummary(element: HTMLElement): boolean {
  if (element.localName !== "summary" || element.parentElement?.localName !== "details") return false;
  return Array.from(element.parentElement.children).find((child) => child.localName === "summary") === element;
}

function isSupportedFocusType(element: HTMLElement): boolean {
  if (element.hasAttribute("tabindex")) return true;
  if (element.localName === "a") return element.hasAttribute("href");
  if (["button", "input", "select", "textarea"].includes(element.localName)) return true;
  if (element.localName === "summary") return isFirstSummary(element);
  if (element.localName === "audio" || element.localName === "video") return element.hasAttribute("controls");
  return element.isContentEditable;
}

function isEligibleFocusCandidate(element: HTMLElement): boolean {
  return (
    isSupportedFocusType(element) &&
    !element.matches(":disabled") &&
    !hasInertAncestor(element) &&
    isElRendered(element) &&
    !isElAriaHidden(element)
  );
}

function styleToObject(style: CSSStyleDeclaration): Record<string, string> {
  const result: Record<string, string> = {};
  for (const property of style) result[property] = style.getPropertyValue(property);
  return result;
}

function captureStyles(element: HTMLElement): StyleSnapshot {
  const view = element.ownerDocument.defaultView;
  if (view === null) return { element: {}, "::before": {}, "::after": {} };
  return {
    element: styleToObject(view.getComputedStyle(element)),
    "::before": styleToObject(view.getComputedStyle(element, "::before")),
    "::after": styleToObject(view.getComputedStyle(element, "::after")),
  };
}

function compareStyles(unfocused: StyleSnapshot, focused: StyleSnapshot): FocusStyleDifference[] {
  const differences: FocusStyleDifference[] = [];
  for (const target of ["element", "::before", "::after"] as const) {
    const properties = new Set([...Object.keys(unfocused[target]), ...Object.keys(focused[target])]);
    for (const property of properties) {
      const before = unfocused[target][property] ?? "";
      const after = focused[target][property] ?? "";
      if (before !== after) differences.push({ target, property, unfocused: before, focused: after });
    }
  }
  return differences;
}

function nextAnimationFrame(view: Window): Promise<void> {
  return new Promise((resolve) => {
    view.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function isHtmlOrSvgElement(element: Element): element is HTMLElement | SVGElement {
  const view = element.ownerDocument.defaultView;
  return view !== null && (element instanceof view.HTMLElement || element instanceof view.SVGElement);
}

function isIFrameElement(element: Element): element is HTMLIFrameElement {
  const view = element.ownerDocument.defaultView;
  return view !== null && element instanceof view.HTMLIFrameElement;
}

function deepestActiveElement(documentRoot: Document): Element | null {
  let active: Element | null = documentRoot.activeElement;
  while (active !== null) {
    const shadowActive = active.shadowRoot?.activeElement;
    if (shadowActive !== null && shadowActive !== undefined) {
      active = shadowActive;
      continue;
    }
    if (isIFrameElement(active)) {
      try {
        const frameActive = active.contentDocument?.activeElement;
        if (frameActive !== null && frameActive !== undefined) {
          active = frameActive;
          continue;
        }
      } catch {
        // A cross-origin frame remains the deepest restorable focus target.
      }
    }
    return active;
  }
  return null;
}

function focusWithoutScrolling(element: Element): void {
  if (isHtmlOrSvgElement(element)) element.focus({ preventScroll: true });
}

function blur(element: Element | null): void {
  if (element !== null && isHtmlOrSvgElement(element)) element.blur();
}

async function withPageStateRestored<T>(documentRoot: Document, operation: () => Promise<T>): Promise<T> {
  const view = documentRoot.defaultView;
  if (view === null) return operation();
  const activeElement = deepestActiveElement(documentRoot);
  const scrollX = view.scrollX;
  const scrollY = view.scrollY;
  const url = view.location.href;
  const historyState = view.history.state as unknown;

  try {
    return await operation();
  } finally {
    if (activeElement === documentRoot.body || activeElement === documentRoot.documentElement || activeElement === null) {
      blur(deepestActiveElement(documentRoot));
    } else if (activeElement.isConnected) {
      focusWithoutScrolling(activeElement);
    }
    if (view.location.href !== url || view.history.state !== historyState) {
      view.history.replaceState(historyState, "", url);
    }
    view.scrollTo({ behavior: "instant", left: scrollX, top: scrollY });
  }
}

function documentFor(root: ParentNode): Document {
  if (root.nodeType === Node.DOCUMENT_NODE) return root as Document;
  if ("ownerDocument" in root && root.ownerDocument !== null) return root.ownerDocument;
  return document;
}

export function findFocusCandidates(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll(FOCUS_CANDIDATE_SELECTOR)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && isEligibleFocusCandidate(element),
  );
}

export async function inspectFocusStyle(element: HTMLElement): Promise<FocusStyleInspection> {
  const documentRoot = element.ownerDocument;
  const view = documentRoot.defaultView;
  if (view === null) return { status: "could-not-focus", element, reason: "no-window" };

  if (documentRoot.activeElement === element) {
    element.blur();
    await nextAnimationFrame(view);
  }
  const unfocused = captureStyles(element);

  element.focus({ preventScroll: true });
  await nextAnimationFrame(view);
  if (documentRoot.activeElement !== element) {
    return { status: "could-not-focus", element, reason: "focus-was-not-retained" };
  }

  const differences = compareStyles(unfocused, captureStyles(element));
  return differences.length === 0
    ? { status: "no-visible-difference", element }
    : { status: "style-difference", element, differences };
}

export async function runFocusStyleCheck(root: ParentNode): Promise<FocusStyleReport> {
  const report: FocusStyleReport = { styleDifferences: [], noVisibleDifference: [], couldNotFocus: [] };
  await withPageStateRestored(documentFor(root), async () => {
    for (const element of findFocusCandidates(root)) {
      const result = await inspectFocusStyle(element);
      if (result.status === "style-difference") report.styleDifferences.push(result);
      else if (result.status === "no-visible-difference") report.noVisibleDifference.push(result.element);
      else report.couldNotFocus.push(result);
    }
  });
  return report;
}

export function writeFocusStyleReport(report: FocusStyleReport): void {
  for (const result of report.styleDifferences) {
    console.debug("Focus Style Check: visible style difference", result.element, result.differences);
  }
  if (report.noVisibleDifference.length > 0) {
    console.warn("Focus Style Check: focused but no visible style difference", report.noVisibleDifference);
  }
  if (report.couldNotFocus.length > 0) {
    console.info("Focus Style Check: could not focus", report.couldNotFocus);
  }
  console.info("Focus Style Check: complete", {
    visibleStyleDifferences: report.styleDifferences.length,
    noVisibleDifference: report.noVisibleDifference.length,
    couldNotFocus: report.couldNotFocus.length,
  });
}
