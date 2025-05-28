import { getDescription, getName } from "aria-api";
import CreatePointerSelector from "../utils/PointerSelectorClass";

function LogAriaAttributes(target: HTMLElement): boolean {
  console.log("target: ", target);
  console.log("name: ", getName(target));
  console.log("description ", getDescription(target));
  return true;
}
CreatePointerSelector(LogAriaAttributes, undefined);
