import { clearCurrentSelectionBoxes, drawBox } from "../utils/drawUtils";
import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle";

const DUPLICATE_OVERLAY_GROUP = "duplicate-id";

function makeDisplay(lifecycle: BookmarkletLifecycle): HTMLElement {
  const display = lifecycle.ownNode(document.createElement("dialog"));

  display.style.position = "fixed";
  display.style.top = "0";
  display.style.left = "0";
  display.style.zIndex = "1000000";
  display.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  display.style.padding = "10px";
  display.style.border = "1px solid black";
  display.style.borderRadius = "5px";
  display.style.maxWidth = "400px";
  display.style.overflow = "auto";
  display.style.maxHeight = "20vh";
  makeCloseButton(lifecycle, display);

  const contentWrapper = document.createElement("div");
  contentWrapper.classList.add("content-wrapper");
  contentWrapper.style.maxHeight = "15vh";
  contentWrapper.style.overflow = "auto";
  display.appendChild(contentWrapper);

  document.body.appendChild(display);
  display.show();
  return contentWrapper;
}

function cleanUp(lifecycle: BookmarkletLifecycle): void {
  clearCurrentSelectionBoxes(lifecycle);
  lifecycle.teardown();
}

function makeCloseButton(lifecycle: BookmarkletLifecycle, display: HTMLDialogElement): HTMLButtonElement {
  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.style.position = "absolute";
  closeButton.style.top = "0";
  closeButton.style.right = "0";
  closeButton.style.zIndex = "1000001";
  closeButton.onclick = () => {
    cleanUp(lifecycle);
  };
  display.appendChild(closeButton);
  return closeButton;
}

function findDuplicates(): Array<[string, Element[]]> {
  const ids = new Map<string, Element[]>();
  const all = document.querySelectorAll("[id]");
  all.forEach((x) => {
    if (x.closest("[data-a11y-playpen-tool]") !== null) return;
    if (x.id) {
      if (ids.has(x.id)) {
        ids.get(x.id)?.push(x);
      } else {
        ids.set(x.id, [x]);
      }
    }
  });
  return Array.from(ids.entries()).filter((x) => x[1].length > 1);
  // return new Map(Array.from(ids.entries()).filter((x) => x[1].length > 1));
}

function collectDuplicates(lifecycle: BookmarkletLifecycle, ds: HTMLElement): void {
  const duplicates = findDuplicates();
  if (duplicates.length === 0) {
    ds.innerText = "No duplicate IDs found";
  } else {
    ds.innerText = "Duplicate IDs found:";
    const topList = document.createElement("ul");
    topList.style.listStyleType = "square";
    ds.appendChild(topList);
    duplicates.forEach((i) => {
      const [k, v] = i;
      const l = document.createElement("li");
      l.style.display = "list-item";
      const header = document.createElement("h2");
      header.innerText = k;
      header.addEventListener("mouseover", () => {
        v.forEach((x, i) => {
          drawBox(lifecycle, x, {
            append: i !== 0,
            group: DUPLICATE_OVERLAY_GROUP,
            utilityName: "duplicate-id",
          });
        });
      });
      l.appendChild(header);
      const list = document.createElement("ul");
      list.style.listStyleType = "square";
      header.after(list);
      v.forEach((x) => {
        const p = document.createElement("li");
        p.addEventListener("mouseover", () => {
          drawBox(lifecycle, x, {
            group: DUPLICATE_OVERLAY_GROUP,
            utilityName: "duplicate-id",
          });
        });
        p.style.display = "list-item";
        p.innerText = truncateString(x.innerHTML.length > 100 ? x.outerHTML.replace(x.innerHTML, "...") : x.outerHTML, 50);
        list.appendChild(p);
      });
      topList.appendChild(l);
    });
  }
}

function truncateString(str: string, num: number): string {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + "...";
}

const lifecycle = activateBookmarklet("duplicate-id-check");
if (lifecycle !== null) {
  const ds = makeDisplay(lifecycle);
  collectDuplicates(lifecycle, ds);
}
