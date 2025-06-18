// Initialize radio button group
import { RT_RadioGroup } from "./RT_radiogroup.ts";

window.addEventListener("load", function () {
  const radios = document.querySelectorAll('[id^="rg"]');
  for (let i = 0; i < radios.length; i++) {
    new RT_RadioGroup(radios[i] as HTMLElement);
  }
});
