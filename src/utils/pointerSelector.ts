// import type {PointerSelector} from "./PointerSelectorClass";
//
// declare global {
//     // noinspection JSUnusedGlobalSymbols
//     interface Window {
//         PointerSelector: PointerSelector;
//     }
// }
// // noinspection SpellCheckingInspection
// const _pointerSelectorClassName = "phlffobkmklt";
// let _pointerSelector: HTMLElement;
// let _latestCoordinates: { x: number; y: number } = {x: 0, y: 0};
// let _debounceTimer: string | number | NodeJS.Timeout | undefined;
//
// // This is a helper function to help you find the element you want to click on.
// // It will create a red box around the element you hover over.
// // You can pass a click handler that will be called when you click on the element.
// // If you return true from the click handler, the pointer selector element will be removed.
// function createPointerSelector(
//     clickHandler?: (e: HTMLElement) => boolean
// ): boolean {
//     if (_pointerSelector) {
//         console.warn("Pointer selector already exists");
//         return false;
//     }
//
//     function clickHandlerResolver(_: MouseEvent): void {
//         const t = getTargetFromCachedCoords();
//         // console.debug("clickHandlerResolver target", t)
//
//         if (clickHandler?.(t) === true) {
//             document
//                 .getElementById(_pointerSelectorClassName)
//                 ?.removeEventListener("click", clickHandlerResolver);
//             document
//                 .getElementById(_pointerSelectorClassName)
//                 ?.removeEventListener("mouseover", pointerSelectorMouseEventForwarder);
//             document.getElementById(_pointerSelectorClassName)?.remove();
//         }
//     }
//
//     _pointerSelector = document.createElement("div");
//     _pointerSelector.className = _pointerSelectorClassName;
//     _pointerSelector.style.position = "absolute";
//     _pointerSelector.id = _pointerSelectorClassName;
//     _pointerSelector.style.zIndex = "999999999999";
//     _pointerSelector.style.border = "2px solid red";
//     _pointerSelector.style.outline = "2px solid orange";
//     _pointerSelector.style.outlineOffset = "2px";
//     _pointerSelector.style.opacity = "0.5";
//     if (typeof clickHandler === "function") {
//         _pointerSelector.style.pointerEvents = "auto";
//         _pointerSelector.addEventListener("click", clickHandlerResolver, {
//             passive: true,
//             once: false,
//         });
//         _pointerSelector.addEventListener("mousemove", pointerSelectorMouseEventForwarder, {
//             passive: false,
//             once: false,
//             capture: true,
//         })
//         _pointerSelector.addEventListener(
//             "mouseover",
//             pointerSelectorMouseEventForwarder,
//             {
//                 passive: false,
//                 once: false,
//                 capture: true,
//             }
//         );
//     } else {
//         _pointerSelector.style.pointerEvents = "none";
//     }
//     _pointerSelector = document.body.appendChild(_pointerSelector);
//     return true;
// }
//
// const getTargetFromCachedCoords: () => HTMLElement = () => {
//     _pointerSelector.style.display = "none";
//     const t = document.elementFromPoint(
//         _latestCoordinates.x,
//         _latestCoordinates.y
//     ) as HTMLElement;
//     _pointerSelector.style.display = "block";
//     return t
//
// };
//
// function forwardEvent(e: MouseEvent): void {
//     // _pointerSelector.style.display = "none";
//     const lowerEl = getTargetFromCachedCoords();
//
//     let eventType = e.type;
//     switch (e.type) {
//         case "click":
//         case "mouseover":
//         case "mousemove":
//             eventType = "mouseover";
//             break;
//         default:
//             console.log("hit default with event, ", e)
//             return
//
//     }
//
//     lowerEl?.dispatchEvent(
//         new MouseEvent(eventType, {
//             bubbles: true,
//
//         })
//     );
//
//     _debounceTimer = undefined;
// }
//
// function pointerSelectorMouseEventForwarder(e: MouseEvent): void {
//     // _pointerSelector.style.pointerEvents = "none";
//
//     e.stopPropagation();
//     // forwardEvent(e)
//     _latestCoordinates = {x: e.pageX, y: e.pageY};
//     if (_debounceTimer) {
//         clearTimeout(_debounceTimer);
//     }
//     if (e.type === "click") {
//         forwardEvent(e)
//     } else {
//         _debounceTimer = setTimeout(() => {
//             forwardEvent(e)
//         }, 100);
//
//     }
//
//     // _pointerSelector.style.pointerEvents = "auto";
// }
//
// function adjustPointerSelector(target: HTMLElement): void {
//
//     const {x: x1, y: y1, height, width} = target.getBoundingClientRect();
//     // const y2 = y1 + height;
//     // const x2 = x1 + width;
//     // const pointerSelector = document.getElementById(
//     //   _pointerSelectorClassName
//     // ) as HTMLElement;
//     _pointerSelector.style.top = `${y1 + window.scrollY}px`;
//     _pointerSelector.style.left = `${x1 + window.scrollX}px`;
//     _pointerSelector.style.width = `${width}px`;
//     _pointerSelector.style.height = `${height}px`;
// }
//
// function mouseoverHandler(
//     e: MouseEvent,
//     callback?: (me: HTMLElement) => void
// ): void {
//     // console.log("mouseoverHandler called", e)
//
//     const target = e.target as HTMLElement;
//     // if (target === document.firstElementChild) return;
//     adjustPointerSelector(target);
//     callback?.(target);
// }
//
// // Creates a pointer selector that will create a red box around the element you hover over.
// // You can pass a click handler that will be called when you click on the element.
// // If you return true from the click handler, the pointer selector element will be removed.
// //
// // You can also pass a hover handler that will be called when you hover over an element.
// function createPointerSelectorListener(
//     hoverCallback?: (t: HTMLElement) => void,
//     clickCallback?: (t: HTMLElement) => boolean
// ): void {
//     if (!createPointerSelector(clickCallback)) return;
//
//
//     document.addEventListener(
//         "mouseover",
//         (e) => {
//             mouseoverHandler(e, hoverCallback);
//         },
//         {
//             passive: true,
//             once: false,
//         }
//     );
// }
