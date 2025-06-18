import { short_uuid } from "./utils/stringUtils.ts";

void import("ts:./_bookmarklets/fcs.ts").then((x) => { makeLink(x.default, "fcs"); });
void import("ts:./_bookmarklets/Axify.ts").then((x) => { makeLink(x.default, "Axify"); });
void import("ts:./_bookmarklets/AxifyTargeted.ts").then((x) => { makeLink(x.default, "AxifyTargeted"); });
void import("ts:./_bookmarklets/ForceFocusOutline.ts").then((x) => { makeLink(x.default, "ForceFocusOutline"); });
void import("ts:./_bookmarklets/TextSpacing.ts").then((x) => { makeLink(x.default, "TextSpacing"); });
void import("ts:./_bookmarklets/MonitorAriaLive.ts").then((x) => { makeLink(x.default, "AriaLiveObserver"); });
void import("ts:./_bookmarklets/showHeadings.ts").then((x) => { makeLink(x.default, "ShowHeadings"); });
void import("ts:./_bookmarklets/FindDuplicateIds.ts").then((x) => { makeLink(x.default, "FindDuplicateIds"); });
void import("ts:./_bookmarklets/HoverTest.ts").then((x) => { makeLink(x.default, "HoverTest"); });
void import("ts:./_bookmarklets/IdentifyExplicitNames.ts").then((x) => { makeLink(x.default, "IdentifyExplicitNames"); });
void import("ts:./_bookmarklets/ImageCheck.ts").then((x) => { makeLink(x.default, "ImageChecker"); });
void import("ts:./_bookmarklets/Pathify.ts").then((x) => { makeLink(x.default, "Pathify"); });
void import("ts:./_bookmarklets/MakeSkele.ts").then((x) => { makeLink(x.default, "MakeSkele"); });
void import("ts:./_bookmarklets/ShowImageAlt.ts").then((x) => { makeLink(x.default, "ShowImageAlt"); });
void import("ts:./_bookmarklets/dupeIdCheck.ts").then((x) => { makeLink(x.default, "DupeId"); });
void import("ts:./_bookmarklets/TextObserver.ts").then((x) => { makeLink(x.default, "TextObserver"); });
void import("ts:./_bookmarklets/FocusStyleCheck.ts").then((x) => { makeLink(x.default, "FocusStyleCheck"); });

// const root = document.querySelector("#root");
// const root = document.createElement("div");
// root.setAttribute("id", "root");
// document.body.appendChild(root);
const root = document.getElementById('main');
import { htmlFiles } from "virtual:site-map";


const tocRoot = document.getElementById('toc')
if (!tocRoot)
  throw new Error("TOC root not found")
for (const key in htmlFiles) {
  const short = key.replace(/\/?(?:index)?\.html$/,'');
  if (short === '') {
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
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("row");
  const anchorElement = document.createElement("a");
  anchorElement.href = x;
  anchorElement.innerText = name;
  anchorElement.id = short_uuid();
  rowDiv.appendChild(anchorElement);
  root?.appendChild(rowDiv);
};
