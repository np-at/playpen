import { finder } from "../utils/finder";

const nonSemanticTags = ["SCRIPT", "HEAD"];

function strToHash(str?: string | null): number {
  return hashCode(str ?? "");
  if (!str || str === "") return 0;
  let hashString = 0;
  for (const character of str ?? "") {
    const charCode = character.charCodeAt(0);
    hashString = hashString << (5 - hashString);
    hashString += charCode;
    hashString |= hashString;
  }
  return hashString;
}
function hashCode(s: string): number {
  return s.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
}

interface HashData {
  attrHash?: number;
  childrenHash?: number;
  textHash?: number;
  sum?: number;
}

declare interface LinkElement extends Element {
  hash_data?: HashData;
}

function hashAttr(el: LinkElement): LinkElement {
  if (typeof el.hash_data?.attrHash !== "undefined") {
    return el;
  }
  if (typeof el.hash_data === "undefined") {
    el.hash_data = {};
  }
  let hashStr = 0;

  for (const attrName of el.getAttributeNames()) {
    if (attrName === "data-hash") {
      continue;
    }
    const attr = el.getAttribute(attrName);
    hashStr += strToHash(attrName + attr);
  }

  el.hash_data.attrHash = hashStr;
  return el;
}

// class ElNode {
//     hash_data: Required<HashData>;
//     el: LinkElement;
//     children?: ElNode[];
//
//     constructor(el: LinkElement) {
//         this.el = el;
//         this.hash_data = hashNode(el).hash_data;
//
//     }
//
// }
interface NodeRep {
  tag: string;
  hash: string;
  hash_num?: number;
  textHash?: number;
  attrHash?: number;
  childrenHash?: number;
  children: NodeRep[];
  sel?: string;
}
function makeNodeRep(el: LinkElement): NodeRep {
  const rep: NodeRep = {
    tag: el.tagName,
    hash: el.hash_data?.sum?.toString(16) ?? "none",
    hash_num: el.hash_data?.sum,
    children: Array.from(el.children)
      .filter((x) => !nonSemanticTags.includes(x.tagName))
      .map((el) => hashNode(el)),
    attrHash: el.hash_data?.attrHash,
    childrenHash: el.hash_data?.childrenHash,
    textHash: el.hash_data?.textHash,
    sel: finder(el),
  };
  return rep;
}
function hashNode(el: LinkElement): NodeRep {
  if (typeof el.hash_data?.sum !== "undefined") {
    return makeNodeRep(el);
  }
  if (typeof el.hash_data === "undefined") {
    el.hash_data = {};
  }
  el = hashAttr(el);
  el = hashChildren(el);
  if (
    typeof el.hash_data?.attrHash === "undefined" ||
    typeof el.hash_data?.childrenHash === "undefined" ||
    typeof el.hash_data?.textHash === "undefined"
  ) {
    throw new Error(`hash_data is missing a value. This should not happen. ${JSON.stringify(el.hash_data)}`);
  }
  el.hash_data.sum = strToHash(el.tagName) + el.hash_data.attrHash + el.hash_data.childrenHash + el.hash_data.textHash;
  // console.log(el.hash_data?.sum?.toString(16), el);
  el.setAttribute("data-hash", el.hash_data.sum.toString(16));

  return makeNodeRep(el);
  // return el as LinkElement & { hash_data: Required<HashData> };
}

function hashChildren(el: LinkElement): LinkElement {
  if (typeof el.hash_data?.childrenHash !== "undefined") {
    return el;
  }
  if (typeof el.hash_data === "undefined") {
    el.hash_data = {};
  }
  let textHash = 0;
  let childrenNodeHash = 0;
  const children = Array.from(el.childNodes);
  for (const child of children) {
    switch (child.nodeType) {
      case Node.TEXT_NODE:
        textHash += strToHash(child.textContent);
        break;
      case Node.ELEMENT_NODE:
        if (child instanceof Element) {
          // Filter out non-semantic tags
          if (nonSemanticTags.includes(child.tagName)) continue;
          childrenNodeHash += hashNode(child).hash_num ?? 0;
        } else {
          throw new Error("Node has nodeType of ELEMENT_NODE but is not an LinkElement");
        }
        break;
      case Node.COMMENT_NODE:
        console.trace("skipping comment node");
        break;
      default:
        console.trace("skipping node type", child.nodeType);
        break;
    }
  }
  el.hash_data.childrenHash = childrenNodeHash;
  el.hash_data.textHash = textHash;

  return el;
}

function MakeSkele(root: LinkElement): void {
  // console.log("testing2")
  // root.querySelectorAll("body *").forEach((el) => {
  //   hashNode(el);
  // });
  const n = hashNode(root);
  console.log(n);
  // Array.from(root.children).forEach((el) => {
  //   hashNode(el);
  // })
}

MakeSkele(document.body);
