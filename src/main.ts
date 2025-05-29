import './style.css'

// import { setupCounter } from './counter.ts'
// import asdf from "ts:./_bookmarklets/ImageCheck.ts"

import('ts:./_bookmarklets/fcs.ts').then((x)=>makeLink(x.default,'fcs'))

import('ts:./_bookmarklets/Axify.ts').then((x)=>makeLink(x.default,'Axify'))
import('ts:./_bookmarklets/AxifyTargeted.ts').then((x)=>makeLink(x.default,'AxifyTargeted'))
import('ts:./_bookmarklets/ForceFocusOutline.ts').then((x)=>makeLink(x.default,'ForceFocusOutline'))
import('ts:./_bookmarklets/TextSpacing.ts').then((x)=>makeLink(x.default,'TextSpacing'))
import('ts:./_bookmarklets/MonitorAriaLive.ts').then((x)=>makeLink(x.default,'AriaLiveObserver'))
import('ts:./_bookmarklets/showHeadings.ts').then((x)=>makeLink(x.default,'ShowHeadings'))
import('ts:./_bookmarklets/FindDuplicateIds.ts').then((x)=>makeLink(x.default,'FindDuplicateIds'))
import('ts:./_bookmarklets/HoverTest.ts').then((x)=>makeLink(x.default,'HoverTest'))
import('ts:./_bookmarklets/IdentifyExplicitNames.ts').then((x)=>makeLink(x.default,'IdentifyExplicitNames'))
import('ts:./_bookmarklets/ImageCheck.ts').then((x)=>makeLink(x.default,'ImageChecker'))
import('ts:./_bookmarklets/Pathify.ts').then((x)=>makeLink(x.default,'Pathify'))
import('ts:./_bookmarklets/MakeSkele.ts').then((x)=>makeLink(x.default,'MakeSkele'))

import('ts:./_bookmarklets/ShowImageAlt.ts').then((x)=>makeLink(x.default,'ShowImageAlt'))
import('ts:./_bookmarklets/dupeIdCheck.ts').then((x)=>makeLink(x.default,'DupeId'))
import('ts:./_bookmarklets/TextObserver.ts').then((x)=>makeLink(x.default,'TextObserver'))
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


const makeLink = (x:  string, name: string): void => {
    const rowDiv = document.createElement('div')
    rowDiv.classList.add('row')
    const anchorElement = document.createElement("a");
    anchorElement.href = x;
    anchorElement.innerText = name;
    anchorElement.id = "asdfas"
    rowDiv.appendChild(anchorElement);
    root.appendChild(rowDiv)

};

import('ts:./_bookmarklets/ShowImageAlt.ts').then(d=>makeLink(d.default, "ShowImageAlt"))

// makeLink(( ), "ShowImageAlt");
// makeLink(fcs, "fcs");
// makeLink(Axify, "Axify");
// makeLink(AxifyTargeted, "AxifyTargeted");
//
// makeLink(ForceFocusOutline, "ForceFocusOutline");
// makeLink(TextSpacing, "TextSpacing");
// makeLink(AriaLiveObserver, "AriaLiveObserver");
// makeLink(ShowHeadings, "ShowHeadings");
// makeLink(FindDuplicateIds, "FindDuplicateIds");
// makeLink(HoverTest, "HoverTest");
// makeLink(IdentifyExplicitNames, "IdentifyExplicitNames");
// makeLink(ImageChecker, "ImageChecker");
// makeLink(Pathify, "Pathify");
// makeLink(MakeSkele, "MakeSkele");
// makeLink(DupeId, "DupeId");
// makeLink(TextObserver, "TextObserver");
// makeLink(asdf, "asdf")
// const s = document.createElement('a');
// s.href=asdf;
// s.innerText = "testing"
// document.body.appendChild(s)
// setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
