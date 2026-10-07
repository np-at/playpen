import { afterEach, expect, it } from "vitest";
import { assert } from "../utils/assert.ts";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const TOOL = '[data-a11y-playpen-tool="named-link-semantics"]';
const fixtures: Element[] = [];
async function run(tag: string): Promise<void> {
  const url = new URL("./NamedLinkSemantics.ts", import.meta.url);
  url.searchParams.set("test-run", tag);
  await import(/* @vite-ignore */ url.href);
}
afterEach(() => {
  teardownBookmarklet("named-link-semantics");
  fixtures.splice(0).forEach((el) => {
    el.remove();
  });
});

it("reports both reasons, rescans without stale highlights, and restores page attributes on close", async () => {
  const root = document.createElement("div");
  root.innerHTML =
    '<a href="#" aria-label="Card" style="outline: 1px solid green" data-a11y-named-link="page-value"><h2>Title</h2><span tabindex="-1">Focus</span></a>';
  document.body.append(root);
  fixtures.push(root);
  const link = root.querySelector("a");
  const heading = root.querySelector("h2");
  assert(link !== null && heading !== null);
  await run("panel");
  const panel = document.querySelector<HTMLDivElement>(`div${TOOL}`);
  assert(panel !== null);
  const rescan = panel.querySelector<HTMLButtonElement>("[data-rescan]");
  const close = panel.querySelector<HTMLButtonElement>("[data-close]");
  assert(rescan !== null && close !== null);
  expect(panel.textContent).toContain("aria-label");
  expect(panel.textContent).toContain("heading");
  expect(panel.textContent).toContain("focusable");
  expect(link.getAttribute("data-a11y-named-link")).toBe("link");
  expect(heading.getAttribute("data-a11y-named-link")).toBe("descendant");
  link.removeAttribute("aria-label");
  rescan.click();
  expect(panel.textContent).toContain("0 links");
  expect(link.getAttribute("data-a11y-named-link")).toBe("page-value");
  expect(heading.hasAttribute("data-a11y-named-link")).toBe(false);
  close.click();
  expect(document.querySelector(TOOL)).toBeNull();
  expect(link.getAttribute("style")).toBe("outline: 1px solid green");
});

it("toggles off on a second execution", async () => {
  await run("toggle-on");
  expect(document.querySelector(TOOL)).not.toBeNull();
  await run("toggle-off");
  expect(document.querySelector(TOOL)).toBeNull();
});
