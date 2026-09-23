import { afterEach, expect, it } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const fixtures: Element[] = [];
const entryUrl = new URL("./TabOrder.ts", import.meta.url);

async function run(tag: string): Promise<void> {
  entryUrl.searchParams.set("tab-order-test-run", tag);
  await import(/* @vite-ignore */ entryUrl.href);
}

const badges = (group: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-a11y-overlay-group="${group}"] [data-tab-order-step]`));

afterEach(() => {
  teardownBookmarklet("tab-order");
  for (const fixture of fixtures) fixture.remove();
  fixtures.length = 0;
});

it("draws computed badges, flags problems, records real focus, and tears down", async () => {
  const container = document.createElement("div");
  container.innerHTML = `
    <button id="one" style="display:block">one</button>
    <button id="two" style="display:block">two</button>
    <button id="pos" tabindex="1" style="display:block">pos</button>
  `;
  document.body.appendChild(container);
  fixtures.push(container);

  await run("activate");

  const computed = badges("computed");
  expect(computed.map((badge) => badge.textContent)).toEqual(["1", "2", "3"]);
  // #pos goes first because of its positive tabindex; #one then jumps back up the page.
  expect(computed.map((badge) => badge.dataset.tabOrderFlag)).toEqual(["positive", "backward", undefined]);
  expect(document.querySelector('svg[data-a11y-playpen-tool="tab-order"] polyline')).not.toBeNull();

  // Real order diverges from computed at step 1.
  container.querySelector<HTMLElement>("#one")?.focus();
  container.querySelector<HTMLElement>("#two")?.focus();
  const recorded = badges("recorded");
  expect(recorded.map((badge) => badge.textContent)).toEqual(["1", "2"]);
  expect(recorded.map((badge) => badge.dataset.tabOrderFlag)).toEqual(["divergent", "divergent"]);

  await run("teardown");
  expect(document.querySelector('[data-a11y-playpen-tool="tab-order"]')).toBeNull();
});
