import { assert } from "../../utils/assert";

export class MyTable {
  tableNode: HTMLTableElement;
  public constructor(tableNode: HTMLElement | string) {
    if (typeof tableNode === "string") {
      const node = document.querySelector(tableNode);
      assert(node, `No element found for selector: ${tableNode}`);
      assert(node instanceof HTMLTableElement, "Element found is not an HTMLTableElement");
      this.tableNode = node;
    } else {
      assert(tableNode instanceof HTMLTableElement, "tableNode should be an HTMLTableElement");
      this.tableNode = tableNode;
    }
    this.registerEventListeners();
  }
  public renum() {
    this.tableNode.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((tr, i) => {
      tr.cells[0].textContent = String(i + 1).padStart(2, "0");
    });
  }
  protected handleClick(e: MouseEvent) {
    if (e.target === null) return;
    assert(e.target instanceof HTMLElement, "event target should be an HTMLElement");

    const button = e.target.closest("button.btn");
    assert(button, "click should be on a button with class 'btn'", );
    const parentRow = button.closest("tr");
    assert(parentRow, "button should be inside a row");
    if (button.matches(".delete")) {
      parentRow.remove();
    } else if (button.matches(".add")) {
      // deep clone the targeted row
      const new_row = parentRow.cloneNode(true);
      // append the new row to the table after the clicked row
      parentRow.after(new_row);
    }
    this.renum();
  }

  private registerEventListeners() {
    this.tableNode.addEventListener("click", this.handleClick.bind(this));
  }
}
