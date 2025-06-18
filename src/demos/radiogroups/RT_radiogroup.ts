import "./RT_radiogroup.module.css";
/*
 *   This content is licensed according to the W3C Software License at
 *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 *   File:   radio.js
 *
 *   Desc:   Radio group widget that implements ARIA Authoring Practices
 */
import { short_uuid } from "../../utils/stringUtils.ts";

export function createRTRadioGroup(root: HTMLElement, title: string, ...opts: string[]) {
  const localId = short_uuid();

  const group = document.createElement("div");
  const groupId = `g-${localId}`;
  const titleId = `t-${localId}`;

  group.setAttribute("id", groupId);
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-labelledby", titleId);
  const titleEl = document.createElement("h3");
  titleEl.id = titleId;
  titleEl.innerText = title;
  group.appendChild(titleEl);

  opts.forEach(function (opt, i) {
    const radioNode = document.createElement("div");
    radioNode.setAttribute("tabindex", i === 0 ? "0" : "-1");
    radioNode.setAttribute("role", "radio");
    radioNode.setAttribute("aria-checked", "false");
    radioNode.innerText = opt;
    group.appendChild(radioNode);
  });
  root.replaceWith(group);
}

export class RT_RadioGroup {
  groupNode: HTMLElement;
  radioButtons: HTMLElement[];
  firstRadioButton: HTMLElement;
  lastRadioButton: HTMLElement;

  constructor(groupNode: HTMLElement) {
    this.groupNode = groupNode;

    this.radioButtons = [];
    const rbs: HTMLElement[] = Array.from(this.groupNode.querySelectorAll("[role=radio]"));

    rbs.forEach((rb) => {
      rb.tabIndex = -1;
      rb.setAttribute("aria-checked", "false");

      rb.addEventListener("keydown", this.handleKeydown.bind(this));
      rb.addEventListener("click", this.handleClick.bind(this));
      rb.addEventListener("focus", this.handleFocus.bind(this));
      rb.addEventListener("blur", this.handleBlur.bind(this));

      this.radioButtons.push(rb);
    });
    this.firstRadioButton = rbs[0];
    this.lastRadioButton = rbs[rbs.length - 1];
    this.firstRadioButton.tabIndex = 0;
  }

  setChecked(currentItem: HTMLElement) {
    for (let i = 0; i < this.radioButtons.length; i++) {
      const rb = this.radioButtons[i];
      rb.setAttribute("aria-checked", "false");
      rb.tabIndex = -1;
    }
    currentItem.setAttribute("aria-checked", "true");
    currentItem.tabIndex = 0;
    currentItem.focus();
  }

  setCheckedToPreviousItem(currentItem: HTMLElement) {
    let index;

    if (currentItem === this.firstRadioButton) {
      this.setChecked(this.lastRadioButton);
    } else {
      index = this.radioButtons.indexOf(currentItem);
      this.setChecked(this.radioButtons[index - 1]);
    }
  }

  setCheckedToNextItem(currentItem: HTMLElement) {
    let index;

    if (currentItem === this.lastRadioButton) {
      this.setChecked(this.firstRadioButton);
    } else {
      index = this.radioButtons.indexOf(currentItem);
      this.setChecked(this.radioButtons[index + 1]);
    }
  }

  /* EVENT HANDLERS */

  handleKeydown(event: KeyboardEvent) {
    const tgt = event.currentTarget as HTMLElement | null;
    if (!tgt) return;
    let flag = false;

    switch (event.key) {
      case " ":
        this.setChecked(tgt);
        flag = true;
        break;

      case "Up":
      case "ArrowUp":
      case "Left":
      case "ArrowLeft":
        this.setCheckedToPreviousItem(tgt);
        flag = true;
        break;

      case "Down":
      case "ArrowDown":
      case "Right":
      case "ArrowRight":
        this.setCheckedToNextItem(tgt);
        flag = true;
        break;

      default:
        break;
    }

    if (flag) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  handleClick(event: MouseEvent) {
    if (event.currentTarget) this.setChecked(event.currentTarget as HTMLElement);
  }

  handleFocus(event: FocusEvent) {
    (event.currentTarget as HTMLElement).classList.add("focus");
  }

  handleBlur(event: FocusEvent) {
    (event.currentTarget as HTMLElement).classList.remove("focus");
  }
}

const radios = document.querySelectorAll('[id^="rg"]');
for (let i = 0; i < radios.length; i++) {
  new RT_RadioGroup(radios[i] as HTMLElement);
}
