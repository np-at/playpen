const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function randomString(length: number): string {
  let result = "";
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
export function containsAny<T>(collection: T[], ...items: T[]): boolean {
  return items.some((i) => collection.includes(i));
}

export function randStr2(length: number):string {
  const ta = new Uint8Array(length).fill(0)
  window.crypto.getRandomValues(ta);
  // let results = "".padEnd(ta.length);
  let results = "";
  for (let i = 0; i < ta.length; i++) {
    results += String.fromCharCode(ta[i])
  }
  return results;
  // return ta.map(x=>).join('')
  // return ta.buffer[Symbol.toStringTag]
}


// export { randomString, containsAny };
