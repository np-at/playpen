import { afterEach, describe, expect, it } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

afterEach(() => {
  teardownBookmarklet("duplicate-id-check");
  document.querySelectorAll("[data-dupe-id-test-fixture]").forEach((element) => {
    element.remove();
  });
});

describe("duplicate id overlay ownership", () => {
  it("does not create a duplicate when the page owns the legacy panel id", async () => {
    const pageNode = document.createElement("div");
    pageNode.id = "a11y-bookmarklet";
    pageNode.dataset.dupeIdTestFixture = "";
    document.body.appendChild(pageNode);

    await import("./dupeIdCheck.ts");

    const panel = document.querySelector<HTMLDialogElement>(
      'dialog[data-a11y-playpen-tool="duplicate-id-check"]',
    );
    expect(pageNode.isConnected).toBe(true);
    expect(panel?.id).toBe("");
    expect(panel?.textContent).toContain("No duplicate IDs found");
  });
});
