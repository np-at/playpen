import { afterEach, describe, expect, it, vi } from "vitest";
import { activateBookmarklet, teardownBookmarklet, type BookmarkletLifecycle } from "./bookmarkletLifecycle.ts";

const TOOL_NAME = "lifecycle-test";
let lifecycle: BookmarkletLifecycle | null;

afterEach(() => {
  lifecycle?.teardown();
  teardownBookmarklet(TOOL_NAME);
  lifecycle = null;
  document.querySelectorAll("[data-lifecycle-test-fixture]").forEach((element) => {
    element.remove();
  });
});

function fixture<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.dataset.lifecycleTestFixture = "";
  document.body.appendChild(element);
  return element;
}

describe("bookmarklet lifecycle", () => {
  it("tears down an active tool instead of starting a duplicate", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    expect(lifecycle).not.toBeNull();
    const cleanup = vi.fn();
    lifecycle?.addCleanup(cleanup);

    const secondActivation = activateBookmarklet(TOOL_NAME);

    expect(secondActivation).toBeNull();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(lifecycle?.active).toBe(false);
    expect(activateBookmarklet(TOOL_NAME)).not.toBeNull();
  });

  it("owns listeners, timers, animation frames, observers, and marked nodes", async () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const listener = vi.fn();
    const timeout = vi.fn();
    const animationFrame = vi.fn();
    const observerCallback = vi.fn();
    const ownedNode = document.createElement("aside");

    lifecycle.listen(window, "lifecycle-test-event", listener);
    lifecycle.timeout(timeout, 0);
    lifecycle.animationFrame(animationFrame);
    lifecycle.observe(new MutationObserver(observerCallback), document.body, { childList: true });
    lifecycle.ownNode(ownedNode);
    document.body.appendChild(ownedNode);

    expect(ownedNode.dataset.a11yPlaypenTool).toBe(TOOL_NAME);
    window.dispatchEvent(new Event("lifecycle-test-event"));
    expect(listener).toHaveBeenCalledOnce();

    lifecycle.teardown();
    window.dispatchEvent(new Event("lifecycle-test-event"));
    document.body.appendChild(fixture("span"));
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 30);
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(timeout).not.toHaveBeenCalled();
    expect(animationFrame).not.toHaveBeenCalled();
    expect(observerCallback).not.toHaveBeenCalled();
    expect(ownedNode.isConnected).toBe(false);
  });

  it("restores attributes and classes to their exact original state", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const target = fixture("button");
    target.setAttribute("aria-label", "Original");
    target.classList.add("page-class");

    lifecycle.setAttribute(target, "aria-label", "Temporary");
    lifecycle.setAttribute(target, "data-temporary", "yes");
    lifecycle.addClass(target, "tool-class");

    expect(target.getAttribute("aria-label")).toBe("Temporary");
    expect(target.getAttribute("data-temporary")).toBe("yes");
    expect(target.classList.contains("tool-class")).toBe(true);

    lifecycle.teardown();

    expect(target.getAttribute("aria-label")).toBe("Original");
    expect(target.hasAttribute("data-temporary")).toBe(false);
    expect(target.className).toBe("page-class");
  });

  it("removes only owned nodes when page elements share legacy ids and classes", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const pageNode = fixture("div");
    pageNode.id = "a11y-bookmarklet";
    pageNode.className = "bounding-rect";
    const toolNode = document.createElement("div");
    toolNode.id = "a11y-bookmarklet";
    toolNode.className = "bounding-rect";
    lifecycle.ownNode(toolNode);
    document.body.appendChild(toolNode);

    lifecycle.teardown();

    expect(pageNode.isConnected).toBe(true);
    expect(toolNode.isConnected).toBe(false);
  });

  it("injects one owned stylesheet per tool and root", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const host = fixture("div");
    const shadowRoot = host.attachShadow({ mode: "open" });

    const documentStyle = lifecycle.style(document, "body { outline: 1px solid green; }");
    const first = lifecycle.style(shadowRoot, ":host { outline: 1px solid red; }");
    const second = lifecycle.style(shadowRoot, ":host { outline: 2px solid blue; }");

    expect(document.head.contains(documentStyle)).toBe(true);
    expect(second).toBe(first);
    expect(shadowRoot.querySelectorAll(`style[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toHaveLength(1);
    expect(first.textContent).toContain("outline: 2px solid blue");

    lifecycle.teardown();
    expect(documentStyle.isConnected).toBe(false);
    expect(shadowRoot.querySelector(`[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toBeNull();
  });
});
