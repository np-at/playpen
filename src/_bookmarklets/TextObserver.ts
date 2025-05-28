function getLangChars(lang: string): string {
  let utf16range = [-1,-1]
  switch (lang) {
    case 'en':
      utf16range = [32, 127];
      break;
    case 'ja':
      utf16range = [12353, 12447];
      break;
    case 'ko':
      utf16range = [44032, 55203];
      break;
    case 'zh':
      utf16range = [19968, 40959];
      break;
    default:
      throw new Error('Invalid language');

  }
  let chars = '';
  for (let i = utf16range[0]; i < utf16range[1]; i++) {
    chars += String.fromCharCode(i);
  }
  return chars;
}
function TextObserver():void {
  const canary = document.createElement('div');
  canary.style.visibility = 'hidden';
  canary.style.position = 'absolute';
  // canary.innerText = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~!@#$%^&*()_+{}|:"<>?';
  canary.innerText = getLangChars('en');
  document.body.appendChild(canary);


  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      console.log(entry.contentRect.width, entry.contentRect.height);
      console.dir(entry);
    })
  })

        // const observer = new MutationObserver((mutations) => {
    //     mutations.forEach((mutation) => {
    //         if (mutation.type === 'childList') {
    //             mutation.addedNodes.forEach((node) => {
    //                 if (node.nodeType === Node.TEXT_NODE) {
    //                     console.log(node.textContent);
    //                 }
    //             });
    //         }
    //     });
    // });

    observer.observe(canary, {
      box:'content-box'
    })
}


TextObserver();
