import { runFocusStyleCheck, writeFocusStyleReport } from "../utils/focusStyle.ts";

console.info(
  "Focus Style Check: page focus handlers can mutate history; scanning stops if detected because pushed entries cannot be safely erased.",
);
writeFocusStyleReport(await runFocusStyleCheck(document));
