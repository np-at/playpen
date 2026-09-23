import { afterEach, describe, expect, it } from "vitest";
import { checkObscured } from "./focusObscured.ts";

const fixtures: Element[] = [];

function fixture(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.appendChild(container);
  fixtures.push(container);
  return container;
}

function byId(root: ParentNode, id: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`#${id}`);
  if (element === null) throw new Error(`#${id} missing`);
  return element;
}

const HEADER = `<div id="header" style="position:fixed;top:0;left:0;width:400px;height:50px;background:#333;z-index:10"></div>`;
const button = (top: number, height = 30): string =>
  `<button id="target" style="position:fixed;top:${String(top)}px;left:20px;width:100px;height:${String(height)}px;margin:0;border:0;padding:0">b</button>`;

afterEach(() => {
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
});

describe("checkObscured", () => {
  it("reports hidden when a fixed header covers the whole element", () => {
    const root = fixture(HEADER + button(10));
    const result = checkObscured(byId(root, "target"));
    expect(result.status).toBe("hidden");
    expect(result.coveredBy).toEqual([byId(root, "header")]);
  });

  it("reports partial when the header covers part of the element", () => {
    const root = fixture(HEADER + button(30, 40));
    expect(checkObscured(byId(root, "target")).status).toBe("partial");
  });

  it("reports ok for an uncovered element, including one flush against the header edge", () => {
    const root = fixture(HEADER + button(50));
    expect(checkObscured(byId(root, "target"))).toEqual({ status: "ok", coveredBy: [] });
  });

  it("reports offscreen when no part of the element is in the viewport", () => {
    const root = fixture(`<button id="target" style="position:fixed;top:-500px;left:0">b</button>`);
    expect(checkObscured(byId(root, "target")).status).toBe("offscreen");
  });

  it("looks through tool-owned nodes to what is underneath", () => {
    const tool = `<div data-a11y-playpen-tool="x" style="position:fixed;top:0;left:0;width:400px;height:200px;z-index:99"></div>`;
    const uncovered = fixture(tool + button(100));
    expect(checkObscured(byId(uncovered, "target")).status).toBe("ok");
    uncovered.remove();
    const covered = fixture(tool + HEADER + button(10));
    expect(checkObscured(byId(covered, "target")).status).toBe("hidden");
  });

  it("does not count the shadow host as a coverer when sample points fall between wrapped lines", () => {
    const root = fixture(`<div id="host" style="position:fixed;top:100px;left:0;width:120px;padding:20px"></div>`);
    const shadow = byId(root, "host").attachShadow({ mode: "open" });
    shadow.innerHTML = `some words then <a href="#">a link inside shadow that wraps onto the next line</a> end`;
    const inner = shadow.querySelector("a");
    if (inner === null) throw new Error("inner missing");
    expect(checkObscured(inner).status).toBe("ok");
  });

  it("reports ok for an inline link that wraps across lines", () => {
    const root = fixture(
      `<p style="position:fixed;top:100px;left:0;width:120px;margin:0">some words then <a id="target" href="#">a link that wraps onto the next line</a> end</p>`,
    );
    expect(checkObscured(byId(root, "target")).status).toBe("ok");
  });

  it("clips to overflow ancestors instead of reporting the clipped part as covered", () => {
    const root = fixture(
      // Only the button's top 10px shows inside the scroller; the clipped rest would otherwise hit the red block.
      `<div style="position:fixed;top:100px;left:0;width:200px;height:40px;overflow:hidden">
         <button id="target" style="position:relative;top:30px;width:100px;height:30px;margin:0;border:0;padding:0">b</button>
       </div>
       <div style="position:fixed;top:140px;left:0;width:200px;height:100px;background:red"></div>`,
    );
    expect(checkObscured(byId(root, "target")).status).toBe("ok");
  });
});
