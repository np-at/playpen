// ImageCheck

const invalidAltRegexes = [
  /^img.*/,
  /^image.*/,
  /^picture.*/,
  /^photo.*/,
  /^photograph.*/,
  /^photography.*/,
  /^graphic.*/,
  /^\s*alt/,
  /^\s+$/,
  /=/,
];

function testInvalidAltAttr(attr: string): boolean {
  return invalidAltRegexes.some((x) => x.test(attr));
}

function testValidAltAttributes(rootEl: HTMLElement): HTMLElement[] {
  console.log("testValidAltAttributes");
  const images = Array.from(rootEl.querySelectorAll("img"));
  return images.filter((x) => !x.alt || testInvalidAltAttr(x.alt));
}

// const $: (aAltButtonAltLabelAlt: string) => HTMLElement = (aAltButtonAltLabelAlt: string) => {
//     return document.querySelector(aAltButtonAltLabelAlt) as HTMLElement;
// };
// const $$: (aAltButtonAltLabelAlt: string) => HTMLElement[] = (aAltButtonAltLabelAlt: string) => {
//     return Array.from(document.querySelectorAll(aAltButtonAltLabelAlt));
// }

// function callback(): void {
//     function l(): void {
//         // Remove any existing altSpan or closeSpan elements
//         $$("span").filter(x => containsAny(Array.from(x.classList), ".altSpan", ".axSpan", ".closeSpan")).forEach(x => {
//             x.remove();
//         });
//
//         // Add altSpan elements for any img, button, or label elements that have an alt attribute
//         $$("a[alt], button[alt], label[alt]").forEach(function (x) {
//             x.before(`<span class="altSpan" style="color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;speak:literal-punctuation;"> INVALID❌alt="${x.getAttribute('alt') ?? "no alt"}` + `" on ` + x.tagName + "</span>");
//         });
//         $$("img, [role=img]").forEach(x => {
//             if (x.getAttribute('role')) {
//                 x.after("<span class=\"closeSpan\" style=\"color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;margin:0 2px; padding:2px;speak:literal-punctuation;\">❓role=\"" + x.getAttribute('role') + "\"</span>");
//             }
//             if (x.getAttribute('aria-label')) {
//                 x.after("<span class=\"closeSpan\" style=\"color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;margin:0 2px; padding:2px;speak:literal-punctuation;\">❓aria-label=\"" + x.getAttribute('aria-label') + "\"</span>");
//             }
//             if (x.getAttribute('aria-describedby')) {
//                 x.before("<span class=\"axSpan\" style=\"color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;margin:0 2px; padding:2px;speak:literal-punctuation;\">aria-describedby=\"" + x.getAttribute('aria-describedby') + "\"</span>");
//                 const describedbyValue = x.getAttribute('aria-describedby');
//                 const describedbyArray = describedbyValue?.split(' ') ?? [];
//                 for (const element of describedbyArray) {
//                     const describedby = $('[id="' + element + '"]');
//                     describedby.setAttribute('style', 'outline:orange 2px dashed;');
//                     describedby.prepend("<span class=\"inputSpan\" style=\"padding:1px;color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;z-index:2147483647;speak:literal-punctuation;\">id=\"" + element + "\"</span>");
//                 }
//             }
//             if (x.getAttribute('aria-labelledby')) {
//                 x.after("<span class=\"closeSpan\" style=\"color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;margin:0 2px; padding:2px;speak:literal-punctuation;\">aria-labelledby=\"" + x.getAttribute('aria-labelledby') + "\"</span>");
//                 const labelledbyValue = x.getAttribute('aria-labelledby');
//                 const labelledbyArray = labelledbyValue?.split(' ') ?? [];
//                 for (const element of labelledbyArray) {
//                     const labelledby = document.querySelector('[id="' + element + '"]');
//                     labelledby?.setAttribute('style', 'outline:orange 2px dashed;');
//                     labelledby?.prepend("<span class=\"inputSpan\" style=\"padding:1px;color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;outline:orange 2px dashed;z-index:2147483647;speak:literal-punctuation;\">id=\"" + element + "\"</span>");
//                 }
//                 x.setAttribute('style', 'outline:green 2px solid;padding:2px;');
//                 if (!x.hasAttribute('alt')) {
//                     if (x.parentNode?.querySelectorAll('a').length) {
//                         if (!x.hasAttribute('aria-label')) {
//                             if (!x.hasAttribute('aria-labelledby')) {
//                                 if (!x.hasAttribute('aria-describedby')) {
//                                     if (!x.hasAttribute('title')) {
//                                         x.before("<span class=\"altSpan\" style=\"outline:red 2px solid;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:absolute;line-height:100%;z-index:2147483647;border-bottom:2px solid blue;\">LINK IMG❌NO ALT</span>");
//                                     }
//                                 }
//                             }
//                         }
//                     } else if (!x.hasAttribute('aria-label')) {
//                         if (!x.hasAttribute('aria-labelledby')) {
//                             if (!x.hasAttribute('aria-describedby')) {
//                                 if (!x.hasAttribute('title')) {
//                                     x.setAttribute('style', 'outline:red 2px solid;padding:2px;');
//                                     x.before("<span class=\"altSpan\" style=\"outline:red 2px solid;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:absolute;line-height:100%;z-index:2147483647;\">IMG❌NO ALT</span>");
//                                 }
//                             }
//                         }
//                     }
//                 } else {
//                     x.setAttribute('style', 'outline:green 2px solid;padding:2px;');
//                     if (x.parentNode?.querySelectorAll('a').length) {
//                         if (x.getAttribute('alt') === "") {
//                             x.before("<span class=\"altSpan\" style=\"outline:orange 2px dashed;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:absolute;line-height:100%;z-index:2147483647;speak:literal-punctuation;border-bottom:2px solid blue;\">LINK IMG❓alt=\"" + x.getAttribute('alt') + "\"</span>");
//                         } else {
//                             x.before("<span class=\"altSpan\" style=\"outline:orange 2px dashed;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:absolute;line-height:100%;z-index:2147483647;speak:literal-punctuation;border-bottom:2px solid blue;\">LINK IMG👍alt=\"" + x.getAttribute('alt') + "\"❓</span>");
//                         }
//                     } else {
//                         x.before("<span class=\"altSpan\" style=\"outline:orange 2px dashed;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:absolute;line-height:100%;z-index:2147483647;speak: literal-punctuation;\">IMG👍alt=\"" + x.getAttribute('alt') + "\"❓</span>");
//                     }
//                 }
//                 if (x.hasAttribute('title')) {
//                     x.after("<span role=\"region\" aria-label=\"Title\" class=\"axSpan\" style=\"outline:orange 2px dashed;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:relative;line-height:100%;z-index:2147483647;\">❓title=\"" + x.getAttribute('title') + "\"</span>");
//                 }
//                 if (x.hasAttribute('longdesc')) {
//                     x.after("<span role=\"region\" aria-label=\"Long Description\" class=\"axSpan\" style=\"outline:orange 2px dashed;padding:1px;color:black;font-family:sans-serif;font-weight:bold;font-size:small;background-color:yellow;position:relative;line-height:100%;z-index:2147483647;\">❓longdesc=\"" + x.getAttribute('longdesc') + "\"</span>");
//                 }
//
//
//             }
//         });
//
//         if (!$('img, [role=img]')) {
//             const failure = document.createElement('strong');
//             failure.setAttribute('style', 'color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;margin:0 2px; padding:2px;');
//             failure.setAttribute('id', 'failure');
//             failure.setAttribute('role', 'status');
//             failure.innerHTML = 'No Images Found on Page: ' + document.title;
//             // '<strong style="color:black;font-weight:bold;font-family:sans-serif;font-size:small;background-color:yellow;margin:0 2px; padding:2px;" id="failure" role="status"></strong>'
//             $('body').prepend(failure);
//             // $('#failure')[0].innerHTML = 'No Images Found on Page: ' + document.title;
//             // setTimeout(function () {
//             //     $('#failure')[0].remove();
//             // }, 6000);
//         } else {
//             const success = document.createElement('div');
//             success.setAttribute('style', 'position:absolute; width:40rem; height:7rem;');
//             success.setAttribute('id', 'success');
//             success.setAttribute('role', 'alert');
//             success.innerHTML = 'Success! Images Found on Page: ' + document.title;
//             // $('body')[0].append('<div id="success" role="alert" style="position:absolute; width:0; height:0; clip: rect(0,0,0,0);"></div>');
//             // $('#success')[0].innerHTML = 'Success! Images Found on Page: ' + document.title;
//             $('body').prepend(success);
//             // setTimeout(function () {
//             //     $('#success')[0].remove();
//             // }, 3000);
//         }
//         // $("script[src$='images.js']").remove();
//         // s.remove();
//     }
//
//     console.log("running check")
//     l()
// }

// const s = document.createElement("script");
// if (s.addEventListener) {
//     s.addEventListener("load", callback, true);
//     s.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js";
//     console.log("loaded")
//     document.body.appendChild(s);
// } else {
//     document.readyState && (document.onreadystatechange = callback);
//     // s.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js";
//     document.body.appendChild(s);
//     console.log("created script el")
// }

const _invalid = testValidAltAttributes(document.body);
console.log(_invalid);
