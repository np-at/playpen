// function getTopZ() {
//   const centerX = window.innerWidth / 2;
//   const centerY = window.innerHeight / 2;
//   const el = document.elementFromPoint(centerX, centerY);
//   if (!el) {
//     throw new Error("no element found at ");
//   }
//   const z = window.getComputedStyle(el).zIndex;
//   if (z === "auto") {
//     return 0;
//   }
//   return parseInt(z, 10);
// }
//
// export type OpenDialogOptions =
//   | {
//       ariaLabel: string;
//     }
//   | {
//       ariaLabelledby: string;
//     };
// export default class DialogManager {
//   activeDialogs: HTMLElement[] = [];
//   root: HTMLElement;
//
//   public open(this: DialogManager, source: HTMLElement | string, opts: OpenDialogOptions): HTMLElement {
//     let _source: HTMLElement;
//     if (typeof source === "string") {
//       const s = Array.from(document.querySelectorAll(source));
//       if (s.length === 0) {
//         throw new Error(`Unable to locate element matching selector ${source}`);
//       }
//       if (s.length > 1) {
//         const err = new Error(`Multiple elements matching selector ${source} found`);
//         console.error(err, s);
//         throw err;
//       }
//       _source = s[0] as HTMLElement;
//     } else {
//       _source = source;
//     }
//     const newDialogContent = _source.cloneNode(true);
//   }
// }
