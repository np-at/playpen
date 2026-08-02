/**
 * ARIA live-region semantics as pure functions.
 *
 * This module is bundled into the MonitorAriaLive bookmarklet via `?inlineTS`,
 * where every import inflates the resulting URL. Keeping the logic here (rather
 * than in the bookmarklet's side-effecting IIFE) also makes it unit testable.
 *
 * Everything computed here is an *approximation* of what a screen reader would
 * announce. Real assistive technology varies; see {@link Announcement.notes}.
 */

import { isElAriaHidden } from "./isElRendered.ts";

export type Politeness = "polite" | "assertive";
export type Relevant = "additions" | "removals" | "text";

/** Per ARIA: `aria-relevant` defaults to `additions text`. */
const DEFAULT_RELEVANT: readonly Relevant[] = ["additions", "text"];

const ALL_RELEVANT: readonly Relevant[] = ["additions", "removals", "text"];

interface ImplicitLive {
  politeness: Politeness | "off";
  atomic: boolean;
}

/**
 * ARIA 1.2 implicit values for the live region roles. `marquee` and `timer` are
 * live region roles whose implicit `aria-live` is `off` — they only announce
 * when the author opts in explicitly.
 */
const IMPLICIT_LIVE = new Map<string, ImplicitLive>([
  ["alert", { politeness: "assertive", atomic: true }],
  ["status", { politeness: "polite", atomic: true }],
  ["log", { politeness: "polite", atomic: false }],
  ["marquee", { politeness: "off", atomic: false }],
  ["timer", { politeness: "off", atomic: false }],
]);

/** Host elements whose implicit role is a live region role. */
const IMPLICIT_ROLE_BY_TAG = new Map<string, string>([["OUTPUT", "status"]]);

/** Never contributes text to an announcement. */
const NON_RENDERED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD", "TITLE"]);

export interface LiveContext {
  /** The nearest ancestor element that establishes the live region. */
  region: Element;
  politeness: Politeness;
  /** True when the region (or an ancestor) declares, or implies, `aria-atomic`. */
  atomic: boolean;
  relevant: ReadonlySet<Relevant>;
  /** `aria-busy` on the region or an ancestor — announcements are held back. */
  busy: boolean;
  /** Whether liveness came from an `aria-live` attribute or from a role. */
  source: "explicit" | "implicit";
  /** The live region role in play, when there is one (`alert`, `status`, …). */
  roleName: string | null;
}

export interface Announcement {
  /** Best-effort text a screen reader would speak. */
  message: string;
  politeness: Politeness;
  region: Element;
  /** Elements announced in full because of `aria-atomic`. */
  atomicRoots: Element[];
  /** Caveats worth showing the user; non-empty implies a shakier approximation. */
  notes: string[];
}

export interface AnnouncementOptions {
  /**
   * Set when the region element itself was inserted in this batch, already
   * populated. Screen readers disagree about whether that announces.
   */
  regionJustInserted?: boolean;
}

function firstToken(value: string | null): string {
  return value?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/**
 * The live region role for an element, or null. An explicit `role` overrides the
 * implicit one, so `<output role="presentation">` is not a live region.
 */
function liveRoleOf(el: Element): string | null {
  const explicit = firstToken(el.getAttribute("role"));
  if (explicit !== "") {
    return IMPLICIT_LIVE.has(explicit) ? explicit : null;
  }
  return IMPLICIT_ROLE_BY_TAG.get(el.tagName) ?? null;
}

/** Value of `name` on `el` or its nearest ancestor that sets it. */
function inheritedAttr(el: Element, name: string): string | null {
  let cur: Element | null = el;
  while (cur !== null) {
    const value = cur.getAttribute(name);
    if (value !== null && value.trim() !== "") return value.trim().toLowerCase();
    cur = cur.parentElement;
  }
  return null;
}

function parseRelevant(value: string | null): ReadonlySet<Relevant> {
  if (value === null) return new Set(DEFAULT_RELEVANT);
  const tokens = value.split(/\s+/);
  if (tokens.includes("all")) return new Set(ALL_RELEVANT);
  const parsed = tokens.filter((t): t is Relevant => (ALL_RELEVANT as readonly string[]).includes(t));
  // An entirely invalid value falls back to the default, per attribute-value rules.
  return parsed.length > 0 ? new Set(parsed) : new Set(DEFAULT_RELEVANT);
}

function buildContext(region: Element, politeness: Politeness, source: LiveContext["source"], roleName: string | null): LiveContext {
  const declaredAtomic = inheritedAttr(region, "aria-atomic");
  const implicitAtomic = roleName !== null && (IMPLICIT_LIVE.get(roleName)?.atomic ?? false);
  return {
    region,
    politeness,
    atomic: declaredAtomic !== null ? declaredAtomic === "true" : implicitAtomic,
    relevant: parseRelevant(inheritedAttr(region, "aria-relevant")),
    busy: inheritedAttr(region, "aria-busy") === "true",
    source,
    roleName,
  };
}

/**
 * Walk up from a changed node to the live region that owns it.
 *
 * Politeness is inherited, so the changed node itself need not carry any ARIA —
 * a text change deep inside a `role="status"` belongs to that status region.
 * Returns null when the nearest owning region is `aria-live="off"` (or an
 * implicitly-off role such as `timer`), which suppresses outer regions too.
 */
export function resolveLiveRegion(node: Node): LiveContext | null {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el !== null) {
    const explicit = el.getAttribute("aria-live")?.trim().toLowerCase() ?? "";
    if (explicit !== "") {
      if (explicit !== "polite" && explicit !== "assertive") return null;
      return buildContext(el, explicit, "explicit", liveRoleOf(el));
    }
    const role = liveRoleOf(el);
    if (role !== null) {
      const implicit = IMPLICIT_LIVE.get(role);
      if (implicit === undefined || implicit.politeness === "off") return null;
      return buildContext(el, implicit.politeness, "implicit", role);
    }
    el = el.parentElement;
  }
  return null;
}

function isHiddenForAT(el: Element): boolean {
  if (isElAriaHidden(el)) return true;
  if (el.hasAttribute("hidden")) return true;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style === undefined) return false;
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.visibility === "collapse" ||
    style.contentVisibility === "hidden"
  );
}

/**
 * The text of a subtree as it would be announced.
 *
 * Not an accessible *name* computation — deliberately so. `aria-api`'s `getName`
 * would resolve to `aria-label` when present, which is the region's label rather
 * than the content that gets spoken.
 */
export function liveRegionText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (NON_RENDERED_TAGS.has(el.tagName)) return "";
  if (isHiddenForAT(el)) return "";
  if (el instanceof HTMLImageElement) return el.alt;
  if (el instanceof HTMLInputElement) {
    return el.type === "submit" || el.type === "button" || el.type === "reset" ? el.value : "";
  }
  if (el.tagName === "BR") return " ";

  let out = "";
  for (const child of Array.from(el.childNodes)) {
    const text = liveRegionText(child);
    if (text === "") continue;
    // Block-level children are spoken as separate chunks, so they need a
    // boundary — without one, sibling rows run together as "row 1row 2".
    out += child.nodeType === Node.ELEMENT_NODE && isBlockLevel(child as Element) ? ` ${text} ` : text;
  }
  return out;
}

/** Tag fallback for when there is no layout to measure (detached subtrees). */
const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TD",
  "TH",
  "TR",
  "UL",
]);

function isBlockLevel(el: Element): boolean {
  const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? "";
  if (display === "") return BLOCK_TAGS.has(el.tagName);
  return !display.startsWith("inline") && display !== "contents" && display !== "none";
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The element announced in full for a change to `changed`: the nearest ancestor
 * up to and including the region with `aria-atomic="true"`, else the region
 * itself when the region is atomic, else null.
 */
function atomicRootFor(changed: Node, ctx: LiveContext): Element | null {
  let cur: Element | null = changed.nodeType === Node.ELEMENT_NODE ? (changed as Element) : changed.parentElement;
  while (cur !== null) {
    const declared = cur.getAttribute("aria-atomic");
    if (declared !== null && declared.trim() !== "") {
      return declared.trim().toLowerCase() === "true" ? cur : null;
    }
    if (cur === ctx.region) break;
    cur = cur.parentElement;
  }
  return ctx.atomic ? ctx.region : null;
}

/** The node a mutation record is "about", for atomic-root resolution. */
function changedNodeOf(record: MutationRecord): Node {
  return record.type === "characterData" ? (record.target.parentNode ?? record.target) : record.target;
}

/**
 * Reduce a batch of mutation records within one live region to the message that
 * would be spoken, or null when nothing would be.
 */
export function computeAnnouncement(
  ctx: LiveContext,
  records: readonly MutationRecord[],
  options: AnnouncementOptions = {},
): Announcement | null {
  const notes: string[] = [];
  if (ctx.busy) return null;

  const atomicRoots: Element[] = [];
  const parts: string[] = [];
  let sawIgnoredRemoval = false;
  let sawAddition = false;
  let sawAttributeOnly = records.length > 0;
  const justInserted = options.regionJustInserted === true;

  // A region that arrives already populated is itself an addition; its whole
  // content is the candidate announcement regardless of `aria-atomic`.
  if (justInserted) {
    sawAttributeOnly = false;
    if (ctx.relevant.has("additions")) parts.push(liveRegionText(ctx.region));
  }

  for (const record of records) {
    if (record.type !== "attributes") sawAttributeOnly = false;

    const root = atomicRootFor(changedNodeOf(record), ctx);
    if (root !== null) {
      if (!atomicRoots.includes(root)) atomicRoots.push(root);
      continue;
    }

    if (record.type === "characterData") {
      if (ctx.relevant.has("text")) parts.push(record.target.nodeValue ?? "");
      continue;
    }
    if (record.type === "childList") {
      if (ctx.relevant.has("additions")) {
        for (const added of Array.from(record.addedNodes)) parts.push(liveRegionText(added));
      }
      if (record.addedNodes.length > 0) sawAddition = true;
      if (record.removedNodes.length > 0) {
        if (ctx.relevant.has("removals")) {
          for (const removed of Array.from(record.removedNodes)) parts.push(liveRegionText(removed));
        } else {
          sawIgnoredRemoval = true;
        }
      }
    }
    // Attribute mutations do not themselves announce; they are surfaced in the
    // entry's detail view instead.
  }

  if (atomicRoots.length === 0 && sawAttributeOnly) return null;

  const pieces = [...atomicRoots.map((el) => liveRegionText(el)), ...parts].map(normalizeText).filter((p) => p !== "");

  // Collapse consecutive duplicates — an atomic root plus its own child change.
  const deduped = pieces.filter((p, i) => p !== pieces[i - 1]);
  const message = deduped.join(" ");
  if (message === "") return null;

  if (atomicRoots.length > 0) {
    const insideRegion = atomicRoots.some((el) => el !== ctx.region);
    notes.push(
      insideRegion ? "aria-atomic: a subtree inside the region is announced in full" : "aria-atomic: region announced in full",
    );
  }
  // Only worth flagging when content actually disappeared. A `textContent`
  // write removes and re-adds in the same batch, and calling that a dropped
  // removal is noise.
  if (sawIgnoredRemoval && !sawAddition) {
    notes.push("Removals ignored — aria-relevant does not include 'removals'");
  }
  if (ctx.relevant.has("removals")) {
    notes.push("Includes removed content; most screen readers do not announce removals");
  }
  if (options.regionJustInserted === true) {
    notes.push("Region was inserted already populated — screen readers disagree about whether this announces");
  }

  return { message, politeness: ctx.politeness, region: ctx.region, atomicRoots, notes };
}
