const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function randomString(length: number): string {
  let result = "";
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function containsAny<T>(collection: T[], ...items: T[]): boolean {
  return items.some((i) => collection.includes(i));
}

let buf = new Uint8Array(36)
export function randStr2(length: number): string {
  if (buf.length < length) {
    buf = new Uint8Array(length)
  }
  // const ta = new Uint8Array(length).fill(0);
  const ta = buf.subarray(0,length)

  window.crypto.getRandomValues(ta);
  let results = "";
  for (const tae of ta.map((x) => (x % 26) + 65)) {
    results += String.fromCharCode(tae);
  }
  return results;
}

export function short_uuid():string {
  const ta = Array.from(window.crypto.getRandomValues(buf.subarray(0,16)).map(x=>((x % 26) + 65))).map(x=>String.fromCodePoint(x));
  return   [ta[0],ta[1], ta[2], ta[3], '-',ta[4], ta[5], ta[6], ta[7], "-", ta[8], ta[9], ta[10], ta[11], "-", ta[12], ta[13], ta[14], ta[15]].join('')


}
