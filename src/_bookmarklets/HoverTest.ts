import { getDescription, getName } from "aria-api";
import CreatePointerSelector from "../utils/PointerSelectorClass";

function LogAriaAttributes(target: Element): boolean {
  console.log("target: ", target);
  console.log("name: ", getName(target));
  console.log("description ", getDescription(target));
  return true;
}
CreatePointerSelector("hover-test", LogAriaAttributes, undefined);
