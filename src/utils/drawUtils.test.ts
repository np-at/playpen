import { afterEach, describe, expect, it, vi } from "vitest";
import { activateBookmarklet, teardownBookmarklet, type BookmarkletLifecycle } from "./bookmarkletLifecycle.ts";
import { clearCurrentSelectionBoxes, drawBox, ensureBoundingStyleAvailable } from "./drawUtils.ts";

const TOOL_NAME = "draw-utils-test";
let lifecycle: BookmarkletLifecycle | null;

afterEach(() => {
  lifecycle?.teardown();
  teardownBookmarklet(TOOL_NAME);
  document.querySelectorAll("[data-draw-utils-test-fixture]").forEach((element) => {
    element.remove();
  });
  lifecycle = null;
});

function fixture(): HTMLDivElement {
  const element = document.createElement("div");
  element.dataset.drawUtilsTestFixture = "";
  document.body.appendChild(element);
  return element;
}

describe("drawUtils", () => {
  it("clears only lifecycle-owned overlays when page nodes share legacy ids and classes", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const target = fixture();
    const pageNode = fixture();
    pageNode.id = "duplicate-overlay";
    pageNode.className = "segment-rect bounding-rect";
    const overlay = drawBox(lifecycle, target, { group: "duplicate-overlay", utilityName: "draw-utils-test" });
    expect(document.querySelectorAll(`style[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toHaveLength(1);
    clearCurrentSelectionBoxes(lifecycle);

    expect(pageNode.isConnected).toBe(true);
    expect(overlay.isConnected).toBe(false);
  });

  it("injects one namespaced stylesheet and removes it during teardown", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    ensureBoundingStyleAvailable(lifecycle);
    ensureBoundingStyleAvailable(lifecycle);

    expect(document.querySelectorAll(`style[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toHaveLength(1);
    lifecycle.teardown();
    expect(document.querySelector(`style[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toBeNull();
  });

  it("redraws an owned fixed overlay after viewport geometry changes", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const target = fixture();
    target.style.cssText = "position: fixed; left: 10px; top: 20px; width: 30px; height: 40px";
    const overlay = drawBox(lifecycle, target, { utilityName: "draw-utils-test" });
    expect(overlay.style.left).toBe("10px");

    target.style.left = "50px";
    window.dispatchEvent(new Event("resize"));

    expect(overlay.style.left).toBe("50px");
  });

  it("redraws an owned fixed overlay after a nested scroll event", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const target = fixture();
    target.style.cssText = "position: fixed; left: 10px; top: 20px; width: 30px; height: 40px";
    const overlay = drawBox(lifecycle, target, { utilityName: "draw-utils-test" });

    target.style.left = "60px";
    target.dispatchEvent(new Event("scroll", { bubbles: false }));

    expect(overlay.style.left).toBe("60px");
  });

  it("redraws when the target element changes size or position", async () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const target = fixture();
    target.style.cssText = "position: fixed; left: 10px; top: 20px; width: 30px; height: 40px";
    const overlay = drawBox(lifecycle, target, { utilityName: "draw-utils-test" });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    target.style.left = "70px";

    await vi.waitFor(() => {
      expect(overlay.style.left).toBe("70px");
      expect(overlay.style.width).toBe("30px");
    });
  });
});
