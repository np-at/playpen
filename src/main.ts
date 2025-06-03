import { short_uuid } from "./utils/stringUtils.ts";

// import { setupCounter } from './counter.ts'
// import asdf from "ts:./_bookmarklets/ImageCheck.ts"

void import('ts:./_bookmarklets/fcs.ts').then((x)=>makeLink(x.default,'fcs'))

void import('ts:./_bookmarklets/Axify.ts').then((x)=>makeLink(x.default,'Axify'))
void import('ts:./_bookmarklets/AxifyTargeted.ts').then((x)=>makeLink(x.default,'AxifyTargeted'))
void import('ts:./_bookmarklets/ForceFocusOutline.ts').then((x)=>makeLink(x.default,'ForceFocusOutline'))
void import('ts:./_bookmarklets/TextSpacing.ts').then((x)=>makeLink(x.default,'TextSpacing'))
void import('ts:./_bookmarklets/MonitorAriaLive.ts').then((x)=>makeLink(x.default,'AriaLiveObserver'))
void import('ts:./_bookmarklets/showHeadings.ts').then((x)=>makeLink(x.default,'ShowHeadings'))
void import('ts:./_bookmarklets/FindDuplicateIds.ts').then((x)=>makeLink(x.default,'FindDuplicateIds'))
void import('ts:./_bookmarklets/HoverTest.ts').then((x)=>makeLink(x.default,'HoverTest'))
void import('ts:./_bookmarklets/IdentifyExplicitNames.ts').then((x)=>makeLink(x.default,'IdentifyExplicitNames'))
void import('ts:./_bookmarklets/ImageCheck.ts').then((x)=>makeLink(x.default,'ImageChecker'))
void import('ts:./_bookmarklets/Pathify.ts').then((x)=>makeLink(x.default,'Pathify'))
void import('ts:./_bookmarklets/MakeSkele.ts').then((x)=>makeLink(x.default,'MakeSkele'))
void import('ts:./_bookmarklets/ShowImageAlt.ts').then((x)=>makeLink(x.default,'ShowImageAlt'))
void import('ts:./_bookmarklets/dupeIdCheck.ts').then((x)=>makeLink(x.default,'DupeId'))
void import('ts:./_bookmarklets/TextObserver.ts').then((x)=>makeLink(x.default,'TextObserver'))
void import('ts:./_bookmarklets/FocusStyleCheck.ts').then((x)=>makeLink(x.default,'FocusStyleCheck'))

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
    anchorElement.id = short_uuid()
    rowDiv.appendChild(anchorElement);
    root.appendChild(rowDiv)

};


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
