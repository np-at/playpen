import { run } from "axe-core";

/**
 * Runs AXE core on page
 * outputs results to console
 */
run(
  document,
  {
    // for devtools element support
    elementRef: true,
    rules: {
      "color-contrast": { enabled: true },
    },
  }
).then(console.log).catch(err=> {
  throw err;
});
