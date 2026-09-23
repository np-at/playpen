import { afterEach, describe, expect, it } from "vitest";
import { computeTabOrder, findBackwardJumps } from "./tabOrder.ts";

const fixtures: Element[] = [];

function fixture(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.appendChild(container);
  fixtures.push(container);
  return container;
}

const ids = (elements: Element[]): string[] => elements.map((element) => element.id);

afterEach(() => {
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
});

describe("computeTabOrder", () => {
  it("puts positive tabindex first in ascending order, then tabindex 0 in DOM order", () => {
    const root = fixture(`
      <button id="a">a</button>
      <span id="b" tabindex="2">b</span>
      <a id="c" href="#">c</a>
      <span id="d" tabindex="1">d</span>
      <span id="e" tabindex="2">e</span>
      <span id="f" tabindex="-1">f</span>
    `);
    expect(ids(computeTabOrder(root))).toEqual(["d", "b", "e", "a", "c"]);
  });

  it("skips hidden, disabled, inert, and bookmarklet-owned elements", () => {
    const root = fixture(`
      <button id="ok">ok</button>
      <button id="none" style="display:none">x</button>
      <button id="vis" style="visibility:hidden">x</button>
      <button id="dis" disabled>x</button>
      <fieldset disabled><input id="fs"></fieldset>
      <div inert><button id="inert">x</button></div>
      <a id="nohref">x</a>
      <div data-a11y-playpen-tool="some-tool"><button id="tool">x</button></div>
    `);
    expect(ids(computeTabOrder(root))).toEqual(["ok"]);
  });

  it("inserts open shadow content and slotted light DOM at the host position", () => {
    const root = fixture(
      `<button id="before">b</button><div id="host"><button id="slotted">s</button></div><button id="after">a</button>`,
    );
    const host = root.querySelector("#host");
    if (host === null) throw new Error("host missing");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<button id="inner1">1</button><slot></slot><button id="inner2">2</button>`;
    expect(ids(computeTabOrder(root))).toEqual(["before", "inner1", "slotted", "inner2", "after"]);
  });
});

describe("findBackwardJumps", () => {
  const rect = (left: number, top: number, width = 50, height = 20): DOMRect => new DOMRect(left, top, width, height);

  it("returns nothing for reading order", () => {
    expect(findBackwardJumps([rect(0, 0), rect(100, 0), rect(0, 40), rect(100, 40)])).toEqual([]);
  });

  it("flags a jump up the page and a right-to-left jump on the same row", () => {
    // 0 -> 1 fine, 1 -> 2 goes up, 2 -> 3 goes left on the same row
    expect(findBackwardJumps([rect(0, 0), rect(0, 100), rect(200, 0), rect(100, 5)])).toEqual([2, 3]);
  });
});
