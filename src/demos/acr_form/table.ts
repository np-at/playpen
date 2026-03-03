import { assert } from "../../utils/assert";
import type { TestFinding } from "./State.ts";
import { loadFile } from "./loadFile.ts";

export class MyTable {
  private readonly findingMap: WeakMap<HTMLTableRowElement, TestFinding> = new WeakMap();
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

  public addRow(f: TestFinding): HTMLTableRowElement {
    const body = this.tableNode.querySelector("tbody");
    assert(body, "Table should have a tbody", this.tableNode);
    const new_row = body.insertRow();
    new_row.innerHTML = `<tr>
    <th id="rownum1" scope="row"></th>
    <td>${f.test_name}</td>
    <td>${f.id}</td>
    <td>${f.test_condition}</td>
    <td>
        <select aria-labelledby="col5header rownum1" class="form-select border border-dark">
            <option selected="${f.test_result === "Pass" ? "true" : "false"}">Pass</option>
            <option selected="${f.test_result === "Fail" ? "true" : "false"}">Fail</option>
            <option selected="${f.test_result === "Does Not Apply" ? "true" : "false"}">Does Not Apply</option>
        </select>
    </td>
    <td><textarea aria-labelledby="col6header rownum1" class="form-control border border-dark">${f.tester_comments}</textarea></td>
    <td><textarea aria-labelledby="col7header rownum1" class="form-control border border-dark">${f.location}</textarea></td>
    <td>
        <select aria-labelledby="col8header rownum1" class="form-select border border-dark">
            <option selected="${!f.global_issue ? "false" : "true"}">Yes</option>
            <option selected="${!f.global_issue ? "true" : "false"}">No</option>
        </select>
    </td>
    <td>
        <input accept="image/*" type="file" class="form-control border border-dark">
        <img alt="screenshot preview" class="screenshot">
    </td>
    <td>
        <button class="btn btn-success add" type="button">Add Child Row</button>
        <button type="button" class="btn btn-danger delete">Delete This Row</button>
    </td>
</tr>`;
    // new_row.innerHTML = `<td></td><td>${f.test_name}</td><td>${f.id}</td><td>${f.test_condition}</td><td>${f.test_result}</td><td>${f.tester_comments}</td><td>${f.location}</td><td>${f.global_issue}</td><td>${f.screenshot ? `<a href="${f.screenshot}" target="_blank">View Screenshot</a>` : ""}</td><td><button class="btn add">Add</button><button class="btn delete">Delete</button></td>`;
    new_row.querySelector('input[type="file"]')?.addEventListener("change", loadFile);
    this.renum();
    if (f.screenshot) {
      const inpt = new_row.querySelector<HTMLInputElement>('input[type="file"]');
      assert(inpt, "File input should exist in the new row");
      loadFile({ target: inpt } as unknown as Event);
    }

    return new_row;
  }

  protected handleClick(e: MouseEvent) {
    if (e.target === null) return;
    assert(e.target instanceof HTMLElement, "event target should be an HTMLElement");

    const button = e.target.closest("button.btn");
    if (!button) return; // click is outside of a button, do nothing
    const parentRow = button.closest("tr");
    assert(parentRow, "button should be inside a row", button);
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
