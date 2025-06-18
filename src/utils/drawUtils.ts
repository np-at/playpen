export function clearCurrentSelectionBoxes(): void {
  const nodes = Array.from(document.querySelectorAll("div.bounding-rect, div.segment-rect"));
  for (const element of nodes) {
    element.parentNode?.removeChild(element);
  }
}

export function drawFocusBox(selection: Element | null): void {
  clearCurrentSelectionBoxes();
  if (selection == null) {
    return;
  }
  console.debug(selection);
  const rect = selection.getBoundingClientRect();
  if (rect.width && rect.height) {
    const outline = document.createElement("div");
    outline.classList.add("bounding-rect");
    outline.style.top = rect.top.toString(10) + "px";
    outline.style.left = rect.left.toString(10) + "px";
    outline.style.width = rect.width.toString(10) + "px";
    outline.style.height = rect.height.toString(10) + "px";
    document.body.appendChild(outline);
  }
  // if (rect.top && rect.left)
  //   focusTrace.push([rect.left, rect.top]);
  // console.log("focus array ", focusTrace);
  // drawFocusTraceArrows();
}

export function ensureBoundingStyleAvailable(): void {
  const boundRule =
    "div.bounding-rect { pointer-events: none; border: 3px solid red; border-radius: 4px 4px 4px 4px; position: fixed; z-index: 10000;}";
  const sht: CSSStyleSheet = document.styleSheets[0];
  try {
    sht.insertRule(boundRule, sht.cssRules.length);
  } catch {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = boundRule.valueOf();
    document.head.appendChild(styleSheet);
  }
}
export type DrawStyleProps = Partial<CSSStyleDeclaration>;
const defaultStyle: DrawStyleProps = {
  backgroundColor: "transparent",
  color: "white",
  borderColor: "black",
  borderWidth: "2px",
  borderStyle: "solid",
  outline: "2px solid white",
};
/**
 * Draws a box around the specified element with optional content and styling.
 *
 * @param {HTMLElement} element - The HTML element around which the box will be drawn.
 * @param {string} utilityName - A name to associate with the utility.
 * @param {string} [content] - Optional content to display inside the box.
 * @param {DrawStyleProps} [style] - Optional styles to apply to the box.
 * @param {string} [id] - Optional ID to assign to the box element. If assigned, an element with the same ID will be removed before drawing the new box.
 * @param {boolean} skipRemoval - If true, existing elements with the same ID will not be removed.
 */

export function drawBox(
  element: Element,
  utilityName: string,
  content?: string,
  style?: DrawStyleProps,
  id?: string,
  skipRemoval = false,
): void {
  const blockDiv = document.createElement("div");

  if (id) {
    if (!skipRemoval) {
      document.querySelectorAll("#" + id).forEach((z) => {
        z.remove();
      });
    }
    // remove any existing element with the same ID (

    blockDiv.id = id;
  }
  const coords = element.getBoundingClientRect();
  // console.log("el", element)
  // console.log("coords", coords);
  blockDiv.setAttribute("rel", utilityName);
  blockDiv.className = "segment-rect";
  blockDiv.style.left = `${coords.left}px`; // `${coords.x + (coords.width / 2) - 100}px`;
  blockDiv.style.top = `${coords.top}px`; // `${coords.y + (coords.height / 2) - 10}px`;
  blockDiv.style.width = `${coords.width}px`;
  blockDiv.style.height = `${coords.height}px`;
  blockDiv.style.position = "absolute";
  blockDiv.style.zIndex = "10000";
  blockDiv.style.display = "block";
  blockDiv.style.maxWidth = `${coords.width}px`;
  blockDiv.style.maxHeight = `${coords.height}px`;
  // blockDiv.style.minWidth = "200px";
  blockDiv.style.overflowWrap = "break-word";
  blockDiv.style.padding = "0px";
  blockDiv.style.pointerEvents = "none";
  Object.assign(blockDiv.style, defaultStyle, style);
  // blockDiv.style.backgroundColor = style?.backgroundColor ?? 'black';
  // blockDiv.style.color = style?.color ?? 'white';
  // blockDiv.style.border = `2px solid ${style?.borderColor ?? 'black'}`;
  blockDiv.innerText = content ?? "";
  document.body.appendChild(blockDiv);
}
