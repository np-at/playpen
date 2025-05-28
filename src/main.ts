import './style.css'

// import { setupCounter } from './counter.ts'
import asdf from "ts:./_bookmarklets/ImageCheck.ts"

import fcs from "ts:./_bookmarklets/fcs.ts";

import Axify from "ts:./_bookmarklets/Axify.ts";
import AxifyTargeted from "ts:./_bookmarklets/AxifyTargeted.ts";
import ForceFocusOutline from "ts:./_bookmarklets/ForceFocusOutline.ts";
import TextSpacing from "ts:./_bookmarklets/TextSpacing.ts";
import AriaLiveObserver from "ts:./_bookmarklets/MonitorAriaLive.ts";
import ShowHeadings from "ts:./_bookmarklets/showHeadings.ts";
import FindDuplicateIds from "ts:./_bookmarklets/FindDuplicateIds.ts";
import HoverTest from "ts:./_bookmarklets/HoverTest.ts";
import IdentifyExplicitNames from "ts:./_bookmarklets/IdentifyExplicitNames.ts";
import ImageChecker from "ts:./_bookmarklets/ImageCheck.ts";
import Pathify from "ts:./_bookmarklets/Pathify.ts";
import MakeSkele from "ts:./_bookmarklets/MakeSkele.ts";

import ShowImageAlt from "ts:./_bookmarklets/ShowImageAlt.ts";
import DupeId from "ts:./_bookmarklets/dupeIdCheck.ts";
import TextObserver from "ts:./_bookmarklets/TextObserver.ts";
// document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
//   <div>
//     <a href="https://vite.dev" target="_blank">
//       <img src="${viteLogo}" class="logo" alt="Vite logo" />
//     </a>
//     <a href="https://www.typescriptlang.org/" target="_blank">
//       <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
//     </a>
//     <h1>Vite + TypeScript</h1>
//     <div class="card">
//       <button id="counter" type="button"></button>
//     </div>
//     <p class="read-the-docs">
//       Click on the Vite and TypeScript logos to learn more
//     </p>
//   </div>
// `

// const root = document.querySelector("#root");
const root = document.createElement('div')
root.setAttribute('id', 'root')
document.body.appendChild(root)
if (!root) {
    throw new Error("root element not found");
}
const makeLink = (x: string, name: string): void => {
    const rowDiv = document.createElement('div')
    rowDiv.classList.add('row')
    const anchorElement = document.createElement("a");
    anchorElement.href = x;
    anchorElement.innerText = name;
    anchorElement.id = "asdfas"
    rowDiv.appendChild(anchorElement);
    root.appendChild(rowDiv)

};
makeLink(ShowImageAlt, "ShowImageAlt");
makeLink(fcs, "fcs");
makeLink(Axify, "Axify");
makeLink(AxifyTargeted, "AxifyTargeted");

makeLink(ForceFocusOutline, "ForceFocusOutline");
makeLink(TextSpacing, "TextSpacing");
makeLink(AriaLiveObserver, "AriaLiveObserver");
makeLink(ShowHeadings, "ShowHeadings");
makeLink(FindDuplicateIds, "FindDuplicateIds");
makeLink(HoverTest, "HoverTest");
makeLink(IdentifyExplicitNames, "IdentifyExplicitNames");
makeLink(ImageChecker, "ImageChecker");
makeLink(Pathify, "Pathify");
makeLink(MakeSkele, "MakeSkele");
makeLink(DupeId, "DupeId");
makeLink(TextObserver, "TextObserver");
makeLink(asdf, "asdf")
// const s = document.createElement('a');
// s.href=asdf;
// s.innerText = "testing"
// document.body.appendChild(s)
// setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
