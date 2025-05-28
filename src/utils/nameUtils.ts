export const mkel = <T extends HTMLElement>(t: string): T => (document.createElement(t) as T);
export const qAll = (s: string): NodeListOf<Element> => document.querySelectorAll(s);
