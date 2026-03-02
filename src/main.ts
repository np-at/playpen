import { assert } from "./utils/assert.ts";
import { short_uuid } from "./utils/stringUtils.ts";
import { htmlFiles } from "virtual:site-map";

void import("./_bookmarklets/fcs.ts?inlineTS").then((x) => {
  makeLink(x.default, "fcs");
});
void import("./_bookmarklets/Axify.ts?inlineTS").then((x) => {
  makeLink(x.default, "Axify");
});
void import("./_bookmarklets/AxifyTargeted.ts?inlineTS").then((x) => {
  makeLink(x.default, "AxifyTargeted");
});
void import("./_bookmarklets/ForceFocusOutline.ts?inlineTS").then((x) => {
  makeLink(x.default, "ForceFocusOutline");
});
void import("./_bookmarklets/TextSpacing.ts?inlineTS").then((x) => {
  makeLink(x.default, "TextSpacing");
});
void import("./_bookmarklets/MonitorAriaLive.ts?inlineTS").then((x) => {
  makeLink(x.default, "AriaLiveObserver");
});
void import("./_bookmarklets/showHeadings.ts?inlineTS").then((x) => {
  makeLink(x.default, "ShowHeadings");
});
void import("./_bookmarklets/FindDuplicateIds.ts?inlineTS").then((x) => {
  makeLink(x.default, "FindDuplicateIds");
});
void import("./_bookmarklets/HoverTest.ts?inlineTS").then((x) => {
  makeLink(x.default, "HoverTest");
});
void import("./_bookmarklets/IdentifyExplicitNames.ts?inlineTS").then((x) => {
  makeLink(x.default, "IdentifyExplicitNames");
});
void import("./_bookmarklets/ImageCheck.ts?inlineTS").then((x) => {
  makeLink(x.default, "ImageChecker");
});
void import("./_bookmarklets/Pathify.ts?inlineTS").then((x) => {
  makeLink(x.default, "Pathify");
});
void import("./_bookmarklets/MakeSkele.ts?inlineTS").then((x) => {
  makeLink(x.default, "MakeSkele");
});
void import("./_bookmarklets/ShowImageAlt.ts?inlineTS").then((x) => {
  makeLink(x.default, "ShowImageAlt");
});
void import("./_bookmarklets/dupeIdCheck.ts?inlineTS").then((x) => {
  makeLink(x.default, "DupeId");
});
void import("./_bookmarklets/TextObserver.ts?inlineTS").then((x) => {
  makeLink(x.default, "TextObserver");
});
void import("./_bookmarklets/FocusStyleCheck.ts?inlineTS").then((x) => {
  makeLink(x.default, "FocusStyleCheck");
});

// const root = document.querySelector("#root");
// const root = document.createElement("div");
// root.setAttribute("id", "root");
// document.body.appendChild(root);
const root = document.getElementById("main");

const tocRoot = document.getElementById("toc");
if (!tocRoot) throw new Error("TOC root not found");
for (const key in htmlFiles) {
  const short = key.replace(/\/?(?:index)?\.html$/, "");
  if (short === "") {
    continue;
  }
  const d = document.createElement("li");
  // d.classList.add("row");
  const a = document.createElement("a");
  a.href = key;
  a.innerText = short;
  d.appendChild(a);
  tocRoot.appendChild(d);
}

const makeLink = (x: string, name: string): void => {
  assert(root !== null, "Root element not found");
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("row");
  const anchorElement = document.createElement("a");
  anchorElement.href = x;
  anchorElement.innerText = name;
  anchorElement.id = short_uuid();
  rowDiv.appendChild(anchorElement);

  // Insert the new link in sorted order
  // could optimize by doing a binary search, but since the number of links is likely small, a linear search is probably fine
  const existingLinks = [...root.children].sort((a, b) => a.textContent.localeCompare(b.textContent));
  const insertIndex = existingLinks.findIndex((child) => child.textContent.localeCompare(name) > 0);
  if (insertIndex === -1) {
    root.appendChild(rowDiv);
  } else {
    root.insertBefore(rowDiv, existingLinks[insertIndex]);
  }
};
