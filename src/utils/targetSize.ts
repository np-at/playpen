import { isToolNode } from "./bookmarkletLifecycle.ts";
import { collectSelectorRoots } from "./finder.ts";
import { composedContains } from "./focusObscured.ts";
import { isElRendered, renderedParent } from "./isElRendered.ts";
import { isInert } from "./tabOrder.ts";

export type TargetStatus = "pass" | "pass-spacing" | "fail" | "exempt" | "verify" | "not-target";
type TargetReason = "inline" | "ua-control" | "transformed" | "overlapped";
export type TargetResult = {
  el: Element;
  status: TargetStatus;
  reason?: TargetReason;
  /** Side of the largest square that fits inside the target. */
  size: number;
  /** The element that was measured: the control or its largest label. Its box is where the spacing circle sits. */
  member: Element;
  conflict?: Element;
};

type Measured = {
  el: Element;
  members: Element[];
  member: Element;
  /** Every line box of every member: what other targets' circles must not touch. */
  rects: DOMRect[];
  box: DOMRect;
  size: number;
  notTarget: boolean;
  transformed: boolean;
  exempt?: "inline" | "ua-control";
};

const SPACING = 24;
const EPS = 0.01;
const ROLES = [
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "slider",
  "treeitem",
  "combobox",
  "textbox",
  "searchbox",
  "spinbutton",
];
// ponytail: click handlers on non-interactive elements and generic tabindex containers are not targets;
// <area> is never rendered (display:none) so image maps are skipped.
const TARGET_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "summary",
  ...ROLES.map((role) => `[role="${role}"]`),
].join(",");

function findTargets(doc: Document): Element[] {
  // ponytail: iframe documents are skipped; their rects are in another coordinate space.
  const roots = collectSelectorRoots(doc).visited.filter(
    (root) => root === doc || (root instanceof ShadowRoot && root.host.ownerDocument === doc),
  );
  const found = new Set<Element>();
  for (const root of roots) {
    for (const el of root.querySelectorAll(TARGET_SELECTOR)) {
      if (!el.matches(":disabled") && !isInert(el) && !isToolNode(el) && isElRendered(el)) found.add(el);
    }
  }
  return [...found];
}

function isHiddenFromPointer(el: Element): boolean {
  const box = el.getBoundingClientRect();
  const view = el.ownerDocument.defaultView;
  if (box.width <= 1 || box.height <= 1) return true;
  if (view !== null && (box.right + view.scrollX <= 0 || box.bottom + view.scrollY <= 0)) return true;
  return /rect\(0px,? 0px,? 0px,? 0px\)/.test(getComputedStyle(el).getPropertyValue("clip"));
}

/** Largest square that fits inside `el`, allowing for rounded corners and line wrapping. */
function inscribedSquare(el: Element): number {
  const rects = Array.from(el.getClientRects());
  const box = el.getBoundingClientRect();
  // A wrapped inline target is measured as if it were on one line.
  const w = rects.length > 1 ? rects.reduce((sum, r) => sum + r.width, 0) : box.width;
  const h = rects.length > 1 ? Math.max(...rects.map((r) => r.height)) : box.height;
  const short = Math.min(w, h);
  const style = getComputedStyle(el);
  const radius = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius]
    .flatMap((value) => value.split(" "))
    .map((token) => (token.endsWith("%") ? (parseFloat(token) * short) / 100 : parseFloat(token)))
    .reduce((max, r) => (Number.isFinite(r) ? Math.max(max, r) : max), 0);
  // A square of side s centred in the box clears a corner arc of radius r when s <= short - (2 - √2)·r.
  return short - (2 - Math.SQRT2) * Math.min(radius, short / 2);
}

function isTransformed(el: Element): boolean {
  for (let cur: Element | null = el; cur !== null && cur.ownerDocument === el.ownerDocument; cur = renderedParent(cur)) {
    const style = getComputedStyle(cur);
    if (style.rotate !== "none" || style.scale !== "none") return true;
    if (style.transform === "none") continue;
    const m = new DOMMatrixReadOnly(style.transform);
    if (Math.abs(m.a - 1) > EPS || Math.abs(m.d - 1) > EPS || Math.abs(m.b) > EPS || Math.abs(m.c) > EPS) return true;
  }
  return false;
}

const uaDefaultSizes = new Map<string, [number, number]>();
function uaDefaultSize(doc: Document, type: string): [number, number] {
  const cached = uaDefaultSizes.get(type);
  if (cached !== undefined) return cached;
  const probe = doc.createElement("input");
  probe.type = type;
  doc.body.appendChild(probe);
  const { width, height } = probe.getBoundingClientRect();
  probe.remove();
  uaDefaultSizes.set(type, [width, height]);
  return [width, height];
}

function exemptReason(el: Element): Measured["exempt"] {
  // ponytail: only checkbox/radio are compared to the UA default; other native controls are measured normally.
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const { width, height } = el.getBoundingClientRect();
    const [dw, dh] = uaDefaultSize(el.ownerDocument, el.type);
    if (getComputedStyle(el).appearance !== "none" && Math.abs(width - dw) < 0.5 && Math.abs(height - dh) < 0.5) return "ua-control";
  }
  // ponytail: "in a sentence" is approximated as "the enclosing block has words outside any target".
  if (getComputedStyle(el).display === "inline") {
    let block: Element | null = renderedParent(el);
    while (block !== null && ["inline", "contents"].includes(getComputedStyle(block).display)) block = renderedParent(block);
    if (block !== null) {
      const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let outside = "";
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if (node.parentElement?.closest(TARGET_SELECTOR) == null) outside += ` ${node.textContent ?? ""}`;
      }
      if (/\p{L}{2,}/u.test(outside)) return "inline";
    }
  }
  return undefined;
}

function measure(el: Element): Measured {
  const labels = "labels" in el && el.labels instanceof NodeList ? Array.from(el.labels as NodeListOf<HTMLLabelElement>) : [];
  const members = [el, ...labels.filter((label) => isElRendered(label))];
  const visible = members.filter((member) => !isHiddenFromPointer(member));
  const sized = visible.map((member) => ({ member, size: inscribedSquare(member) })).sort((a, b) => b.size - a.size);
  const best = sized.at(0);
  return {
    el,
    members,
    rects: visible.flatMap((member) => Array.from(member.getClientRects())),
    member: best?.member ?? el,
    box: (best?.member ?? el).getBoundingClientRect(),
    size: best?.size ?? 0,
    notTarget: best === undefined,
    transformed: isTransformed(el),
    exempt: exemptReason(el),
  };
}

const center = (r: DOMRect): [number, number] => [r.left + r.width / 2, r.top + r.height / 2];

function distanceToRect([x, y]: [number, number], r: DOMRect): number {
  return Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
}

const intersects = (a: DOMRect, b: DOMRect): boolean =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPS && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > EPS;

const related = (a: Measured, b: Measured): boolean =>
  a.members.some((x) => b.members.some((y) => composedContains(x, y) || composedContains(y, x)));

function evaluate(t: Measured, all: Measured[], min: number): Omit<TargetResult, "el" | "size" | "member"> {
  if (t.notTarget) return { status: "not-target" };
  const others = all.filter((o) => o !== t && !o.notTarget);
  if (t.transformed) return { status: "verify", reason: "transformed" };
  // "the overlapping area should not be included in the measurement" — flag rather than subtract.
  const overlap = others.find((o) => !related(t, o) && t.rects.some((a) => o.rects.some((b) => intersects(a, b))));
  if (overlap !== undefined) return { status: "verify", reason: "overlapped", conflict: overlap.el };
  if (t.size >= min - EPS) return { status: "pass" };
  if (t.exempt !== undefined) return { status: "exempt", reason: t.exempt };
  if (min > SPACING) return { status: "fail" }; // 2.5.5 has no spacing exception.

  // Spacing: a 24px circle centred on the target must not touch another target, or another undersized target's circle.
  const c = center(t.box);
  const conflict = others.find(
    (o) =>
      o.rects.some((r) => distanceToRect(c, r) < SPACING / 2 - EPS) ||
      (o.size < SPACING - EPS && Math.hypot(c[0] - center(o.box)[0], c[1] - center(o.box)[1]) < SPACING - EPS),
  );
  return conflict === undefined ? { status: "pass-spacing" } : { status: "fail", conflict: conflict.el };
}

/**
 * WCAG 2.5.8 (min 24) / 2.5.5 (min 44) target size check for every pointer target in `doc`.
 * ponytail: the "equivalent control" and "essential" exceptions are left to the tester.
 */
export function scanTargets(doc: Document, min: 24 | 44): TargetResult[] {
  const measured = findTargets(doc).map(measure);
  return measured.map((t) => ({ el: t.el, size: t.size, member: t.member, ...evaluate(t, measured, min) }));
}
