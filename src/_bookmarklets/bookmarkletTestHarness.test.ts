import { afterEach, describe, expect, it } from "vitest";
import {
  createBookmarkletHarness,
  mountBookmarkletFixture,
  type BookmarkletHarness,
  type BookmarkletFixture,
} from "./bookmarkletTestHarness.ts";
import { drawBox } from "../utils/drawUtils.ts";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

let fixture: BookmarkletFixture | undefined;
let harness: BookmarkletHarness | undefined;

afterEach(() => {
  harness?.restore();
  fixture?.restore();
  teardownBookmarklet("force-focus-outline");
  document.querySelectorAll("[rel=harness-coordinate-test]").forEach((element) => {
    element.remove();
  });
  document.querySelectorAll("[data-bookmarklet-test-fixture]").forEach((element) => {
    element.remove();
  });
  document.querySelectorAll("style#phlffobkmklt").forEach((element) => {
    element.remove();
  });
  harness = undefined;
  fixture = undefined;
});

describe("bookmarklet browser fixture", () => {
  it("provides collision, shadow-root, same-origin iframe, and inaccessible-frame cases", async () => {
    fixture = await mountBookmarkletFixture();

    expect(document.querySelectorAll("#duplicate-page-id")).toHaveLength(2);
    expect(document.querySelectorAll(".duplicate-page-class")).toHaveLength(2);
    expect(fixture.shadowRoot.querySelector("[data-fixture=shadow-target]")).not.toBeNull();
    expect(fixture.sameOriginFrame.contentDocument?.querySelector("[data-fixture=iframe-target]")).not.toBeNull();
    expect(() => fixture?.readInaccessibleFrame()).toThrow();
  });
});

describe("bookmarklet execution harness", () => {
  it("reports tool nodes, console output, and outstanding browser resources", async () => {
    fixture = await mountBookmarkletFixture();
    harness = createBookmarkletHarness();

    await harness.run(() => {
      const ownedNode = document.createElement("aside");
      ownedNode.dataset.a11yPlaypenTool = "harness-example";
      document.body.appendChild(ownedNode);
      window.addEventListener("resize", () => undefined);
      window.setTimeout(() => undefined, 60_000);
      window.requestAnimationFrame(() => undefined);
      new MutationObserver(() => undefined).observe(document.body, { childList: true });
      console.warn("bookmarklet warning", { source: "fixture" });
    });

    const state = harness.snapshot();
    expect(state.ownedNodes).toEqual([document.querySelector("[data-a11y-playpen-tool=harness-example]")]);
    expect(state.listeners).toHaveLength(1);
    expect(state.timeouts).toHaveLength(1);
    expect(state.animationFrames).toHaveLength(1);
    expect(state.observers).toHaveLength(1);
    expect(state.console).toEqual([
      {
        level: "warn",
        args: ["bookmarklet warning", { source: "fixture" }],
      },
    ]);
  });

  it("runs the repeated-activation teardown contract", async () => {
    fixture = await mountBookmarkletFixture();
    harness = createBookmarkletHarness();
    let abortController: AbortController | undefined;
    let timeout: number | undefined;
    let observer: MutationObserver | undefined;
    let ownedNode: HTMLElement | undefined;

    const toggle = () => {
      if (abortController !== undefined) {
        abortController.abort();
        if (timeout !== undefined) window.clearTimeout(timeout);
        observer?.disconnect();
        ownedNode?.remove();
        abortController = undefined;
        return;
      }

      abortController = new AbortController();
      window.addEventListener("resize", () => undefined, { signal: abortController.signal });
      timeout = window.setTimeout(() => undefined, 60_000);
      observer = new MutationObserver(() => undefined);
      observer.observe(document.body, { childList: true });
      ownedNode = document.createElement("div");
      ownedNode.dataset.a11yPlaypenTool = "toggle-contract";
      document.body.appendChild(ownedNode);
    };

    const { active, teardown } = await harness.runRepeated(toggle);

    expect(active.ownedNodes).toHaveLength(1);
    expect(active.listeners).toHaveLength(1);
    expect(active.timeouts).toHaveLength(1);
    expect(active.observers).toHaveLength(1);
    expect(teardown.ownedNodes).toHaveLength(0);
    expect(teardown.listeners).toHaveLength(0);
    expect(teardown.timeouts).toHaveLength(0);
    expect(teardown.animationFrames).toHaveLength(0);
    expect(teardown.observers).toHaveLength(0);
  });

  it("executes a real bookmarklet entry twice without changing page state", async () => {
    fixture = await mountBookmarkletFixture();
    harness = createBookmarkletHarness();
    fixture.stateTarget.focus({ preventScroll: true });
    const before = harness.capturePageState([fixture.stateTarget]);
    const entryUrl = new URL("./ForceFocusOutline.ts", import.meta.url);

    entryUrl.searchParams.set("bookmarklet-test-run", "activate");
    await harness.run(async () => {
      await import(/* @vite-ignore */ entryUrl.href);
    });
    expect(document.querySelectorAll("[data-a11y-playpen-tool=force-focus-outline]")).toHaveLength(1);
    expect(fixture.shadowRoot.querySelector("[data-a11y-playpen-tool=force-focus-outline]")).not.toBeNull();
    expect(fixture.sameOriginFrame.contentDocument?.querySelector("[data-a11y-playpen-tool=force-focus-outline]")).not.toBeNull();

    entryUrl.searchParams.set("bookmarklet-test-run", "teardown");
    await harness.run(async () => {
      await import(/* @vite-ignore */ entryUrl.href);
    });

    expect(document.querySelectorAll("[data-a11y-playpen-tool=force-focus-outline]")).toHaveLength(0);
    expect(fixture.shadowRoot.querySelector("[data-a11y-playpen-tool=force-focus-outline]")).toBeNull();
    expect(fixture.sameOriginFrame.contentDocument?.querySelector("[data-a11y-playpen-tool=force-focus-outline]")).toBeNull();
    expect(harness.comparePageState(before)).toEqual({
      focus: undefined,
      scroll: undefined,
      url: undefined,
      inlineStyles: [],
    });
  });

  it("does not treat a page-owned legacy id as lifecycle state", async () => {
    fixture = await mountBookmarkletFixture();
    harness = createBookmarkletHarness();
    const pageStyle = document.createElement("style");
    pageStyle.id = "phlffobkmklt";
    pageStyle.dataset.bookmarkletTestFixture = "";
    document.head.appendChild(pageStyle);
    const entryUrl = new URL("./ForceFocusOutline.ts", import.meta.url);
    entryUrl.searchParams.set("bookmarklet-test-run", "legacy-id-collision");

    await harness.run(async () => {
      await import(/* @vite-ignore */ entryUrl.href);
    });

    expect(pageStyle.isConnected).toBe(true);
    expect(document.querySelectorAll("[data-a11y-playpen-tool=force-focus-outline]")).toHaveLength(1);
  });

  it("detects page state changed by activation and restored by teardown", async () => {
    fixture = await mountBookmarkletFixture();
    harness = createBookmarkletHarness();
    const target = fixture.stateTarget;
    const originalStyle = target.getAttribute("style");
    const originalHash = location.hash;
    target.focus({ preventScroll: true });
    const before = harness.capturePageState([target]);

    await harness.run(() => {
      target.style.border = "4px solid red";
      location.hash = "changed-by-tool";
      fixture?.root.querySelector<HTMLElement>("[data-fixture=other-focus]")?.focus();
    });

    const changed = harness.comparePageState(before);
    expect(changed.inlineStyles).toEqual([
      {
        element: target,
        before: originalStyle,
        after: "color: rgb(0, 0, 255); border: 4px solid red;",
      },
    ]);
    expect(changed.url?.after).toBe(`${location.origin}${location.pathname}${location.search}#changed-by-tool`);
    expect(changed.focus?.before).toBe(target);

    target.setAttribute("style", originalStyle ?? "");
    if (originalStyle === null) target.removeAttribute("style");
    history.replaceState(history.state, "", originalHash || `${location.pathname}${location.search}`);
    target.focus({ preventScroll: true });
    window.scrollTo(before.scrollX, before.scrollY);

    expect(harness.comparePageState(before)).toEqual({
      focus: undefined,
      scroll: undefined,
      url: undefined,
      inlineStyles: [],
    });
  });
});

describe("known bookmarklet regressions", () => {
  it.fails("positions an absolute overlay in document coordinates when the page is scrolled", async () => {
    fixture = await mountBookmarkletFixture();
    const rect = fixture.stateTarget.getBoundingClientRect();

    drawBox(fixture.stateTarget, "harness-coordinate-test");

    const overlay = document.querySelector<HTMLElement>("[rel=harness-coordinate-test]");
    expect(overlay).not.toBeNull();
    expect(Number.parseFloat(overlay?.style.top ?? "")).toBeCloseTo(rect.top + window.scrollY);
    expect(Number.parseFloat(overlay?.style.left ?? "")).toBeCloseTo(rect.left + window.scrollX);
  });
});
