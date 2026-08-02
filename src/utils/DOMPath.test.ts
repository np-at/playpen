import { describe, expect, it } from "vitest";
import { xPath } from "./DOMPath.ts";

describe("xPath", () => {
  it("escapes an optimized id containing both quote styles", () => {
    const element = document.createElement("button");
    element.id = 'save"and\'continue';
    document.body.appendChild(element);

    const path = xPath(element, true);

    expect(document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue).toBe(element);
    element.remove();
  });

  it("indexes text and comment nodes among childNodes", () => {
    const element = document.createElement("div");
    element.append("first", "second");
    element.append(document.createComment("one"), document.createComment("two"));
    document.body.appendChild(element);

    expect(element.childNodes).toHaveLength(4);
    const secondText = element.childNodes[1];
    const secondComment = element.childNodes[3];
    expect(xPath(secondText)).toContain("text()[2]");
    expect(xPath(secondComment)).toContain("comment()[2]");
    element.remove();
  });
});
