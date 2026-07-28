import { getName } from "aria-api";
import { drawBox, type DrawStyleProps, ensureBoundingStyleAvailable } from "../utils/drawUtils";
import { makeDraggableDisplay } from "../utils/makeDraggableOverlay";
import { finder } from "../utils/finder";
import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle";

const rel_showImageAlt = "aria-show-image-alt" as const;
let _displayDiv: HTMLDivElement | undefined;
function displayDiv(lifecycle: BookmarkletLifecycle): HTMLDivElement {
  if (!_displayDiv?.isConnected) {
    _displayDiv = createDisplayDiv(lifecycle);
  }
  return _displayDiv;
}

function createDisplayDiv(lifecycle: BookmarkletLifecycle): HTMLDivElement {
  const displayDiv = makeDraggableDisplay(lifecycle);
  displayDiv.id = "show-image-alt-display";
  displayDiv.style.minWidth = "200px";
  displayDiv.style.minHeight = "20px";
  displayDiv.style.padding = "5px";
  displayDiv.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  displayDiv.style.color = "black";
  displayDiv.style.border = "2px solid goldenrod";
  const displayList = document.createElement("ul");
  displayList.style.listStyle = "none";
  displayList.style.padding = "0";
  displayList.style.margin = "0";
  displayList.style.width = "100%";
  displayList.style.height = "100%";
  displayDiv.appendChild(displayList);
  document.body.appendChild(displayDiv);
  return displayDiv;
}
function addDisplayItem(lifecycle: BookmarkletLifecycle, text: string, style: DrawStyleProps, scrollTo?: string): void {
  const display = displayDiv(lifecycle);
  const item = document.createElement("li");
  item.innerText = text;
  Object.assign(item.style, style);
  if (scrollTo)
    item.onclick = () => {
      const el = document.querySelector(`[rel=${scrollTo}]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };
  display.appendChild(display.querySelector("ul") as HTMLUListElement);
}

type AltTextErr = {
  msg: string;
  el: Element;
};
/**
 * Testing comment
 * @param reset
 */
export default function _main(lifecycle: BookmarkletLifecycle): void {
  ensureBoundingStyleAvailable(lifecycle);

  const errors: AltTextErr[] = [];
  Array.from(document.querySelectorAll("img, svg, [role=img]")).forEach((el, index) => {
    let overlayText: string;

    const ATName = getName(el);
    const alt = el.getAttribute("alt");

    const style: DrawStyleProps = {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      color: "black",
    };
    switch (alt) {
      case "":
        overlayText = "[Presentational image]";
        break;
      case null:
        overlayText = "[Missing alt text]";
        style.backgroundColor = "rgba(255, 0, 0, 0.8)";
        style.color = "white";
        break;
      default:
        overlayText = alt;
        break;
    }
    if (alt && ATName) {
      if (alt !== ATName) {
        errors.push({ msg: `alt text "${alt}" does not match accessible name "${ATName}" for `, el });
        // console.warn(`alt text "${alt}" does not match accessible name "${ATName}" for `, el);
        style.borderColor = "goldenrod";
        overlayText = `WARN: accessible name does not match alt text\n Alt: ${alt}\n Accessible Name: ${ATName}`;
      }
    }
    drawBox(lifecycle, el, {
      append: index !== 0,
      content: overlayText,
      group: rel_showImageAlt,
      style,
      utilityName: rel_showImageAlt,
    });
    const selector = finder(el);
    addDisplayItem(lifecycle, overlayText, style, selector);
    // if (alt === "") {
    // }
    // if (alt === null || alt === undefined) {
    //     overlayText = "[Missing alt text]";
    //     style.backgroundColor = "rgba(255, 0, 0, 0.8)";
    //     style.color = "white";
    // }
  });
  if (errors.length) {
    console.warn(errors);
  }
}

const lifecycle = activateBookmarklet("show-image-alt");
if (lifecycle !== null) _main(lifecycle);
