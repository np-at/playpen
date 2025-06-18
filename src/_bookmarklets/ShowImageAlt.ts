import { getName, getRole } from "aria-api";
import { drawBox, type DrawStyleProps, ensureBoundingStyleAvailable } from "../utils/drawUtils";
import { makeDraggableDisplay } from "../utils/makeDraggableOverlay";
import { finder } from "../utils/finder";

const display_div_id = "show-image-alt-display" as const;
const rel_showImageAlt = "aria-show-image-alt" as const;
let _displayDiv: HTMLDivElement | undefined;
function displayDiv(): HTMLDivElement {
  if (!_displayDiv) {
    _displayDiv = (document.getElementById(display_div_id) as HTMLDivElement | null) ?? createDisplayDiv();
  }
  return _displayDiv;
}

const errorStyle: DrawStyleProps = {
  backgroundColor: "rgba(255, 0, 0, 0.8)",
  color: "white",
  borderColor: "goldenrod",
};
const warnStyle: DrawStyleProps = {
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  color: "black",
  borderColor: "goldenrod",
};
const okStyle: DrawStyleProps = {
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  color: "black",
  borderColor: "goldenrod",
};

function evaluateImg(el: HTMLElement): void {
  const alt = el.getAttribute("alt");
  const ATName = getName(el);
  const role = getRole(el);
}

function _reset(): void {
  console.debug("resetting");
  const s = Array.from(document.querySelectorAll(`[rel=${rel_showImageAlt}]`));
  // console.log("found", s)
  s.forEach((el) => {
    el.remove();
  });
}
function createDisplayDiv(): HTMLDivElement {
  const displayDiv = makeDraggableDisplay();
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
function addDisplayItem(text: string, style: DrawStyleProps, scrollTo?: string): void {
  const display = displayDiv();
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
export default function _main(reset: boolean = false): void {
  if (reset) {
    _reset();
  }

  ensureBoundingStyleAvailable();

  const errors: AltTextErr[] = [];
  Array.from(document.querySelectorAll("img, svg, [role=img]")).forEach((el) => {
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
    const { x, y } = el.getBoundingClientRect();
    const scrim = document.createElement("div");
    scrim.setAttribute("rel", rel_showImageAlt);
    scrim.style.left = `${x.toString(10)}px`;
    scrim.style.top = `${y.toString(10)}px`;
    scrim.style.width = `${el.clientWidth.toString(10)}px`;
    scrim.style.height = `${el.clientHeight.toString(10)}px`;
    scrim.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    scrim.style.position = "absolute";
    scrim.style.zIndex = "9999";
    scrim.style.pointerEvents = "none";
    document.body.appendChild(scrim);

    drawBox(scrim as HTMLElement, rel_showImageAlt, overlayText ?? "ERROR", style);
    const selector = finder(el);
    addDisplayItem(overlayText, style, selector);
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

if (document.querySelector(`[rel=${rel_showImageAlt}]`)) {
  _reset();
  _displayDiv?.remove();
} else {
  // probably could have been done with clever use of pseudo-elements
  // but, I'm not that clever
  let _timer: number | undefined;
  window.addEventListener("resize", () => {
    if (_timer) {
      window.clearTimeout(_timer);
    }
    _timer = window.setTimeout(() => {
      _main(true);
    }, 500);
  });
  _main();
}
