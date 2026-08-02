import { afterEach, expect, it } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const fixtures: Element[] = [];

afterEach(() => {
  teardownBookmarklet("text-spacing");
  for (const fixture of fixtures) fixture.remove();
  fixtures.length = 0;
});

it("keeps a page-owned legacy style while toggling only lifecycle-owned text spacing styles", async () => {
  const pageStyle = document.createElement("style");
  pageStyle.id = "phltsbkmklt";
  pageStyle.textContent = ".page-owned { color: rebeccapurple; }";
  document.head.appendChild(pageStyle);
  fixtures.push(pageStyle);
  const entryUrl = new URL("./TextSpacing.ts", import.meta.url);
  entryUrl.searchParams.set("text-spacing-test-run", "activate");

  await import(/* @vite-ignore */ entryUrl.href);

  expect(pageStyle.isConnected).toBe(true);
  expect(document.querySelectorAll('[data-a11y-playpen-tool="text-spacing"]')).toHaveLength(1);

  entryUrl.searchParams.set("text-spacing-test-run", "teardown");
  await import(/* @vite-ignore */ entryUrl.href);

  expect(pageStyle.isConnected).toBe(true);
  expect(document.querySelector('[data-a11y-playpen-tool="text-spacing"]')).toBeNull();
});
