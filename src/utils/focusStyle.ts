import { isElAriaHidden, isElRendered, renderedParent } from "./isElRendered.ts";
import { collectSelectorRoots, type SelectorRoot } from "./finder.ts";

export type FocusStyleDifference = {
  target: "element" | "::before" | "::after";
  property: string;
  unfocused: string;
  focused: string;
};

export type FocusStyleInspection =
  | { status: "style-difference"; element: HTMLElement; differences: FocusStyleDifference[] }
  | { status: "no-visible-difference"; element: HTMLElement }
  | {
      status: "could-not-focus";
      element: HTMLElement;
      reason: "focus-was-not-retained" | "no-window" | "could-not-clear-prior-focus";
    };

export type FocusStyleRestorationFailure = {
  actualActiveElement: Element | null;
  actualScroll: { x: number; y: number };
  document: Document;
  expectedActiveElement: Element | null;
  expectedScroll: { x: number; y: number };
};

export type FocusStyleHistoryMutation = {
  actualHistoryLength: number;
  actualUrl: string;
  document: Document;
  expectedHistoryLength: number;
  expectedUrl: string;
};

export type FocusStyleReport = {
  styleDifferences: Array<Extract<FocusStyleInspection, { status: "style-difference" }>>;
  noVisibleDifference: HTMLElement[];
  couldNotFocus: Array<Extract<FocusStyleInspection, { status: "could-not-focus" }>>;
  historyMutations: FocusStyleHistoryMutation[];
  restorationFailures: FocusStyleRestorationFailure[];
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

function isHtmlElement(element: Element): element is HTMLElement {
  const view = element.ownerDocument.defaultView;
  return view !== null && element instanceof view.HTMLElement;
}

function isHtmlOrSvgElement(element: Element): element is HTMLElement | SVGElement {
  const view = element.ownerDocument.defaultView;
  return view !== null && (element instanceof view.HTMLElement || element instanceof view.SVGElement);
}

function activeElementFor(element: Element): Element | null {
  const root = element.getRootNode();
  if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in root) return (root as ShadowRoot).activeElement;
  return element.ownerDocument.activeElement;
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

function focusWithoutScrolling(element: Element, focusVisible?: boolean): void {
  if (isHtmlOrSvgElement(element)) element.focus({ focusVisible, preventScroll: true });
}

function blur(element: Element | null): void {
  if (element !== null && isHtmlOrSvgElement(element)) element.blur();
}

function clearDocumentFocus(documentRoot: Document): void {
  blur(deepestActiveElement(documentRoot));
  if (documentRoot.activeElement !== documentRoot.body && documentRoot.activeElement !== documentRoot.documentElement) {
    blur(documentRoot.activeElement);
  }
}

function documentFocusIsCleared(documentRoot: Document): boolean {
  const activeElement = deepestActiveElement(documentRoot);
  return activeElement === null || activeElement === documentRoot.body || activeElement === documentRoot.documentElement;
}

type PageState = {
  activeElement: Element | null;
  focusVisible: boolean;
  historyLength: number;
  historyState: unknown;
  observedHistoryLength: number;
  observedHistoryState: unknown;
  scrollX: number;
  scrollY: number;
  url: string;
  view: Window;
};

async function structuredCloneEquals(
  left: unknown,
  right: unknown,
  paired: Map<object, object> = new Map(),
  reversePaired: Map<object, object> = new Map(),
): Promise<boolean> {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false;
  if (paired.has(left)) return paired.get(left) === right;
  if (reversePaired.has(right)) return reversePaired.get(right) === left;
  paired.set(left, right);
  reversePaired.set(right, left);

  const leftTag = Object.prototype.toString.call(left);
  if (leftTag !== Object.prototype.toString.call(right)) return false;
  if (leftTag === "[object Date]") return Date.prototype.getTime.call(left) === Date.prototype.getTime.call(right);
  if (leftTag === "[object RegExp]") {
    const leftExpression = left as RegExp;
    const rightExpression = right as RegExp;
    return leftExpression.source === rightExpression.source && leftExpression.flags === rightExpression.flags;
  }
  if (leftTag === "[object Blob]" || leftTag === "[object File]") {
    const leftBlob = left as Blob;
    const rightBlob = right as Blob;
    if (leftBlob.size !== rightBlob.size || leftBlob.type !== rightBlob.type) return false;
    if (leftTag === "[object File]") {
      const leftFile = left as File;
      const rightFile = right as File;
      if (leftFile.name !== rightFile.name || leftFile.lastModified !== rightFile.lastModified) return false;
    }
    const [leftContents, rightContents] = await Promise.all([leftBlob.arrayBuffer(), rightBlob.arrayBuffer()]);
    return structuredCloneEquals(leftContents, rightContents, paired, reversePaired);
  }
  if (leftTag === "[object Error]") {
    const leftError = left as Error & { cause?: unknown };
    const rightError = right as Error & { cause?: unknown };
    if (leftError.name !== rightError.name || leftError.message !== rightError.message) return false;
    for (const property of ["stack", "cause"] as const) {
      if (Object.hasOwn(leftError, property) !== Object.hasOwn(rightError, property)) return false;
      if (
        Object.hasOwn(leftError, property) &&
        !(await structuredCloneEquals(leftError[property], rightError[property], paired, reversePaired))
      ) {
        return false;
      }
    }
    return true;
  }
  if (leftTag === "[object Map]") {
    const leftEntries = Array.from((left as Map<unknown, unknown>).entries());
    const rightEntries = Array.from((right as Map<unknown, unknown>).entries());
    if (leftEntries.length !== rightEntries.length) return false;
    for (const [index, [leftKey, leftValue]] of leftEntries.entries()) {
      const rightEntry = rightEntries[index];
      if (!(await structuredCloneEquals(leftKey, rightEntry[0], paired, reversePaired))) return false;
      if (!(await structuredCloneEquals(leftValue, rightEntry[1], paired, reversePaired))) return false;
    }
    return true;
  }
  if (leftTag === "[object Set]") {
    const leftValues = Array.from((left as Set<unknown>).values());
    const rightValues = Array.from((right as Set<unknown>).values());
    if (leftValues.length !== rightValues.length) return false;
    for (const [index, leftValue] of leftValues.entries()) {
      if (!(await structuredCloneEquals(leftValue, rightValues[index], paired, reversePaired))) return false;
    }
    return true;
  }
  if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
    return (
      left.byteLength === right.byteLength &&
      Array.from(new Uint8Array(left.buffer, left.byteOffset, left.byteLength)).every(
        (value, index) => value === new Uint8Array(right.buffer, right.byteOffset, right.byteLength)[index],
      )
    );
  }
  if (leftTag === "[object ArrayBuffer]") {
    const leftBytes = new Uint8Array(left as ArrayBuffer);
    const rightBytes = new Uint8Array(right as ArrayBuffer);
    return leftBytes.length === rightBytes.length && leftBytes.every((value, index) => value === rightBytes[index]);
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key) || !(await structuredCloneEquals(left[key as never], right[key as never], paired, reversePaired))) {
      return false;
    }
  }
  return true;
}

function snapshotHistoryState(view: Window): unknown {
  return view.structuredClone(view.history.state as unknown);
}

function capturePageState(documentRoot: Document): PageState | null {
  const view = documentRoot.defaultView;
  if (view === null) return null;
  const activeElement = deepestActiveElement(documentRoot);
  const historyState = view.history.state as unknown;
  return {
    activeElement,
    focusVisible: activeElement?.matches(":focus-visible") ?? false,
    historyLength: view.history.length,
    historyState: view.structuredClone(historyState),
    observedHistoryLength: view.history.length,
    observedHistoryState: view.structuredClone(historyState),
    scrollX: view.scrollX,
    scrollY: view.scrollY,
    url: view.location.href,
    view,
  };
}

function restoreFocusAndScroll(documentRoot: Document, state: PageState): void {
  if (
    state.activeElement === documentRoot.body ||
    state.activeElement === documentRoot.documentElement ||
    state.activeElement === null
  ) {
    clearDocumentFocus(documentRoot);
  } else if (state.activeElement.isConnected) {
    focusWithoutScrolling(state.activeElement, state.focusVisible);
  }
  state.view.scrollTo({ behavior: "instant", left: state.scrollX, top: state.scrollY });
}

function pageStateMatches(documentRoot: Document, state: PageState): boolean {
  return (
    deepestActiveElement(documentRoot) === state.activeElement &&
    state.view.scrollX === state.scrollX &&
    state.view.scrollY === state.scrollY
  );
}

async function restorePageState(documentRoot: Document, state: PageState): Promise<FocusStyleRestorationFailure | undefined> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    restoreFocusAndScroll(documentRoot, state);
    await nextAnimationFrame(state.view);
    if (pageStateMatches(documentRoot, state)) return undefined;
  }
  return {
    actualActiveElement: deepestActiveElement(documentRoot),
    actualScroll: { x: state.view.scrollX, y: state.view.scrollY },
    document: documentRoot,
    expectedActiveElement: state.activeElement,
    expectedScroll: { x: state.scrollX, y: state.scrollY },
  };
}

async function historyChanged(state: PageState): Promise<boolean> {
  return (
    state.view.location.href !== state.url ||
    state.view.history.length !== state.observedHistoryLength ||
    !(await structuredCloneEquals(state.view.history.state, state.observedHistoryState))
  );
}

async function restoreHistoryState(documentRoot: Document, state: PageState): Promise<FocusStyleHistoryMutation | undefined> {
  if (!(await historyChanged(state))) return undefined;
  const mutation = {
    actualHistoryLength: state.view.history.length,
    actualUrl: state.view.location.href,
    document: documentRoot,
    expectedHistoryLength: state.historyLength,
    expectedUrl: state.url,
  };
  state.view.history.replaceState(state.historyState, "", state.url);
  state.observedHistoryLength = state.view.history.length;
  state.observedHistoryState = snapshotHistoryState(state.view);
  return mutation;
}

async function withPageStatesRestored<T>(
  documents: Document[],
  operation: (states: Map<Document, PageState>) => Promise<T>,
): Promise<{ historyMutations: FocusStyleHistoryMutation[]; restorationFailures: FocusStyleRestorationFailure[]; result: T }> {
  const states = documents.flatMap((documentRoot) => {
    const state = capturePageState(documentRoot);
    return state === null ? [] : [{ documentRoot, state }];
  });
  const historyMutations: FocusStyleHistoryMutation[] = [];
  const restorationFailures: FocusStyleRestorationFailure[] = [];

  try {
    const result = await operation(new Map(states.map(({ documentRoot, state }) => [documentRoot, state])));
    return { historyMutations, restorationFailures, result };
  } finally {
    for (let index = states.length - 1; index >= 0; index -= 1) {
      const entry = states[index];
      const restorationFailure = await restorePageState(entry.documentRoot, entry.state);
      if (restorationFailure !== undefined) restorationFailures.push(restorationFailure);
      const historyMutation = await restoreHistoryState(entry.documentRoot, entry.state);
      if (historyMutation !== undefined) historyMutations.push(historyMutation);
    }
  }
}

function documentFor(root: ParentNode): Document {
  if (root.nodeType === Node.DOCUMENT_NODE) return root as Document;
  if ("ownerDocument" in root && root.ownerDocument !== null) return root.ownerDocument;
  return document;
}

export function findFocusCandidates(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll(FOCUS_CANDIDATE_SELECTOR)).filter(
    (element): element is HTMLElement => isHtmlElement(element) && isEligibleFocusCandidate(element),
  );
}

export async function inspectFocusStyle(element: HTMLElement): Promise<FocusStyleInspection> {
  const documentRoot = element.ownerDocument;
  const view = documentRoot.defaultView;
  if (view === null) return { status: "could-not-focus", element, reason: "no-window" };

  clearDocumentFocus(documentRoot);
  await nextAnimationFrame(view);
  if (!documentFocusIsCleared(documentRoot)) {
    return { status: "could-not-focus", element, reason: "could-not-clear-prior-focus" };
  }
  const unfocused = captureStyles(element);

  element.focus({ focusVisible: true, preventScroll: true });
  await nextAnimationFrame(view);
  if (activeElementFor(element) !== element) {
    return { status: "could-not-focus", element, reason: "focus-was-not-retained" };
  }

  const differences = compareStyles(unfocused, captureStyles(element));
  return differences.length === 0
    ? { status: "no-visible-difference", element }
    : { status: "style-difference", element, differences };
}

export async function runFocusStyleCheck(root: ParentNode): Promise<FocusStyleReport> {
  const report: FocusStyleReport = {
    couldNotFocus: [],
    historyMutations: [],
    noVisibleDifference: [],
    restorationFailures: [],
    styleDifferences: [],
  };
  const roots: ParentNode[] =
    root.nodeType === Node.DOCUMENT_NODE || (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in root)
      ? collectSelectorRoots(root as SelectorRoot).visited
      : [root];
  const documents = Array.from(new Set(roots.map(documentFor)));
  const outcome = await withPageStatesRestored(documents, async (states) => {
    for (const currentRoot of roots) {
      for (const element of findFocusCandidates(currentRoot)) {
        const result = await inspectFocusStyle(element);
        if (result.status === "style-difference") report.styleDifferences.push(result);
        else if (result.status === "no-visible-difference") report.noVisibleDifference.push(result.element);
        else report.couldNotFocus.push(result);
        for (const [documentRoot, state] of states) {
          const historyMutation = await restoreHistoryState(documentRoot, state);
          if (historyMutation !== undefined) report.historyMutations.push(historyMutation);
        }
      }
    }
  });
  report.historyMutations.push(...outcome.historyMutations);
  report.restorationFailures.push(...outcome.restorationFailures);
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
  if (report.restorationFailures.length > 0) {
    console.error("Focus Style Check: could not restore focus or scroll", report.restorationFailures);
  }
  if (report.historyMutations.length > 0) {
    console.error(
      "Focus Style Check: page focus handlers changed history; URL and state were restored, but browser history entries cannot be safely removed",
      report.historyMutations,
    );
  }
  console.info("Focus Style Check: complete", {
    historyMutations: report.historyMutations.length,
    visibleStyleDifferences: report.styleDifferences.length,
    noVisibleDifference: report.noVisibleDifference.length,
    couldNotFocus: report.couldNotFocus.length,
    restorationFailures: report.restorationFailures.length,
  });
}
