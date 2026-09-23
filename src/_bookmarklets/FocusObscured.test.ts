import { afterEach, expect, it, vi } from "vitest";
import { teardownBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const TOOL = '[data-a11y-playpen-tool="focus-obscured"]';
const fixtures: Element[] = [];
const entryUrl = new URL("./FocusObscured.ts", import.meta.url);

async function run(tag: string): Promise<void> {
  entryUrl.searchParams.set("focus-obscured-test-run", tag);
  await import(/* @vite-ignore */ entryUrl.href);
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`#${id} missing`);
  return element;
}

const rows = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(`${TOOL} [data-obscured-status]`));

afterEach(() => {
  teardownBookmarklet("focus-obscured");
  for (const fixture of fixtures) fixture.remove();
  fixtures.length = 0;
});

function mountFixture(): void {
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="header" style="position:fixed;top:0;left:0;width:100%;height:60px;background:#333;z-index:10"></div>
    <button id="covered" style="position:fixed;top:10px;left:20px;width:80px;height:30px">covered</button>
    <button id="fine" style="position:fixed;top:100px;left:20px">fine</button>
    <div id="scroller" style="position:fixed;top:150px;left:20px;width:150px;height:50px;overflow:auto">
      <div style="height:200px"></div><button id="deep">deep</button>
    </div>
  `;
  document.body.appendChild(container);
  fixtures.push(container);
}

function clickSweep(): void {
  Array.from(document.querySelectorAll<HTMLButtonElement>(`${TOOL} button`))
    .find((b) => b.textContent === "Sweep")
    ?.click();
}

it("restores focus and nested scroll when torn down mid-sweep", async () => {
  mountFixture();
  await run("activate-mid-sweep");
  byId("fine").focus();
  // Tear down the moment the sweep reaches #deep. Polling
  // for that state is racy: the sweep only holds focus there for two frames.
  let tornDown = false;
  const teardownAtDeep = (event: Event): void => {
    if (event.target !== byId("deep")) return;
    document.removeEventListener("focusin", teardownAtDeep, true);
    // A microtask runs after the sweep has asked for its next frame, so teardown hits it mid-wait.
    queueMicrotask(() => {
      tornDown = teardownBookmarklet("focus-obscured");
    });
  };
  document.addEventListener("focusin", teardownAtDeep, true);
  clickSweep();
  await vi.waitFor(() => {
    expect(tornDown).toBe(true);
  });
  await vi.waitFor(() => {
    expect(document.activeElement).toBe(byId("fine"));
    expect(byId("scroller").scrollTop).toBe(0);
  });
});

it("checks live focus, sweeps without touching its own panel, restores the page, and tears down", async () => {
  mountFixture();
  await run("activate");

  byId("covered").focus();
  await vi.waitFor(() => {
    expect(rows().map((row) => row.dataset.obscuredStatus)).toEqual(["hidden"]);
  });
  byId("fine").focus();

  const focused: Element[] = [];
  const record = (event: Event): void => {
    focused.push(event.composedPath()[0] as Element);
  };
  document.addEventListener("focusin", record, true);
  clickSweep();
  await vi.waitFor(() => {
    expect(document.querySelector<HTMLElement>(`${TOOL}[data-sweep]`)?.dataset.sweep).toBe("done");
  });
  document.removeEventListener("focusin", record, true);

  expect(focused.filter((element) => element.closest(TOOL) !== null)).toEqual([]);
  expect(focused).toContain(byId("deep"));
  expect(rows().map((row) => row.dataset.obscuredStatus)).toEqual(["hidden"]);
  expect(byId("scroller").scrollTop).toBe(0);
  expect(document.activeElement).toBe(byId("fine"));

  await run("teardown");
  expect(document.querySelector(TOOL)).toBeNull();
});
