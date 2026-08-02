import { afterEach, describe, expect, it, vi } from "vitest";
import { applyToShadows } from "./applyToShadows.ts";
import { digIntoIframes } from "./digIntoIframes.ts";

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

afterEach(() => {
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
  vi.restoreAllMocks();
});

describe("bookmarklet root traversal", () => {
  it("returns a synchronous snapshot of nested same-origin iframe documents and skipped cross-origin frames", () => {
    const outerFrame = required(fixture("<iframe></iframe>").querySelector("iframe"), "outer iframe");
    const outerDocument = required(outerFrame.contentDocument, "outer iframe document");
    outerDocument.body.innerHTML = "<iframe></iframe>";
    const innerFrame = required(outerDocument.querySelector("iframe"), "inner iframe");
    const innerDocument = required(innerFrame.contentDocument, "inner iframe document");
    const blockedFrame = required(fixture("<iframe></iframe>").querySelector("iframe"), "blocked iframe");
    Object.defineProperty(blockedFrame, "contentDocument", {
      configurable: true,
      get: () => {
        throw new DOMException("Denied", "SecurityError");
      },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const visited: Document[] = [];

    const snapshot = digIntoIframes(document, (frameDocument) => visited.push(frameDocument));

    expect(visited).toEqual(expect.arrayContaining([outerDocument, innerDocument]));
    expect(snapshot.visited).toEqual(expect.arrayContaining([document, outerDocument, innerDocument]));
    expect(snapshot.skipped).toEqual([{ reason: "cross-origin-iframe", frame: blockedFrame }]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("visits each open shadow root once and treats roots added after the scan as a later snapshot", () => {
    const host = required(fixture("<div></div>").firstElementChild, "shadow host");
    const firstShadow = host.attachShadow({ mode: "open" });
    const visited: ShadowRoot[] = [];

    const firstSnapshot = applyToShadows(document, (root) => visited.push(root));
    const laterHost = required(fixture("<div></div>").firstElementChild, "later shadow host");
    const laterShadow = laterHost.attachShadow({ mode: "open" });
    const secondSnapshot = applyToShadows(document, () => undefined);

    expect(visited.filter((root) => root === firstShadow)).toHaveLength(1);
    expect(firstSnapshot.visited).toContain(firstShadow);
    expect(firstSnapshot.visited).not.toContain(laterShadow);
    expect(secondSnapshot.visited).toContain(laterShadow);
  });
});
