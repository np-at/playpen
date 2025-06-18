import "./DialogPattern.css";

/**
 * Applies a callback function to all sibling elements of the given startNode.
 * Iterates over both next and previous siblings.
 * @param {Element} startNode - The element whose siblings will be processed.
 * @param {CallableFunction<Element>} cb - The callback function to apply to each sibling element.
 */
function applyToSiblings(startNode: Element, cb: (el: Element) => void) {
  let sibling: Element | null = startNode;
  while ((sibling = sibling.nextElementSibling) !== null) {
    cb(sibling);
  }
  sibling = startNode;
  while ((sibling = sibling.previousElementSibling) !== null) {
    cb(sibling);
  }
}

type MaybePromise<T> = Promise<T> | T;
const STRATEGY = {
  PERSIST: "PERSIST",
  COPY: "COPY",
};
const DIALOG_HIDDEN_ATTR = "data-dialog-hidden";
const DIALOG_ACTIVE_CLASS = "active";

export class DialogManager {
  backdrop: HTMLElement;
  private readonly openDialogList: HTMLElement[] = [];
  // private readonly dialogContentCallback: () => MaybePromise<HTMLElement>;

  constructor() {
    this.backdrop = document.createElement("div");
    this.backdrop.classList.add("dialog-backdrop");
    document.body.prepend(this.backdrop);
  }

  activateBackdrop() {
    this.backdrop.classList.add("active");
    if (this.openDialogList.length === 0) {
      applyToSiblings(this.backdrop, function (el) {
        el.setAttribute("inert", "");
        if (!el.hasAttribute("inert")) {
          el.setAttribute(DIALOG_ACTIVE_CLASS, "");
          el.setAttribute("inert", "");
        }
      });
    }
  }
  close() {}
  open(source: HTMLElement, beforeOpen?: (arg0: HTMLElement) => void) {
    this.backdrop.classList.add("active");
    const cloned = source.cloneNode(true) as HTMLElement;
    this.backdrop.appendChild(cloned);
    if (this.openDialogList.length > 0) {
      this.openDialogList[this.openDialogList.length - 1].setAttribute("inert", "");
    }
    this.openDialogList.push(cloned);
    cloned.classList.add("active");
  }

  // open<T extends keyof typeof STRATEGY>(strategy: T, source: HTMLElement) {
  //   this.backdrop.classList.add('active')
  //   switch (strategy) {
  //     case "COPY": {
  //       const wrapper = document.createElement("DIV");
  //       wrapper.setAttribute("aria-modal","true");
  //       wrapper.setAttribute('role', 'dialog');
  //       wrapper.setAttribute('tabindex','-1')
  //
  //       break;
  //     }
  //     case "PERSIST":
  //       break;
  //     default:
  //       throw new TypeError(`Invalid strategy chosen, found ${strategy}; supported values are ${Object.keys(STRATEGY).join()}.`);
  //   }
  //   // source.insertAdjacentElement("beforebegin");
  // }
}
