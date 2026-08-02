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
    const target = root.querySelector("button")!;

    expectSupported(target);
  });

  it("escapes CSS-special characters in ids and classes", () => {
    const root = fixture('<button id="save:now" class="button.primary">Save</button>');

    expectSupported(root.querySelector("button")!);
  });

  it("keeps a unique ancestor class in the selector path", () => {
    const root = fixture('<section class="scope"><button>Save</button></section><section><button>Save</button></section>');
    const target = root.querySelector(".scope button")!;

    const result = findSelector(target);
    expect(result).toMatchObject({ supported: true, selector: ".scope > button", root: document });
  });

  it.each([0, 1, 2])("selects sibling %i without an off-by-one position", (index) => {
    const root = fixture("<ul><li>first</li><li>middle</li><li>last</li></ul>");
    const target = root.querySelectorAll("li")[index]!;

    expectSupported(target);
  });

  it("selects SVG and MathML elements", () => {
    const root = fixture('<svg><circle></circle></svg><math><mi>x</mi></math>');

    expectSupported(root.querySelector("circle")!);
    expectSupported(root.querySelector("mi")!);
  });

  it("returns an open shadow root as the selector context", () => {
    const host = fixture("<div></div>").firstElementChild!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Save</button>";
    const target = shadow.querySelector("button")!;

    const result = findSelector(target);

    expect(result).toMatchObject({ supported: true, root: shadow, rootType: "shadow-root" });
    if (result.supported) expect(result.root.querySelector(result.selector)).toBe(target);
  });

  it("returns a same-origin iframe document as the selector context", () => {
    const frame = fixture("<iframe></iframe>").querySelector("iframe")!;
    const frameDocument = frame.contentDocument!;
    frameDocument.body.innerHTML = '<button id="frame-button">Save</button>';
    const target = frameDocument.querySelector("button")!;

    const result = findSelector(target);

    expect(result).toMatchObject({ supported: true, root: frameDocument, rootType: "document" });
    if (result.supported) expect(result.root.querySelector(result.selector)).toBe(target);
  });

  it("reports a closed shadow root explicitly", () => {
    const host = fixture("<div></div>").firstElementChild!;
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = "<button>Save</button>";

    expect(findSelector(shadow.querySelector("button")!)).toMatchObject({
      supported: false,
      reason: "closed-shadow-root",
    });
  });

  it("collects open shadow roots and same-origin iframe documents with their real contexts", () => {
    const host = fixture("<div></div>").firstElementChild!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Shadow</button>";
    const frame = fixture("<iframe></iframe>").querySelector("iframe")!;
    const frameDocument = frame.contentDocument!;
    frameDocument.body.innerHTML = "<button>Frame</button>";

    const roots = collectSelectorRoots(document);

    expect(roots.supported).toEqual(expect.arrayContaining([document, shadow, frameDocument]));
    expect(roots.unsupported).toEqual([]);
  });

  it("reports an unreadable iframe without fetching it", () => {
    const frame = fixture("<iframe></iframe>").querySelector("iframe")!;
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
    const frame = fixture("<iframe></iframe>").querySelector("iframe")!;
    const frameDocument = frame.contentDocument!;
    frameDocument.body.innerHTML = "<iframe></iframe>";
    const nestedFrame = frameDocument.querySelector("iframe")!;
    const nestedDocument = nestedFrame.contentDocument!;
    nestedDocument.body.innerHTML = "<button>Nested frame</button>";

    const roots = collectSelectorRoots(document);

    expect(roots.supported).toContain(nestedDocument);
  });

  it("formats a shadow-root selector with the host context consumers need to resolve it", () => {
    const host = fixture("<div id=host></div>").firstElementChild!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<button>Save</button>";

    const result = findSelector(shadow.querySelector("button")!);

    expect(formatSelector(result)).toContain("top-document > shadow-root(#host) :: button");
  });

  it("formats an iframe selector with its document boundary", () => {
    const frame = fixture('<iframe id="frame"></iframe>').querySelector("iframe")!;
    const frameDocument = frame.contentDocument!;
    frameDocument.body.innerHTML = '<button id="frame-button">Save</button>';

    const result = findSelector(frameDocument.querySelector("button")!);

    expect(formatSelector(result)).toContain("top-document > iframe(#frame) > document :: #frame-button");
  });
});
