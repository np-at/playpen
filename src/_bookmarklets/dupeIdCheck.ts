import { drawBox } from "../utils/drawUtils";


const dupBoxId = "dupIdBox";

function makeDisplay(): HTMLElement {
  const existingDisplay = document.getElementById("a11y-bookmarklet") as HTMLDialogElement | null;
  if (existingDisplay) {
    existingDisplay.show();
    const wrapper: HTMLDivElement | null = existingDisplay.querySelector("div.content-wrapper");
    if (!wrapper)
      throw new Error("existing display's content wrapper not found")
    wrapper.innerHTML = "";
    return wrapper;
  }
  const display = document.createElement("dialog");

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
  display.id = "a11y-bookmarklet";
  makeCloseButton(display);

  const contentWrapper = document.createElement("div");
  contentWrapper.classList.add("content-wrapper");
  contentWrapper.style.maxHeight = "15vh";
  contentWrapper.style.overflow = "auto";
  display.appendChild(contentWrapper);

  document.body.appendChild(display);
  display.show();
  return contentWrapper;
}

function cleanUp(ds?: HTMLDialogElement): void {
  document.querySelectorAll(`#${dupBoxId}`).forEach((x) => {
    x.remove();
  });
  ds?.remove();
}

function makeCloseButton(display: HTMLDialogElement): HTMLButtonElement {
  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.style.position = "absolute";
  closeButton.style.top = "0";
  closeButton.style.right = "0";
  closeButton.style.zIndex = "1000001";
  closeButton.onclick = () => {
    cleanUp(display);
  };
  display.appendChild(closeButton);
  return closeButton;
}


function findDuplicates(): Array<[string, Element[]]> {
  const ids = new Map<string, Element[]>();
  const all = document.querySelectorAll("[id]");
  all.forEach((x) => {
    if (x.id && x.id !== dupBoxId) {
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

function collectDuplicates(ds: HTMLElement): void {

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
          drawBox(x, "DupeId", undefined, undefined, dupBoxId, i !== 0);
        });
      });
      l.appendChild(header);
      const list = document.createElement("ul");
      list.style.listStyleType = "square";
      header.after(list);
      v.forEach((x) => {
        const p = document.createElement("li");
        p.addEventListener("mouseover", () => {
          drawBox(x, "DupeId", undefined, undefined, dupBoxId);
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

const ds = makeDisplay();
collectDuplicates(ds);
