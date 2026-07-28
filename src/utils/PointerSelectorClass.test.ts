import { afterEach, describe, expect, it, vi } from "vitest";
import CreatePointerSelector, { PointerSelector } from "./PointerSelectorClass.ts";
import { teardownBookmarklet } from "./bookmarkletLifecycle.ts";

let selector: PointerSelector | undefined;
const TOOL_NAME = "pointer-selector-test";

afterEach(() => {
  vi.useRealTimers();
  teardownBookmarklet(TOOL_NAME);
  selector?.destroy();
  document.querySelectorAll("[data-pointer-selector-test-fixture]").forEach((element) => {
    element.remove();
  });
  selector = undefined;
});

function fixture(tagName: keyof HTMLElementTagNameMap = "button"): HTMLElement {
  const element = document.createElement(tagName);
  element.dataset.pointerSelectorTestFixture = "";
  document.body.appendChild(element);
  return element;
}

describe("PointerSelector", () => {
  it("destroy removes the overlay and stops hover callbacks", () => {
    vi.useFakeTimers();
    const target = fixture();
    const hover = vi.fn();
    selector = new PointerSelector(undefined, hover);
    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    vi.advanceTimersByTime(100);
    expect(hover).toHaveBeenCalledOnce();

    selector.destroy();
    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    vi.advanceTimersByTime(100);

    expect(hover).toHaveBeenCalledOnce();
    expect(selector._pointerSelector?.isConnected).toBe(false);
  });

  it("pointer tracking does not synthesize mouseover events into the page", () => {
    vi.useFakeTimers();
    const target = fixture();
    const pageMouseover = vi.fn();
    target.addEventListener("mouseover", pageMouseover);
    selector = new PointerSelector(() => false);

    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    vi.advanceTimersByTime(100);

    expect(pageMouseover).not.toHaveBeenCalled();
  });

  it("tracks the pointed element from capture-phase pointer movement", () => {
    vi.useFakeTimers();
    const target = fixture();
    const hover = vi.fn();
    selector = new PointerSelector(undefined, hover);
    target.addEventListener("pointermove", (event) => {
      event.stopPropagation();
    });

    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    vi.advanceTimersByTime(100);

    expect(hover).toHaveBeenCalledOnce();
    expect(hover).toHaveBeenCalledWith(target);
  });

  it("cancels a pending hover callback during destroy", () => {
    vi.useFakeTimers();
    const target = fixture();
    const hover = vi.fn();
    selector = new PointerSelector(undefined, hover);

    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    selector.destroy();
    vi.advanceTimersByTime(100);

    expect(hover).not.toHaveBeenCalled();
  });

  it("cancels selection with Escape", () => {
    const target = fixture();
    const hover = vi.fn();
    selector = new PointerSelector(undefined, hover);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));

    expect(hover).not.toHaveBeenCalled();
    expect(selector._pointerSelector?.isConnected).toBe(false);
  });

  it("selects SVG elements and closes when the selection callback returns true", () => {
    const target = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    target.setAttribute("data-pointer-selector-test-fixture", "");
    document.body.appendChild(target);
    const select = vi.fn(() => true);
    selector = new PointerSelector(select);

    target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(select).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith(target);
    expect(selector._pointerSelector?.isConnected).toBe(false);
  });

  it("uses lifecycle ownership so repeated activation tears down instead of creating a duplicate", () => {
    const first = CreatePointerSelector(TOOL_NAME, () => false);
    const second = CreatePointerSelector(TOOL_NAME, () => false);

    expect(first).toBeInstanceOf(PointerSelector);
    expect(second).toBeNull();
    expect(first?._pointerSelector?.isConnected).toBe(false);
    expect(document.querySelectorAll(`[data-a11y-playpen-tool="${TOOL_NAME}"]`)).toHaveLength(0);
    expect(Object.hasOwn(window, "PointerSelector")).toBe(false);
  });
});
