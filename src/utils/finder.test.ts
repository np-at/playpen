import { afterEach, describe, expect, it } from "vitest";
import { collectSelectorRoots, findSelector, formatSelector } from "./finder.ts";

const fixtures: Element[] = [];

function fixture(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.appendChild(container);
  fixtures.push(container);
  return container;
}

function required<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) throw new Error(`${description} was not created`);
  return value;
}

function expectSupported(target: Element): void {
  const result = findSelector(target);
  expect(result.supported).toBe(true);
  if (!result.supported) throw new Error(result.reason);
  expect(result.root.querySelector(result.selector)).toBe(target);
}

afterEach(() => {
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
});

describe("findSelector", () => {
  it("does not trust a duplicate id as a unique selector", () => {
    const root = fixture('<div id="reused"></div><button id="reused">Save</button>');
    const target = required(root.querySelector("button"), "button target");

    expectSupported(target);
  });

  it("escapes CSS-special characters in ids and classes", () => {
    const root = fixture('<button id="save:now" class="button.primary">Save</button>');

    expectSupported(required(root.querySelector("button"), "button target"));
  });

  it("keeps a unique ancestor class in the selector path", () => {
    const root = fixture('<section class="scope"><button>Save</button></section><section><button>Save</button></section>');
    const target = required(root.querySelector(".scope button"), "scoped button target");

    const result = findSelector(target);
    expect(result).toMatchObject({ supported: true, selector: ".scope > button", root: document });
  });

  it.each([0, 1, 2])("selects sibling %i without an off-by-one position", (index) => {
    const root = fixture("<ul><li>first</li><li>middle</li><li>last</li></ul>");
    const target = required(root.querySelectorAll("li")[index], "sibling target");

    expectSupported(target);
  });

  it("selects SVG and MathML elements", () => {
    const root = fixture('<svg><circle></circle></svg><math><mi>x</mi></math>');

    expectSupported(required(root.querySelector("circle"), "SVG circle target"));
    expectSupported(required(root.querySelector("mi"), "MathML mi target"));
  });

  it("returns an open shadow root as the selector context", () => {
    const host = required(fixture("<div></div>").firstElementChild, "shadow host");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Save</button>";
    const target = required(shadow.querySelector("button"), "shadow button target");

    const result = findSelector(target);

    expect(result).toMatchObject({ supported: true, root: shadow, rootType: "shadow-root" });
    if (result.supported) expect(result.root.querySelector(result.selector)).toBe(target);
  });

  it("returns a same-origin iframe document as the selector context", () => {
    const frame = required(fixture("<iframe></iframe>").querySelector("iframe"), "iframe");
    const frameDocument = required(frame.contentDocument, "iframe document");
    frameDocument.body.innerHTML = '<button id="frame-button">Save</button>';
    const target = required(frameDocument.querySelector("button"), "iframe button target");

    const result = findSelector(target);

    expect(result).toMatchObject({ supported: true, root: frameDocument, rootType: "document" });
    if (result.supported) expect(result.root.querySelector(result.selector)).toBe(target);
  });

  it("reports a closed shadow root explicitly", () => {
    const host = required(fixture("<div></div>").firstElementChild, "closed shadow host");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = "<button>Save</button>";

    expect(findSelector(required(shadow.querySelector("button"), "closed-shadow button target"))).toMatchObject({
      supported: false,
      reason: "closed-shadow-root",
    });
  });

  it("collects open shadow roots and same-origin iframe documents with their real contexts", () => {
    const host = required(fixture("<div></div>").firstElementChild, "shadow host");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Shadow</button>";
    const frame = required(fixture("<iframe></iframe>").querySelector("iframe"), "iframe");
    const frameDocument = required(frame.contentDocument, "iframe document");
    frameDocument.body.innerHTML = "<button>Frame</button>";

    const roots = collectSelectorRoots(document);

    expect(roots.supported).toEqual(expect.arrayContaining([document, shadow, frameDocument]));
    expect(roots.unsupported).toEqual([]);
  });

  it("reports an unreadable iframe without fetching it", () => {
    const frame = required(fixture("<iframe></iframe>").querySelector("iframe"), "iframe");
    Object.defineProperty(frame, "contentDocument", {
      configurable: true,
      get: () => {
        throw new DOMException("Denied", "SecurityError");
      },
    });

    const roots = collectSelectorRoots(document);

    expect(roots.unsupported).toEqual([{ reason: "cross-origin-iframe", frame }]);
  });

  it("continues into nested same-origin iframe documents across window realms", () => {
    const frame = required(fixture("<iframe></iframe>").querySelector("iframe"), "iframe");
    const frameDocument = required(frame.contentDocument, "iframe document");
    frameDocument.body.innerHTML = "<iframe></iframe>";
    const nestedFrame = required(frameDocument.querySelector("iframe"), "nested iframe");
    const nestedDocument = required(nestedFrame.contentDocument, "nested iframe document");
    nestedDocument.body.innerHTML = "<button>Nested frame</button>";

    const roots = collectSelectorRoots(document);

    expect(roots.supported).toContain(nestedDocument);
  });

  it("formats a shadow-root selector with the host context consumers need to resolve it", () => {
    const host = required(fixture("<div id=host></div>").firstElementChild, "shadow host");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Save</button>";

    const result = findSelector(required(shadow.querySelector("button"), "shadow button target"));

    expect(formatSelector(result)).toContain("top-document > shadow-root(#host) :: button");
  });

  it("formats an iframe selector with its document boundary", () => {
    const frame = required(fixture('<iframe id="frame"></iframe>').querySelector("iframe"), "iframe");
    const frameDocument = required(frame.contentDocument, "iframe document");
    frameDocument.body.innerHTML = '<button id="frame-button">Save</button>';

    const result = findSelector(required(frameDocument.querySelector("button"), "iframe button target"));

    expect(formatSelector(result)).toContain("top-document > iframe(#frame) > document :: #frame-button");
  });
});
