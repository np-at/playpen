import { expect, it } from "vitest";
import { isElRendered } from "./isElRendered.ts";

it("recognizes an iframe-realm element hidden by a closed details ancestor", () => {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  if (frameDocument === null) throw new Error("iframe document was not created");
  frameDocument.body.innerHTML = "<details><summary>More</summary><div id=hidden>Hidden</div></details>";
  const hidden = frameDocument.getElementById("hidden");
  if (hidden === null) throw new Error("iframe hidden element was not created");

  expect(isElRendered(hidden)).toBe(false);

  frame.remove();
});

it("treats an element from a document without a window as not rendered", () => {
  const detachedDocument = document.implementation.createHTMLDocument("detached");
  const element = detachedDocument.createElement("div");
  detachedDocument.body.appendChild(element);

  expect(isElRendered(element)).toBe(false);
});
