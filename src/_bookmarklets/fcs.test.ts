import { afterEach, describe, expect, it } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

afterEach(() => {
  teardownBookmarklet("focus-trace");
  document.querySelectorAll("[data-fcs-test-fixture]").forEach((element) => {
    element.remove();
  });
});

function focusTarget(left: number): HTMLButtonElement {
  const button = document.createElement("button");
  button.dataset.fcsTestFixture = "";
  button.style.cssText = `position: fixed; left: ${left.toString()}px; top: 20px; width: 20px; height: 20px`;
  document.body.appendChild(button);
  return button;
}

describe("focus trace overlay ownership", () => {
  it("does not append trace graphics to a page-owned rootSvg", async () => {
    const pageSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pageSvg.id = "rootSvg";
    pageSvg.dataset.fcsTestFixture = "";
    document.body.appendChild(pageSvg);
    const first = focusTarget(20);
    const second = focusTarget(60);

    await import("./fcs.ts");
    first.focus();
    second.focus();

    expect(pageSvg.childElementCount).toBe(0);
  });
});
