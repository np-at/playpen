import { runFocusStyleCheck, writeFocusStyleReport } from "../utils/focusStyle.ts";

console.info(
  "Focus Style Check: page focus handlers can mutate history. It detects and restores reliably comparable URL and History.state mutations, but cannot guarantee full restoration of every arbitrary History.state structured-clone representation; pushed entries cannot be safely erased.",
);
void (async () => {
  writeFocusStyleReport(await runFocusStyleCheck(document));
})();
