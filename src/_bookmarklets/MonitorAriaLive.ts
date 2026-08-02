/**
 * Aria-live monitor.
 *
 * Shows a sighted tester what a screen reader would announce from a page's live
 * regions: the effective message, its politeness, and the region's before/after
 * state. Semantics live in `../utils/ariaLive.ts` so they can be unit tested;
 * this file is observation, UI, and the opt-in page interventions.
 *
 * Two design rules hold the thing together:
 *
 * 1. A single MutationObserver per root, rather than one per region. Regions
 *    created after activation are then caught for free, and there is no
 *    observer bookkeeping to leak.
 * 2. The entire UI lives in a closed shadow root on one host element. Mutation
 *    observers do not cross shadow boundaries, so the monitor cannot observe
 *    itself — which is what makes rule 1 safe, and what keeps the tool out of
 *    the page it is measuring.
 */
import {
  computeAnnouncement,
  liveRegionText,
  normalizeText,
  resolveLiveRegion,
  type Announcement,
  type LiveContext,
} from "../utils/ariaLive.ts";
import { findSelector, type SelectorResult } from "../utils/finder.ts";
import { isElRendered } from "../utils/isElRendered.ts";
import { applyToShadows } from "../utils/applyToShadows.ts";

const HOST_ID = "aria-live-monitor-host";
const MAX_ENTRIES = 200;

/** Superset filter for "might be a live region"; ariaLive.ts makes the real call. */
const LIVE_SELECTOR = '[aria-live],[role~="alert"],[role~="status"],[role~="log"],[role~="marquee"],[role~="timer"],output';

/** Captured before any freeze hooks are installed, so the monitor never defers itself. */
const nativeTimers = {
  setTimeout: window.setTimeout.bind(window),
  setInterval: window.setInterval.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
};

// ---------------------------------------------------------------------------
// Toggle: re-running the bookmarklet on a page that already has it tears it down
// ---------------------------------------------------------------------------

const existingHost = document.getElementById(HOST_ID);
if (existingHost) {
  existingHost.dispatchEvent(new CustomEvent("aria-live-monitor:close"));
} else {
  start();
}

function start(): void {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const observers: MutationObserver[] = [];
  const listeners = new AbortController();
  /** Text of each region as of the end of the last batch — the next "before". */
  const textSnapshots = new WeakMap<Element, string>();
  /** Markup of each region, used to replay an announcement. */
  const htmlSnapshots = new WeakMap<Element, string>();
  /** Regions muted from the panel, with the attribute values to put back. */
  const muted = new Map<Element, string | null>();
  /** Keeps the exact document or shadow root needed to resolve each displayed selector. */
  const selectorContexts = new WeakMap<HTMLElement, SelectorResult>();

  let capturing = true;
  let pauseOnAnnounce = false;
  let showPolite = true;
  let showAssertive = true;
  /** Set while the monitor itself edits the page, so it ignores its own work. */
  let selfMutating = false;
  let pendingRecords: MutationRecord[] = [];
  let frameHandle: number | null = null;
  let entryCount = 0;
  /** Roots we could not reach, surfaced in the panel so absence is not read as silence. */
  const skipped: string[] = [];

  /** Run a page edit the monitor makes on purpose without observing it. */
  function withoutObserving(fn: () => void): void {
    selfMutating = true;
    try {
      fn();
    } finally {
      // Records already queued for this microtask still have to be discarded.
      for (const observer of observers) observer.takeRecords();
      selfMutating = false;
    }
  }

  // -------------------------------------------------------------------------
  // UI shell — closed shadow root, invisible to the page and to our observers
  // -------------------------------------------------------------------------

  const host = document.createElement("div");
  host.id = HOST_ID;
  // Hidden from assistive tech: the monitor must not add to the a11y tree of
  // the page it is measuring.
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.appendChild(makeStyle());

  const highlight = document.createElement("div");
  highlight.className = "alm-highlight";
  shadow.appendChild(highlight);

  const panel = document.createElement("div");
  panel.className = "alm-panel";
  shadow.appendChild(panel);

  const list = document.createElement("div");
  list.className = "alm-list";

  const freezeBar = document.createElement("div");
  freezeBar.className = "alm-freezebar";
  freezeBar.hidden = true;

  document.body.appendChild(host);

  // -------------------------------------------------------------------------
  // Observation
  // -------------------------------------------------------------------------

  function observeRoot(root: Document | ShadowRoot): void {
    const target = root instanceof Document ? root.documentElement : root;
    const observer = new MutationObserver(onMutations);
    observer.observe(target, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      characterDataOldValue: true,
      attributeOldValue: true,
    });
    observers.push(observer);
    for (const region of Array.from(root.querySelectorAll(LIVE_SELECTOR))) seedSnapshot(region);
  }

  function seedSnapshot(region: Element): void {
    if (!textSnapshots.has(region)) textSnapshots.set(region, normalizeText(liveRegionText(region)));
    htmlSnapshots.set(region, region.innerHTML);
  }

  function attachToDocument(doc: Document): void {
    observeRoot(doc);
    applyToShadows(doc, (root) => {
      observeRoot(root);
    });
    for (const frame of Array.from(doc.querySelectorAll("iframe"))) {
      // Cross-origin access throws; there is nothing to monitor in that case.
      const inner = ((): Document | null => {
        try {
          return frame.contentDocument;
        } catch {
          return null;
        }
      })();
      if (inner) attachToDocument(inner);
      else skipped.push("cross-origin iframe");
    }
  }

  attachToDocument(document);
  // Built after the scan so the caveat can mention what could not be reached.
  panel.append(makeHeader(), freezeBar, list);

  function onMutations(records: MutationRecord[]): void {
    if (selfMutating || !capturing) return;
    for (const record of records) {
      if (record.target === host || host.contains(record.target)) continue;
      pendingRecords.push(record);
    }
    if (pendingRecords.length > 0 && frameHandle === null) {
      frameHandle = nativeTimers.requestAnimationFrame(flush);
    }
  }

  interface Group {
    ctx: LiveContext;
    records: MutationRecord[];
    justInserted: boolean;
  }

  /**
   * Coalesce a frame's worth of records into at most one announcement per
   * region — which is roughly how a screen reader treats them, and what keeps
   * the panel readable on a busy page.
   */
  function flush(): void {
    frameHandle = null;
    const records = pendingRecords;
    pendingRecords = [];

    const groups = new Map<Element, Group>();
    const add = (ctx: LiveContext, record: MutationRecord | null, justInserted: boolean): void => {
      const existing = groups.get(ctx.region);
      if (existing) {
        if (record) existing.records.push(record);
        existing.justInserted ||= justInserted;
        return;
      }
      groups.set(ctx.region, { ctx, records: record ? [record] : [], justInserted });
    };

    for (const record of records) {
      if (record.type === "childList") {
        for (const added of Array.from(record.addedNodes)) {
          if (!(added instanceof Element)) continue;
          // A region can arrive with the insertion rather than be mutated in
          // place — the `role="alert"` toast pattern. Its owner is the new
          // subtree, not the ancestor the record points at.
          for (const candidate of [added, ...Array.from(added.querySelectorAll(LIVE_SELECTOR))]) {
            const ctx = resolveLiveRegion(candidate);
            if (ctx && added.contains(ctx.region)) add(ctx, null, true);
          }
          // Newly attached shadow roots need their own observer.
          for (const el of [added, ...Array.from(added.querySelectorAll("*"))]) {
            if (!el.shadowRoot) continue;
            observeRoot(el.shadowRoot);
            applyToShadows(el.shadowRoot, (root) => {
              observeRoot(root);
            });
          }
        }
      }
      const ctx = resolveLiveRegion(record.target);
      if (ctx) add(ctx, record, false);
    }

    for (const group of groups.values()) report(group);
  }

  function report(group: Group): void {
    const { ctx, records, justInserted } = group;
    const region = ctx.region;
    if (muted.has(region)) return;

    // aria-busy and hidden regions do not announce, but "why didn't this
    // announce?" is the question the tool exists to answer — so compute the
    // message anyway and label it suppressed.
    let suppressed: string | null = null;
    if (ctx.busy) suppressed = "held by aria-busy";
    else if (!isRendered(region)) suppressed = "region is not rendered";

    const probe: LiveContext = suppressed === null ? ctx : { ...ctx, busy: false };
    const announcement = computeAnnouncement(probe, records, { regionJustInserted: justInserted });

    const before = textSnapshots.get(region) ?? "";
    const after = normalizeText(liveRegionText(region));
    textSnapshots.set(region, after);
    htmlSnapshots.set(region, region.innerHTML);

    if (!announcement) return;
    addEntry(announcement, ctx, before, after, suppressed);
  }

  function isRendered(region: Element): boolean {
    if (!(region instanceof HTMLElement)) return true;
    try {
      return isElRendered(region);
    } catch {
      return true;
    }
  }

  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------

  function addEntry(announcement: Announcement, ctx: LiveContext, before: string, after: string, suppressed: string | null): void {
    if (announcement.politeness === "polite" && !showPolite) return;
    if (announcement.politeness === "assertive" && !showAssertive) return;

    const entry = document.createElement("div");
    entry.className = `alm-entry alm-${announcement.politeness}` + (suppressed !== null ? " alm-suppressed" : "");

    const head = document.createElement("div");
    head.className = "alm-entry-head";
    const selector = selectorFor(ctx.region);
    const selectorSpan = span("alm-sel", selectorText(selector));
    selectorContexts.set(selectorSpan, selector);
    head.append(
      span("alm-time", new Date().toLocaleTimeString()),
      span("alm-badge", announcement.politeness),
      span("alm-role", ctx.source === "implicit" ? `role=${ctx.roleName ?? "?"}` : "aria-live"),
      selectorSpan,
    );
    entry.appendChild(head);

    if (suppressed !== null) entry.appendChild(span("alm-suppressed-note", `Not announced — ${suppressed}`));

    const message = document.createElement("div");
    message.className = "alm-message";
    message.textContent = announcement.message;
    entry.appendChild(message);

    for (const note of announcement.notes) entry.appendChild(span("alm-note", note));

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "before / after";
    details.append(summary, renderDiff(before, after));
    entry.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "alm-actions";
    actions.append(
      button("Highlight", () => {
        showHighlight(ctx.region);
      }),
      button("Copy", () => {
        void navigator.clipboard.writeText(announcement.message);
      }),
      button("Replay", () => {
        replay(ctx.region);
      }),
      muteButton(ctx.region),
    );
    entry.appendChild(actions);

    entry.addEventListener("mouseenter", () => {
      showHighlight(ctx.region);
    });

    list.insertBefore(entry, list.firstChild);
    entryCount += 1;
    while (entryCount > MAX_ENTRIES && list.lastElementChild) {
      list.lastElementChild.remove();
      entryCount -= 1;
    }

    if (pauseOnAnnounce && suppressed === null) freeze();
  }

  function selectorFor(el: Element): SelectorResult {
    return findSelector(el);
  }

  function selectorText(result: SelectorResult): string {
    return result.supported ? result.selector : `[unsupported selector: ${result.reason}]`;
  }

  /** Before/after with the changed span marked, via common prefix and suffix. */
  function renderDiff(before: string, after: string): HTMLElement {
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
    let end = 0;
    while (end < before.length - start && end < after.length - start && before.at(-1 - end) === after.at(-1 - end)) end += 1;

    const wrap = document.createElement("div");
    wrap.className = "alm-diff";
    wrap.append(diffRow("before", before, start, before.length - end), diffRow("after", after, start, after.length - end));
    return wrap;
  }

  function diffRow(label: string, text: string, from: number, to: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "alm-diff-row";
    row.appendChild(span("alm-diff-label", label));
    const body = document.createElement("span");
    body.append(document.createTextNode(text.slice(0, from)));
    if (to > from) {
      const mark = document.createElement("mark");
      mark.textContent = text.slice(from, to);
      body.appendChild(mark);
    }
    body.append(document.createTextNode(text.slice(to)));
    row.appendChild(body);
    return row;
  }

  function showHighlight(region: Element): void {
    const rect = region.getBoundingClientRect();
    highlight.style.cssText =
      `position:fixed;pointer-events:none;border:2px solid #ff3b30;box-shadow:0 0 0 4px rgba(255,59,48,.25);` +
      `top:${rect.top.toString()}px;left:${rect.left.toString()}px;width:${rect.width.toString()}px;height:${rect.height.toString()}px;`;
    highlight.classList.remove("alm-flash");
    // Re-add on the next frame so the animation restarts rather than continuing.
    nativeTimers.requestAnimationFrame(() => {
      highlight.classList.add("alm-flash");
    });
  }

  // -------------------------------------------------------------------------
  // Interventions — each one visibly edits the page, and each one is reverted
  // -------------------------------------------------------------------------

  function muteButton(region: Element): HTMLButtonElement {
    const btn = button("Mute", () => {
      if (muted.has(region)) {
        const original = muted.get(region) ?? null;
        withoutObserving(() => {
          if (original === null) region.removeAttribute("aria-live");
          else region.setAttribute("aria-live", original);
        });
        muted.delete(region);
        btn.textContent = "Mute";
      } else {
        muted.set(region, region.getAttribute("aria-live"));
        withoutObserving(() => {
          region.setAttribute("aria-live", "off");
        });
        btn.textContent = "Unmute";
      }
    });
    if (muted.has(region)) btn.textContent = "Unmute";
    return btn;
  }

  /**
   * Re-trigger a region by clearing and restoring its markup. Deliberately not
   * wrapped in `withoutObserving` — seeing the replayed announcement come back
   * through the pipeline is the point.
   */
  function replay(region: Element): void {
    const html = htmlSnapshots.get(region);
    if (html === undefined) return;
    region.innerHTML = "";
    nativeTimers.setTimeout(() => {
      region.innerHTML = html;
    }, 50);
  }

  // --- freeze ---------------------------------------------------------------

  interface Deferred {
    run: () => void;
  }
  const deferred = new Map<number, Deferred>();
  let deferredId = -1;
  let frozen = false;
  let freezeStyle: HTMLStyleElement | null = null;
  let resumedMedia: HTMLMediaElement[] = [];
  let hooksInstalled = false;

  function installFreezeHooks(): void {
    if (hooksInstalled) return;
    hooksInstalled = true;
    const patchedTimeout = (handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      if (!frozen || typeof handler !== "function") return nativeTimers.setTimeout(handler, timeout, ...args);
      const id = deferredId--;
      const callback = handler as (...callbackArgs: unknown[]) => void;
      deferred.set(id, {
        run: () => {
          callback(...args);
        },
      });
      return id;
    };
    const patchedInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      if (!frozen || typeof handler !== "function") return nativeTimers.setInterval(handler, timeout, ...args);
      const id = deferredId--;
      deferred.set(id, {
        run: () => {
          nativeTimers.setInterval(handler, timeout, ...args);
        },
      });
      return id;
    };
    const patchedRAF = (callback: FrameRequestCallback): number => {
      if (!frozen) return nativeTimers.requestAnimationFrame(callback);
      const id = deferredId--;
      deferred.set(id, {
        run: () => {
          nativeTimers.requestAnimationFrame(callback);
        },
      });
      return id;
    };
    const patchedClear = (id?: number): void => {
      if (id !== undefined && id < 0) deferred.delete(id);
      else nativeTimers.clearTimeout(id);
    };

    window.setTimeout = patchedTimeout as typeof window.setTimeout;
    window.setInterval = patchedInterval as typeof window.setInterval;
    window.requestAnimationFrame = patchedRAF;
    // Cast past @types/node's extra `Timeout` overloads on clearTimeout/clearInterval.
    window.clearTimeout = patchedClear as typeof window.clearTimeout;
    window.clearInterval = patchedClear as typeof window.clearInterval;
    window.cancelAnimationFrame = patchedClear;
  }

  function removeFreezeHooks(): void {
    if (!hooksInstalled) return;
    hooksInstalled = false;
    window.setTimeout = nativeTimers.setTimeout;
    window.setInterval = nativeTimers.setInterval;
    window.clearTimeout = nativeTimers.clearTimeout;
    window.clearInterval = nativeTimers.clearTimeout;
    window.requestAnimationFrame = nativeTimers.requestAnimationFrame;
    window.cancelAnimationFrame = nativeTimers.cancelAnimationFrame;
  }

  function freeze(): void {
    if (frozen) return;
    frozen = true;
    installFreezeHooks();
    withoutObserving(() => {
      freezeStyle = document.createElement("style");
      freezeStyle.textContent = `*,*::before,*::after{animation-play-state:paused!important;transition:none!important}`;
      document.head.appendChild(freezeStyle);
    });
    for (const media of Array.from(document.querySelectorAll("video,audio"))) {
      if (!(media instanceof HTMLMediaElement) || media.paused) continue;
      media.pause();
      resumedMedia.push(media);
    }
    freezeBar.hidden = false;
  }

  function unfreeze(): void {
    if (!frozen) return;
    frozen = false;
    withoutObserving(() => {
      freezeStyle?.remove();
      freezeStyle = null;
    });
    for (const media of resumedMedia) void media.play().catch(() => undefined);
    resumedMedia = [];
    freezeBar.hidden = true;
    const queued = Array.from(deferred.values());
    deferred.clear();
    for (const item of queued) item.run();
    if (!pauseOnAnnounce) removeFreezeHooks();
  }

  // -------------------------------------------------------------------------
  // Header and freeze bar
  // -------------------------------------------------------------------------

  function makeHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "alm-header";

    const title = document.createElement("strong");
    title.textContent = "aria-live monitor";
    header.appendChild(title);

    const captureBtn = button("Pause capture", () => {
      capturing = !capturing;
      captureBtn.textContent = capturing ? "Pause capture" : "Resume capture";
    });
    header.append(
      captureBtn,
      button("Clear", () => {
        list.replaceChildren();
        entryCount = 0;
      }),
      toggle("polite", showPolite, (on) => {
        showPolite = on;
      }),
      toggle("assertive", showAssertive, (on) => {
        showAssertive = on;
      }),
      toggle("pause page on announce", pauseOnAnnounce, (on) => {
        pauseOnAnnounce = on;
        if (on) installFreezeHooks();
        else if (!frozen) removeFreezeHooks();
      }),
      button("Close", close),
    );

    const caveat = document.createElement("div");
    caveat.className = "alm-caveat";
    caveat.textContent =
      "Messages are an approximation; real screen readers differ. Closed shadow roots" +
      (skipped.length > 0 ? " and cross-origin iframes" : "") +
      " cannot be observed.";
    header.appendChild(caveat);
    return header;
  }

  freezeBar.append(
    span("alm-freeze-label", "Page frozen at this announcement — timers, rAF, CSS animations and media are held."),
    button("Step", unfreeze),
    button("Resume", () => {
      pauseOnAnnounce = false;
      unfreeze();
      removeFreezeHooks();
    }),
  );

  // -------------------------------------------------------------------------
  // Teardown — observers, listeners, and every page edit we made
  // -------------------------------------------------------------------------

  function close(): void {
    for (const observer of observers) observer.disconnect();
    observers.length = 0;
    if (frameHandle !== null) nativeTimers.cancelAnimationFrame(frameHandle);
    pauseOnAnnounce = false;
    unfreeze();
    removeFreezeHooks();
    for (const [region, original] of muted) {
      if (original === null) region.removeAttribute("aria-live");
      else region.setAttribute("aria-live", original);
    }
    muted.clear();
    listeners.abort();
    host.remove();
  }

  host.addEventListener("aria-live-monitor:close", close, { signal: listeners.signal });
  document.addEventListener(
    "keyup",
    (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    },
    { signal: listeners.signal },
  );

  // -------------------------------------------------------------------------
  // Small DOM helpers — everything is built with textContent, never innerHTML,
  // because entry content is page-derived
  // -------------------------------------------------------------------------

  function span(className: string, text: string): HTMLSpanElement {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  }

  function button(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick, { signal: listeners.signal });
    return btn;
  }

  function toggle(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLLabelElement {
    const wrap = document.createElement("label");
    wrap.className = "alm-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = initial;
    input.addEventListener(
      "change",
      () => {
        onChange(input.checked);
      },
      { signal: listeners.signal },
    );
    wrap.append(input, document.createTextNode(label));
    return wrap;
  }
}

function makeStyle(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
:host { all: initial; }
.alm-panel {
  pointer-events: auto;
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(430px, 40vw);
  display: flex; flex-direction: column;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #e8e8ea; background: #16161a; border-left: 1px solid #34343c;
  box-shadow: -8px 0 30px rgba(0,0,0,.35);
}
.alm-header { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; border-bottom: 1px solid #34343c; }
.alm-caveat { flex-basis: 100%; color: #8b8b96; font-size: 11px; }
button { font: inherit; color: #e8e8ea; background: #2a2a32; border: 1px solid #44444f; border-radius: 4px; padding: 2px 7px; cursor: pointer; }
button:hover { background: #35353f; }
.alm-toggle { display: inline-flex; align-items: center; gap: 3px; color: #b9b9c4; cursor: pointer; }
.alm-list { overflow-y: auto; flex: 1; }
.alm-entry { padding: 8px; border-bottom: 1px solid #26262d; border-left: 3px solid #4a90d9; }
.alm-assertive { border-left-color: #ff6b5e; }
.alm-suppressed { opacity: .65; border-left-style: dashed; }
.alm-entry-head { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: #8b8b96; }
.alm-badge { text-transform: uppercase; letter-spacing: .04em; font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #24405c; color: #cfe4fa; }
.alm-assertive .alm-badge { background: #5c2724; color: #ffd9d5; }
.alm-sel { color: #79c0a0; word-break: break-all; }
.alm-message { margin: 6px 0; font-size: 13px; color: #fff; white-space: pre-wrap; word-break: break-word; }
.alm-note, .alm-suppressed-note { display: block; color: #d8b46a; font-size: 11px; }
.alm-suppressed-note { color: #ff9c8f; }
summary { cursor: pointer; color: #8b8b96; }
.alm-diff { margin: 4px 0 0 0; }
.alm-diff-row { display: flex; gap: 6px; padding: 2px 0; word-break: break-word; }
.alm-diff-label { flex: 0 0 44px; color: #8b8b96; }
mark { background: #6b5d1f; color: #fff5cc; }
.alm-actions { display: flex; gap: 5px; margin-top: 6px; }
.alm-freezebar[hidden] { display: none; }
.alm-freezebar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; background: #4a3410; border-bottom: 1px solid #34343c; }
.alm-freeze-label { flex-basis: 100%; color: #ffd9a0; }
.alm-highlight { position: fixed; pointer-events: none; opacity: 0; }
.alm-flash { animation: alm-flash 1.6s ease-out forwards; }
@keyframes alm-flash { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
`;
  return style;
}
