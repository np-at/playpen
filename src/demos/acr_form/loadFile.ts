import { assert } from "../../utils/assert";
export function setupHandleFileSelect() {
  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (!target || !(target instanceof HTMLInputElement) || target.type !== "file") return;
    if (!(target.getAttribute("data-input-action")?.trim() === 'loadFile')) return;
    assert(event instanceof InputEvent, "event should be an InputEvent");
    loadFile(event);
  })
}
export function loadFile(event: InputEvent) {
  const btn = event.target;
  if (!btn || !(btn instanceof HTMLInputElement)) return;
  const screenshot = btn.nextElementSibling;
  assert(screenshot && screenshot instanceof HTMLImageElement, "screenshot element should be next sibling of the input");
  assert(btn.files && btn.files.length > 0, "no file selected");
  const modalbtn = document.createElement("button");
  const parentElement = screenshot.parentNode;
  assert(parentElement, "screenshot should have a parent element");
  modalbtn.setAttribute("class", "btn");
  modalbtn.setAttribute("data-bs-toggle", "modal");
  modalbtn.setAttribute("data-bs-target", "#exampleModal");

  screenshot.src = URL.createObjectURL(btn.files[0]);
  screenshot.alt = "issue screenshot";
  screenshot.style = "border: 1px solid black; width: 40px;";

  // set the wrapper as child (instead of the element)
  parentElement.replaceChild(modalbtn, screenshot);
  // set element as child of wrapper
  modalbtn.appendChild(screenshot);
  modalbtn.addEventListener("click", () => {
    const modalScreenshot = document.getElementById("modal-image img");
    // assert(modalimg, "modal image element should be present in the document");
    // const modalScreenshot = modalimg.querySelector("img");
    assert(modalScreenshot, "modal image element should have an img child");
    modalScreenshot.setAttribute("src", screenshot.src);
  });
  // const modalimg = document.getElementById("modal-image");
  // assert(modalimg, "modal image element should be present in the document");
  // const modalscreenshot = document.createElement("img");
  // modalscreenshot.setAttribute("src", screenshot.src);
  // modalscreenshot.setAttribute("alt", "screenshot");
  // modalscreenshot.setAttribute("style", "position: relative; width: 100%;");

  // modalimg.appendChild(modalscreenshot);

  /*screenshot.onload = function() {
URL.revokeObjectURL(screenshot.src) // free memory
}*/
}
