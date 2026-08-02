import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeAnnouncement, liveRegionText, normalizeText, resolveLiveRegion, type LiveContext } from "./ariaLive.ts";

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  host.remove();
});

/** Render markup into the live document — these functions read computed style. */
function mount(markup: string): HTMLElement {
  host.innerHTML = markup;
  const first = host.firstElementChild;
  if (!(first instanceof HTMLElement)) throw new Error("markup produced no element");
  return first;
}

/**
 * Collect the records a batch of DOM edits produces, the way the observer sees
 * them. Drained synchronously — yielding to a microtask would let the
 * observer's own callback consume the queue first.
 */
function record(target: Node, mutate: () => void): MutationRecord[] {
  const observer = new MutationObserver(() => {
    /* records are drained manually below */
  });
  observer.observe(target, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    characterDataOldValue: true,
    attributeOldValue: true,
  });
  mutate();
  const records = observer.takeRecords();
  observer.disconnect();
  return records;
}

/** Query within the mounted markup, asserting the result exists. */
function q(root: ParentNode, selector: string): Element {
  const found = root.querySelector(selector);
  if (found === null) throw new Error(`no match for ${selector}`);
  return found;
}

/** First child node of an element, asserted. */
function firstChild(el: Element): Node {
  const node = el.firstChild;
  if (node === null) throw new Error("element has no child nodes");
  return node;
}

function contextFor(node: Node): LiveContext {
  const ctx = resolveLiveRegion(node);
  if (ctx === null) throw new Error("expected a live region");
  return ctx;
}

describe("resolveLiveRegion", () => {
  it("resolves an explicit aria-live region", () => {
    const el = mount(`<div aria-live="polite"><span>hi</span></div>`);
    const ctx = contextFor(q(el, "span"));
    expect(ctx.region).toBe(el);
    expect(ctx.politeness).toBe("polite");
    expect(ctx.source).toBe("explicit");
  });

  it("inherits politeness from an ancestor region, not the changed node", () => {
    const el = mount(`<div aria-live="assertive"><p><b>deep</b></p></div>`);
    const ctx = contextFor(firstChild(q(el, "b")));
    expect(ctx.region).toBe(el);
    expect(ctx.politeness).toBe("assertive");
  });

  it("treats role=alert as assertive and atomic", () => {
    const el = mount(`<div role="alert">boom</div>`);
    const ctx = contextFor(el);
    expect(ctx.politeness).toBe("assertive");
    expect(ctx.atomic).toBe(true);
    expect(ctx.source).toBe("implicit");
    expect(ctx.roleName).toBe("alert");
  });

  it("treats role=status as polite and atomic, and role=log as polite and non-atomic", () => {
    const status = contextFor(mount(`<div role="status">ok</div>`));
    expect(status.politeness).toBe("polite");
    expect(status.atomic).toBe(true);

    const log = contextFor(mount(`<div role="log">ok</div>`));
    expect(log.politeness).toBe("polite");
    expect(log.atomic).toBe(false);
  });

  it("treats <output> as an implicit status region", () => {
    const ctx = contextFor(mount(`<output>42</output>`));
    expect(ctx.politeness).toBe("polite");
    expect(ctx.atomic).toBe(true);
  });

  it("does not treat role=marquee or role=timer as live without an explicit aria-live", () => {
    expect(resolveLiveRegion(mount(`<div role="marquee">x</div>`))).toBeNull();
    expect(resolveLiveRegion(mount(`<div role="timer">x</div>`))).toBeNull();
    expect(contextFor(mount(`<div role="timer" aria-live="polite">x</div>`)).politeness).toBe("polite");
  });

  it("returns null for aria-live=off, including inside an outer polite region", () => {
    expect(resolveLiveRegion(mount(`<div aria-live="off">x</div>`))).toBeNull();
    const nested = mount(`<div aria-live="polite"><div aria-live="off"><span>x</span></div></div>`);
    expect(resolveLiveRegion(q(nested, "span"))).toBeNull();
  });

  it("picks the nearest region when regions nest", () => {
    const el = mount(`<div aria-live="polite"><div role="alert"><span>x</span></div></div>`);
    const ctx = contextFor(q(el, "span"));
    expect(ctx.politeness).toBe("assertive");
    expect(ctx.region).toBe(el.querySelector("[role=alert]"));
  });

  it("lets an explicit role override the implicit one", () => {
    expect(resolveLiveRegion(mount(`<output role="presentation">42</output>`))).toBeNull();
  });

  it("lets an explicit aria-live override the role's implicit politeness", () => {
    expect(contextFor(mount(`<div role="alert" aria-live="polite">x</div>`)).politeness).toBe("polite");
  });

  it("returns null outside any live region", () => {
    expect(resolveLiveRegion(mount(`<div><span>x</span></div>`))).toBeNull();
  });

  it("defaults aria-relevant to additions + text", () => {
    const ctx = contextFor(mount(`<div aria-live="polite">x</div>`));
    expect([...ctx.relevant].sort()).toEqual(["additions", "text"]);
  });

  it("parses aria-relevant, including all, and inherits it from an ancestor", () => {
    expect([...contextFor(mount(`<div aria-live="polite" aria-relevant="all">x</div>`)).relevant].sort()).toEqual([
      "additions",
      "removals",
      "text",
    ]);
    const nested = mount(`<div aria-relevant="removals"><div aria-live="polite">x</div></div>`);
    expect([...contextFor(q(nested, "[aria-live]")).relevant]).toEqual(["removals"]);
  });

  it("picks up aria-busy from the region or an ancestor", () => {
    expect(contextFor(mount(`<div aria-live="polite" aria-busy="true">x</div>`)).busy).toBe(true);
    const nested = mount(`<div aria-busy="true"><div aria-live="polite">x</div></div>`);
    expect(contextFor(q(nested, "[aria-live]")).busy).toBe(true);
  });
});

describe("liveRegionText", () => {
  it("ignores subtrees hidden from assistive technology by HTML, ARIA, or CSS", () => {
    const el = mount(
      `<div>keep<span aria-hidden="true">no</span><span hidden>no</span><span style="display:none">no</span><span style="visibility:hidden">no</span><span style="content-visibility:hidden">no</span></div>`,
    );
    expect(liveRegionText(el).trim()).toBe("keep");
  });

  it("ignores a subtree whose ancestor outside the supplied root is aria-hidden", () => {
    const el = mount(`<div aria-hidden="true"><span>not announced</span></div>`);

    expect(liveRegionText(q(el, "span"))).toBe("");
  });

  it.each([
    ["the hidden attribute", "hidden"],
    ["display:none", 'style="display:none"'],
    ["content-visibility:hidden", 'style="content-visibility:hidden"'],
  ])("ignores a subtree whose ancestor outside the supplied root uses %s", (_label, attribute) => {
    const el = mount(`<div ${attribute}><span>not announced</span></div>`);

    expect(liveRegionText(q(el, "span"))).toBe("");
  });

  it("substitutes image alt text and skips script and style", () => {
    const el = mount(`<div><img alt="a cat"><style>p{color:red}</style><script>void 0;</script></div>`);
    expect(liveRegionText(el).trim()).toBe("a cat");
  });

  it("keeps inline text contiguous but separates block-level siblings", () => {
    expect(liveRegionText(mount(`<div>Page <span>2</span> of 5</div>`))).toBe("Page 2 of 5");
    expect(normalizeText(liveRegionText(mount(`<div><p>row 1</p><p>row 2</p></div>`)))).toBe("row 1 row 2");
  });

  it("reads content rather than the accessible name", () => {
    const el = mount(`<div aria-label="Notifications">3 new messages</div>`);
    expect(liveRegionText(el)).toBe("3 new messages");
  });
});

describe("computeAnnouncement", () => {
  it("announces the whole region when atomic", () => {
    const el = mount(`<div aria-live="polite" aria-atomic="true">Page <span>1</span> of 5</div>`);
    const span = q(el, "span");
    const records = record(el, () => {
      span.textContent = "2";
    });
    const result = computeAnnouncement(contextFor(el), records);
    expect(result?.message).toBe("Page 2 of 5");
  });

  it("announces only the changed text when not atomic", () => {
    const el = mount(`<div aria-live="polite">Page <span>1</span> of 5</div>`);
    const span = q(el, "span");
    const records = record(el, () => {
      span.textContent = "2";
    });
    expect(computeAnnouncement(contextFor(el), records)?.message).toBe("2");
  });

  it("announces an atomic subtree inside a non-atomic region", () => {
    const el = mount(`<div aria-live="polite">head <p aria-atomic="true">Score: <b>1</b></p></div>`);
    const b = q(el, "b");
    const records = record(el, () => {
      b.textContent = "9";
    });
    const result = computeAnnouncement(contextFor(el), records);
    expect(result?.message).toBe("Score: 9");
    expect(result?.atomicRoots).toEqual([el.querySelector("p")]);
  });

  it("announces added nodes", () => {
    const el = mount(`<div aria-live="polite" role="log"></div>`);
    const records = record(el, () => {
      const li = document.createElement("div");
      li.textContent = "new row";
      el.appendChild(li);
    });
    expect(computeAnnouncement(contextFor(el), records)?.message).toBe("new row");
  });

  it("does not announce removal-only changes by default", () => {
    const el = mount(`<div aria-live="polite"><span>gone</span></div>`);
    const span = q(el, "span");
    const records = record(el, () => {
      span.remove();
    });
    const result = computeAnnouncement(contextFor(el), records);
    expect(result).toBeNull();
  });

  it("announces removals when aria-relevant includes them", () => {
    const el = mount(`<div aria-live="polite" aria-relevant="removals"><span>gone</span></div>`);
    const span = q(el, "span");
    const records = record(el, () => {
      span.remove();
    });
    expect(computeAnnouncement(contextFor(el), records)?.message).toBe("gone");
  });

  it("does not announce additions when aria-relevant omits them", () => {
    const el = mount(`<div aria-live="polite" aria-relevant="removals"></div>`);
    const records = record(el, () => {
      const p = document.createElement("p");
      p.textContent = "added";
      el.appendChild(p);
    });
    expect(computeAnnouncement(contextFor(el), records)).toBeNull();
  });

  it("suppresses announcements while aria-busy is true", () => {
    const el = mount(`<div aria-live="polite" aria-busy="true"></div>`);
    const records = record(el, () => {
      const p = document.createElement("p");
      p.textContent = "batched";
      el.appendChild(p);
    });
    expect(computeAnnouncement(contextFor(el), records)).toBeNull();
  });

  it("coalesces a batch of edits into one message", () => {
    const el = mount(`<div aria-live="polite" role="log"></div>`);
    const records = record(el, () => {
      for (const text of ["one", "two", "three"]) {
        const p = document.createElement("p");
        p.textContent = text;
        el.appendChild(p);
      }
    });
    expect(computeAnnouncement(contextFor(el), records)?.message).toBe("one two three");
  });

  it("returns null for attribute-only mutations in a non-atomic region", () => {
    const el = mount(`<div aria-live="polite"><span>same</span></div>`);
    const span = q(el, "span");
    const records = record(el, () => {
      span.setAttribute("data-x", "1");
    });
    expect(computeAnnouncement(contextFor(el), records)).toBeNull();
  });

  it("skips hidden content when announcing an atomic region", () => {
    const el = mount(`<div role="status">visible <span aria-hidden="true">hidden</span></div>`);
    const records = record(el, () => {
      firstChild(el).nodeValue = "changed ";
    });
    expect(computeAnnouncement(contextFor(el), records)?.message).toBe("changed");
  });

  it("flags a region that was inserted already populated", () => {
    const el = mount(`<div role="alert">Saved</div>`);
    const records = record(el, () => {
      el.textContent = "Saved";
    });
    const result = computeAnnouncement(contextFor(el), records, { regionJustInserted: true });
    expect(result?.notes.some((n) => n.includes("inserted already populated"))).toBe(true);
  });
});
