import "./styles.scss"

import  * as bootstrap from "bootstrap";
import { MyTable } from "./table.ts";
import { setupHandleFileSelect } from "./loadFile.ts";
import { ACRFormState } from "./State.ts";
const state = new ACRFormState();

window._state = state;

const _table = new MyTable('#myTable');
setupHandleFileSelect();


declare global {
  interface Window {
    _state: ACRFormState;
  }
}
