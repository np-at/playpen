import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateBookmarklet, teardownBookmarklet, type BookmarkletLifecycle } from "./bookmarkletLifecycle.ts";
import { makeDraggableDisplay } from "./makeDraggableOverlay.ts";

const TOOL_NAME = "draggable-overlay-test";
let lifecycle: BookmarkletLifecycle | null;
let originalMousemove: typeof document.onmousemove;
let originalMouseup: typeof document.onmouseup;
let originalPointermove: typeof document.onpointermove;
let originalPointerup: typeof document.onpointerup;

beforeEach(() => {
  originalMousemove = document.onmousemove;
  originalMouseup = document.onmouseup;
  originalPointermove = document.onpointermove;
  originalPointerup = document.onpointerup;
});

afterEach(() => {
  lifecycle?.teardown();
  teardownBookmarklet(TOOL_NAME);
  document.onmousemove = originalMousemove;
  document.onmouseup = originalMouseup;
  document.onpointermove = originalPointermove;
  document.onpointerup = originalPointerup;
  lifecycle = null;
});

describe("makeDraggableDisplay", () => {
  it("uses a dedicated handle without replacing page mouse handlers from interactive content", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const pageMousemove = vi.fn();
    const pageMouseup = vi.fn();
    const pagePointermove = vi.fn();
    const pagePointerup = vi.fn();
    document.onmousemove = pageMousemove;
    document.onmouseup = pageMouseup;
    document.onpointermove = pagePointermove;
    document.onpointerup = pagePointerup;
    const panel = makeDraggableDisplay(lifecycle);
    const button = document.createElement("button");
    const click = vi.fn();
    button.addEventListener("click", click);
    panel.appendChild(button);
    document.body.appendChild(panel);

    const initialPosition = { left: panel.style.left, top: panel.style.top };
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, pointerId: 9 }));
    button.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 50, pointerId: 9 }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 50, clientY: 50, pointerId: 9 }));
    button.click();

    expect(panel.querySelector("[data-a11y-drag-handle]")).not.toBeNull();
    expect(document.onmousemove).toBe(pageMousemove);
    expect(document.onmouseup).toBe(pageMouseup);
    expect(document.onpointermove).toBe(pagePointermove);
    expect(document.onpointerup).toBe(pagePointerup);
    expect({ left: panel.style.left, top: panel.style.top }).toEqual(initialPosition);
    expect(click).toHaveBeenCalledOnce();
  });

  it("drags from the handle, resolves right positioning, and stays within the viewport", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const panel = makeDraggableDisplay(lifecycle);
    document.body.appendChild(panel);
    const handle = panel.querySelector<HTMLButtonElement>("[data-a11y-drag-handle]");
    if (handle === null) throw new Error("expected drag handle");
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => false);
    const rect = panel.getBoundingClientRect();

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: rect.left + 10,
        clientY: rect.top + 10,
        pointerId: 1,
      }),
    );
    handle.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: -100,
        clientY: window.innerHeight + 100,
        pointerId: 1,
      }),
    );

    expect(panel.style.right).toBe("auto");
    expect(panel.style.left).toBe("0px");
    expect(panel.style.top).toBe(`${(window.innerHeight - rect.height).toString()}px`);
  });

  it("stops dragging when the pointer is cancelled", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const panel = makeDraggableDisplay(lifecycle);
    document.body.appendChild(panel);
    const handle = panel.querySelector<HTMLButtonElement>("[data-a11y-drag-handle]");
    if (handle === null) throw new Error("expected drag handle");
    const releasePointerCapture = vi.fn();
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = releasePointerCapture;
    const rect = panel.getBoundingClientRect();

    handle.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: rect.left + 10, clientY: 10, pointerId: 2 }),
    );
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: rect.left - 50, clientY: 100, pointerId: 2 }));
    handle.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 2 }));
    const leftAfterCancel = panel.style.left;
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: rect.left - 100, clientY: 200, pointerId: 2 }));

    expect(panel.style.left).toBe(leftAfterCancel);
    expect(releasePointerCapture).toHaveBeenCalledWith(2);
  });

  it("releases pointer capture when torn down during a drag", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const panel = makeDraggableDisplay(lifecycle);
    document.body.appendChild(panel);
    const handle = panel.querySelector<HTMLButtonElement>("[data-a11y-drag-handle]");
    if (handle === null) throw new Error("expected drag handle");
    const releasePointerCapture = vi.fn();
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = releasePointerCapture;
    const rect = panel.getBoundingClientRect();

    handle.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        clientX: rect.left + 10,
        clientY: rect.top + 10,
        pointerId: 3,
      }),
    );
    lifecycle.teardown();

    expect(releasePointerCapture).toHaveBeenCalledWith(3);
  });

  it("keeps the first pointer as the active drag when another pointer goes down", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const panel = makeDraggableDisplay(lifecycle);
    document.body.appendChild(panel);
    panel.getBoundingClientRect = () => new DOMRect(100, 20, 300, 300);
    const handle = panel.querySelector<HTMLButtonElement>("[data-a11y-drag-handle]");
    if (handle === null) throw new Error("expected drag handle");
    handle.setPointerCapture = vi.fn();

    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 110, clientY: 30, pointerId: 4 }));
    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 120, clientY: 30, pointerId: 5 }));
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 30, pointerId: 4 }));

    expect(panel.style.left).toBe("40px");
  });

  it("stops dragging when pointer capture is lost", () => {
    lifecycle = activateBookmarklet(TOOL_NAME);
    if (lifecycle === null) throw new Error("expected lifecycle activation");
    const panel = makeDraggableDisplay(lifecycle);
    document.body.appendChild(panel);
    panel.getBoundingClientRect = () => new DOMRect(100, 20, 300, 300);
    const handle = panel.querySelector<HTMLButtonElement>("[data-a11y-drag-handle]");
    if (handle === null) throw new Error("expected drag handle");
    handle.setPointerCapture = vi.fn();

    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 110, clientY: 30, pointerId: 6 }));
    handle.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 6 }));
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 30, pointerId: 6 }));

    expect(panel.style.left).toBe("100px");
  });
});
