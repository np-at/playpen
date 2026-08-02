import { runFocusStyleCheck, writeFocusStyleReport } from "../utils/focusStyle.ts";

console.info(
  "Focus Style Check: page focus handlers can mutate history; current URL and state will be restored, but pushed entries cannot be safely erased.",
);
writeFocusStyleReport(await runFocusStyleCheck(document));
