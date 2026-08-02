import { runFocusStyleCheck, writeFocusStyleReport } from "../utils/focusStyle.ts";

writeFocusStyleReport(await runFocusStyleCheck(document));
