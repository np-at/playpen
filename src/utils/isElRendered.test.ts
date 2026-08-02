import { afterEach, describe, expect, it } from "vitest";
import { isElAriaHidden, isElRendered } from "./isElRendered.ts";

afterEach(() => {
  document.body.replaceChildren();
});

function mount(markup: string): HTMLElement {
  document.body.innerHTML = markup;
  const element = document.body.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error("markup produced no element");
  return element;
}

function required(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`no HTMLElement matched ${selector}`);
  return element;
}

describe("isElRendered", () => {
  it("treats the closed details element itself as rendered", () => {
    const details = mount("<details><summary>More</summary><div>Hidden</div></details>");

    expect(isElRendered(details)).toBe(true);
  });

  it("treats content outside the first summary of closed details as not rendered", () => {
    const details = mount("<details><summary>More</summary><div id=content>Hidden</div></details>");

    expect(isElRendered(required(details, "#content"))).toBe(false);
  });

  it("treats the first summary and its descendants as rendered in closed details", () => {
    const details = mount("<details><summary id=summary>More <span id=label>details</span></summary></details>");

    expect(isElRendered(required(details, "#summary"))).toBe(true);
    expect(isElRendered(required(details, "#label"))).toBe(true);
  });

  it("does not treat a later summary as the disclosure control", () => {
    const details = mount("<details><summary>First</summary><summary id=later>Later</summary></details>");

    expect(isElRendered(required(details, "#later"))).toBe(false);
  });

  it("walks through an open shadow root to a hidden host", () => {
    const host = mount('<div style="display:none"></div>');
    const root = host.attachShadow({ mode: "open" });
    const target = document.createElement("span");
    root.appendChild(target);

    expect(isElRendered(target)).toBe(false);
  });

  it("treats display:none and content-visibility:hidden ancestors as not rendered", () => {
    const displayParent = mount('<div style="display:none"><span id=display-child></span></div>');
    expect(isElRendered(required(displayParent, "#display-child"))).toBe(false);

    const contentVisibilityParent = mount('<div style="content-visibility:hidden"><span id=content-visibility-child></span></div>');
    expect(isElRendered(required(contentVisibilityParent, "#content-visibility-child"))).toBe(false);
  });

  it("treats visibility:hidden as not rendered but honors a visible descendant override", () => {
    const parent = mount(
      '<div style="visibility:hidden"><span id=hidden></span><span id=visible style="visibility:visible"></span></div>',
    );

    expect(isElRendered(required(parent, "#hidden"))).toBe(false);
    expect(isElRendered(required(parent, "#visible"))).toBe(true);
  });

  it("keeps visual rendering independent from aria-hidden", () => {
    const parent = mount('<div aria-hidden="true"><span id=child></span></div>');

    expect(isElRendered(required(parent, "#child"))).toBe(true);
  });

  it("finds an aria-hidden shadow host", () => {
    const host = mount('<div aria-hidden="true"></div>');
    const root = host.attachShadow({ mode: "open" });
    const target = document.createElement("span");
    root.appendChild(target);

    expect(isElAriaHidden(target)).toBe(true);
  });

  it("finds an aria-hidden same-origin iframe element", () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    if (frameDocument === null) throw new Error("iframe document was not created");

    expect(isElAriaHidden(frameDocument.body)).toBe(true);
  });

  it("treats disconnected elements as not rendered", () => {
    expect(isElRendered(document.createElement("div"))).toBe(false);
  });

  it("uses an iframe element's own window for computed style", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    if (frameDocument === null) throw new Error("iframe document was not created");
    frameDocument.body.innerHTML = '<div style="content-visibility:hidden"><span id=hidden></span></div>';
    const hidden = frameDocument.getElementById("hidden");
    if (hidden === null) throw new Error("iframe hidden element was not created");

    expect(isElRendered(hidden)).toBe(false);
  });

  it("treats an element from a document without a window as not rendered", () => {
    const detachedDocument = document.implementation.createHTMLDocument("detached");
    const element = detachedDocument.createElement("div");
    detachedDocument.body.appendChild(element);

    expect(isElRendered(element)).toBe(false);
  });
});
