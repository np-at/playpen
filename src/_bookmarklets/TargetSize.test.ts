import { afterEach, expect, it } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const TOOL = '[data-a11y-playpen-tool="target-size"]';
const fixtures: Element[] = [];
const entryUrl = new URL("./TargetSize.ts", import.meta.url);

async function run(tag: string): Promise<void> {
  entryUrl.searchParams.set("target-size-test-run", tag);
  await import(/* @vite-ignore */ entryUrl.href);
}

const btn = (left: number, top: number, size: number): string =>
  `<button style="position:fixed;left:${String(left)}px;top:${String(top)}px;width:${String(size)}px;height:${String(size)}px;margin:0;padding:0;border:0"></button>`;

function counts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const shape of document.querySelectorAll<SVGElement>(`svg${TOOL} rect[data-status]`)) {
    const status = shape.dataset.status ?? "";
    out[status] = (out[status] ?? 0) + 1;
  }
  return out;
}
const circles = (): number => document.querySelectorAll(`svg${TOOL} circle`).length;

function panelControl(selector: string): HTMLElement {
  const control = document.querySelector<HTMLElement>(`${TOOL} ${selector}`);
  if (control === null) throw new Error(`${selector} missing`);
  return control;
}

afterEach(() => {
  teardownBookmarklet("target-size");
  for (const fixture of fixtures) fixture.remove();
  fixtures.length = 0;
});

it("draws statuses and circles, switches to AAA, re-scans without duplicates, and tears down", async () => {
  const container = document.createElement("div");
  container.innerHTML = `
    ${btn(10, 10, 16)}${btn(28, 10, 16)}
    ${btn(10, 100, 16)}
    ${btn(10, 200, 30)}
    <p style="position:fixed;left:10px;top:300px;font-size:12px;margin:0">Read the <a href="#">policy</a> first.</p>
  `;
  document.body.appendChild(container);
  fixtures.push(container);

  await run("activate");
  // Passing targets are not drawn; undersized AA targets get a spacing circle.
  expect(counts()).toEqual({ fail: 2, "pass-spacing": 1, exempt: 1 });
  expect(circles()).toBe(3);

  const aaa = panelControl('input[type="checkbox"]');
  aaa.click();
  expect(counts()).toEqual({ fail: 4, exempt: 1 });
  expect(circles()).toBe(0);

  panelControl("button[data-rescan]").click();
  expect(counts()).toEqual({ fail: 4, exempt: 1 });

  await run("teardown");
  expect(document.querySelector(TOOL)).toBeNull();
});
