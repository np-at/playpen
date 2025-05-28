function dragElement(elmnt: HTMLElement): void {
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;
  const header = document.getElementById(elmnt.id + "header");
  if (header) {
    // if present, the header is where you move the DIV from:
    header.onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e: MouseEvent): void {
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e: MouseEvent): void {
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement(): void {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export function makeDraggableDisplay(): HTMLDivElement {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.top = "0";
  div.style.right = "0";
  div.style.width = "300px";
  div.style.height = "300px";
  div.style.zIndex = "999999";
  div.style.overflowY = "scroll";
  dragElement(div);
  return div;
}
