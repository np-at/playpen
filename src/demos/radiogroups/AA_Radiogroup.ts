/*
      *   This content is licensed according to the W3C Software License at
      *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
      *
      *   File:  radio-activedescendant.js
      *
      *   Desc:  Radio group widget using aria-activedescendant that implements ARIA Authoring Practices
      */

"use strict";

class AA_Radiogroup {
  groupNode: HTMLElement;
  radioButtons: HTMLElement[];
  firstRadioButton: HTMLElement;
  lastRadioButton: HTMLElement;
  constructor(groupNode: HTMLElement) {
    this.groupNode = groupNode;

    this.radioButtons = [];



    this.radioButtons = [];
    const rbs: HTMLElement[] = Array.from(this.groupNode.querySelectorAll("[role=radio]"));


    this.groupNode.addEventListener("keydown", this.handleKeydown.bind(this));
    this.groupNode.addEventListener("focus", this.handleFocus.bind(this));
    this.groupNode.addEventListener("blur", this.handleBlur.bind(this));

    rbs.forEach((rb) => {
      rb.addEventListener("click", this.handleClick.bind(this));

      this.radioButtons.push(rb);
    });

    // initialize
    if (!this.groupNode.getAttribute("role")) {
      this.groupNode.setAttribute("role", "radiogroup");
    }
    this.firstRadioButton = this.radioButtons[0];
    this.lastRadioButton = this.radioButtons[this.radioButtons.length - 1];
    this.groupNode.tabIndex = 0;
  }

  isRadioInView(radio: HTMLElement) {
    const bounding = radio.getBoundingClientRect();
    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  setChecked(currentItem:HTMLElement) {
    for (let i = 0; i < this.radioButtons.length; i++) {
      const rb = this.radioButtons[i];
      rb.setAttribute("aria-checked", "false");
      rb.classList.remove("focus");
    }
    currentItem.setAttribute("aria-checked", "true");
    currentItem.classList.add("focus");
    this.groupNode.setAttribute("aria-activedescendant", currentItem.id);
    if (!this.isRadioInView(currentItem)) {
      currentItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    this.groupNode.focus();
  }

  setCheckedToPreviousItem(currentItem:HTMLElement) {
    let index;

    if (currentItem === this.firstRadioButton) {
      this.setChecked(this.lastRadioButton);
    } else {
      index = this.radioButtons.indexOf(currentItem);
      this.setChecked(this.radioButtons[index - 1]);
    }
  }

  setCheckedToNextItem(currentItem:HTMLElement) {
    let index;

    if (currentItem === this.lastRadioButton) {
      this.setChecked(this.firstRadioButton);
    } else {
      index = this.radioButtons.indexOf(currentItem);
      this.setChecked(this.radioButtons[index + 1]);
    }
  }

  getCurrentRadioButton() {
    const id = this.groupNode.getAttribute("aria-activedescendant");
    if (!id) {
      this.groupNode.setAttribute("aria-activedescendant", this.firstRadioButton.id);
      return this.firstRadioButton;
    }
    for (let i = 0; i < this.radioButtons.length; i++) {
      const rb = this.radioButtons[i];
      if (rb.id === id) {
        return rb;
      }
    }
    this.groupNode.setAttribute("aria-activedescendant", this.firstRadioButton.id);
    return this.firstRadioButton;
  }

  // Event Handlers

  handleKeydown(event:KeyboardEvent) {
    let flag = false;

    const currentItem = this.getCurrentRadioButton();
    switch (event.key) {
      case " ":
        this.setChecked(currentItem);
        flag = true;
        break;

      case "Up":
      case "ArrowUp":
      case "Left":
      case "ArrowLeft":
        this.setCheckedToPreviousItem(currentItem);
        flag = true;
        break;

      case "Down":
      case "ArrowDown":
      case "Right":
      case "ArrowRight":
        this.setCheckedToNextItem(currentItem);
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
    if (event.currentTarget && event.currentTarget instanceof HTMLElement)
      this.setChecked(event.currentTarget);
  }

  handleFocus() {
    const currentItem = this.getCurrentRadioButton();
    if (!this.isRadioInView(currentItem)) {
      currentItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    currentItem.classList.add("focus");
  }

  handleBlur() {
    const currentItem = this.getCurrentRadioButton();
    currentItem.classList.remove("focus");
  }
}

// Initialize radio button group using aria-activedescendant
window.addEventListener("load", function () {
  const radios: NodeListOf<HTMLElement> = document.querySelectorAll(".radiogroup-activedescendant");
  for (let i = 0; i < radios.length; i++) {
    new AA_Radiogroup(radios[i]);
  }
});
