import { run } from "axe-core";
import CreatePointerSelector from "../utils/PointerSelectorClass";


// run(
//   document,
//   {
//     // for devtools element support
//     elementRef: true,
//     rules: {
//       "color-contrast": { enabled: true },
//     },
//   }
// ).then(console.log).catch(err=> {
//   throw err;
// });
CreatePointerSelector((t)=>{
  console.log("running on ", t)
  run(t, {
    elementRef: true,
    rules: {
      "color-contrast": {enabled: true}
    },
    reporter: 'v2',
  }).then(console.log).catch(err=>{
    throw err
  });
  return true;
})
