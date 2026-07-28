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

/* ---------- theme ---------- */

// "auto" follows the OS; light/dark pin one side. All the CSS reads off `color-scheme`,
// so switching is nothing but stamping (or clearing) data-theme on <html>.
type Theme = "auto" | "light" | "dark";
const THEMES: readonly Theme[] = ["auto", "light", "dark"];
const isTheme = (x: string | null): x is Theme => THEMES.includes(x as Theme);

const themeButton = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-toggle-label");
const themeStatus = document.getElementById("theme-status");
assert(themeButton !== null, "Theme toggle not found");
assert(themeLabel !== null, "Theme toggle label not found");
assert(themeStatus !== null, "Theme status not found");

// localStorage throws outright in some privacy modes; a broken toggle shouldn't take the page with it
const storage = {
  read(): string | null {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  },
  write(value: Theme): void {
    try {
      if (value === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", value);
    } catch {
      /* not persisted; the toggle still works for this page view */
    }
  },
};

const stored = storage.read();
let theme: Theme = isTheme(stored) ? stored : "auto";

const applyTheme = (next: Theme, announce: boolean): void => {
  theme = next;
  if (next === "auto") delete document.documentElement.dataset["theme"];
  else document.documentElement.dataset["theme"] = next;
  storage.write(next);
  themeLabel.innerText = `Theme: ${next}`;
  if (announce) {
    const resolved = next === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
    themeStatus.innerText = `Theme set to ${next}${next === "auto" ? ` (currently ${resolved})` : ""}.`;
  }
};

applyTheme(theme, false);
themeButton.addEventListener("click", () => {
  applyTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? "auto", true);
});

/* ---------- content ---------- */

const root = document.getElementById("main");
const bookmarkletCount = document.getElementById("bookmarklet-count");

const demoGrid = document.getElementById("demo-grid");
const demoCount = document.getElementById("demo-count");
assert(demoGrid !== null, "Demo grid not found");

/** "demos/sticky-banner" -> "Sticky Banner", "demos/radiogroups/radiogroup_test" -> "Radiogroup Test" */
const prettify = (path: string): string =>
  (path.split("/").pop() ?? path)
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

let demos = 0;
for (const key in htmlFiles) {
  const short = key.replace(/\/?(?:index)?\.html$/, "");
  if (short === "") {
    continue;
  }
  demos++;

  const tile = document.createElement("div");
  tile.className = "tile";
  const tileLink = document.createElement("a");
  tileLink.className = "tile__link";
  tileLink.href = key;
  tileLink.innerText = prettify(short);
  const hint = document.createElement("span");
  hint.className = "tile__hint";
  hint.innerText = short;
  tile.append(tileLink, hint);
  demoGrid.appendChild(tile);
}
if (demoCount) demoCount.innerText = String(demos);

const makeLink = (x: string, name: string): void => {
  assert(root !== null, "Root element not found");
  const tile = document.createElement("div");
  tile.classList.add("tile");
  const anchorElement = document.createElement("a");
  anchorElement.classList.add("tile__link");
  anchorElement.href = x;
  anchorElement.innerText = name;
  anchorElement.id = short_uuid();
  anchorElement.draggable = true;
  const hint = document.createElement("span");
  hint.className = "tile__hint";
  hint.innerText = "drag to bookmarks";
  tile.append(anchorElement, hint);
  tile.dataset["name"] = name;

  // Insert the new tile in sorted order
  // could optimize by doing a binary search, but since the number of links is likely small, a linear search is probably fine
  const sortKey = (el: Element): string => (el instanceof HTMLElement ? (el.dataset["name"] ?? "") : "");
  const existingLinks = [...root.children].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const insertIndex = existingLinks.findIndex((child) => sortKey(child).localeCompare(name) > 0);
  if (insertIndex === -1) {
    root.appendChild(tile);
  } else {
    root.insertBefore(tile, existingLinks[insertIndex]);
  }
  if (bookmarkletCount) bookmarkletCount.innerText = String(root.children.length);
};
