// // Calculate the difference between accessible name and visual name.
// // https://en.wikipedia.org/wiki/Levenshtein_distance
// export function diffAccName(accessibleName: string, visualName: string): number {
//     throw new Error("Not implemented");
// }
//
//
// export function levenshteinDistance(s1: string, s2: string): number {
//
// }
//

// Calculate the difference between two strings using the Levenshtein distance.
// https://en.wikipedia.org/wiki/Levenshtein_distance
// stolen shamelessly from https://stackoverflow.com/questions/18516942/fastest-general-purpose-levenshtein-javascript-implementation
export function levenshtein(s: string, t: string): number {
  if (s === t) {
    return 0;
  }
  const n = s.length;
  const m = t.length;
  if (n === 0 || m === 0) {
    return n + m;
  }
  let x = 0;
  let y: number;
  let a: number;
  let b: number;
  let c: number;
  let d: number;
  let g: number;
  let h: number;
  let k: number;
  const p = new Array<number>(n);
  for (y = 0; y < n; ) {
    p[y] = ++y;
  }

  for (; x + 3 < m; x += 4) {
    const e1 = t.charCodeAt(x);
    const e2 = t.charCodeAt(x + 1);
    const e3 = t.charCodeAt(x + 2);
    const e4 = t.charCodeAt(x + 3);
    c = x;
    b = x + 1;
    d = x + 2;
    g = x + 3;
    h = x + 4;
    for (y = 0; y < n; y++) {
      k = s.charCodeAt(y);
      a = p[y];
      if (a < c || b < c) {
        c = a > b ? b + 1 : a + 1;
      } else if (e1 !== k) {
        c++;
      }

      if (c < b || d < b) {
        b = c > d ? d + 1 : c + 1;
      } else if (e2 !== k) {
        b++;
      }

      if (b < d || g < d) {
        d = b > g ? g + 1 : b + 1;
      } else if (e3 !== k) {
        d++;
      }

      if (d < g || h < g) {
        g = d > h ? h + 1 : d + 1;
      } else if (e4 !== k) {
        g++;
      }
      p[y] = h = g;
      g = d;
      d = b;
      b = c;
      c = a;
    }
  }

  while (x < m) {
    const e = t.charCodeAt(x);
    c = x;
    d = ++x;
    for (y = 0; y < n; y++) {
      a = p[y];
      if (a < c || d < c) {
        d = a > d ? d + 1 : a + 1;
      } else if (e !== s.charCodeAt(y)) {
        d = c + 1;
      } else {
        d = c;
      }
      p[y] = d;
      c = a;
    }
    h = d;
  }

  // @ts-expect-error known init by this point
  return h;
}

/** @type {Array<number>} */
const codes: number[] = [];
/** @type {Array<number>} */
const cache: number[] = [];

/**
 * Levenshtein edit distance.
 *
 * @param {string} value
 *   Primary value.
 * @param {string} other
 *   Other value.
 * @param {boolean} [insensitive=false]
 *   Compare insensitive to ASCII casing.
 * @returns {number}
 *   Distance between `value` and `other`.
 */
export function levenshteinEditDistance(value: string, other: string, insensitive: boolean = false): number {
  if (value === other) {
    return 0;
  }

  if (value.length === 0) {
    return other.length;
  }

  if (other.length === 0) {
    return value.length;
  }

  if (insensitive) {
    value = value.toLowerCase();
    other = other.toLowerCase();
  }

  let index = 0;

  while (index < value.length) {
    codes[index] = value.charCodeAt(index);
    cache[index] = ++index;
  }

  let indexOther = 0;
  /** @type {number} */
  let result!: number;

  while (indexOther < other.length) {
    const code = other.charCodeAt(indexOther);
    let index = -1;
    let distance = indexOther++;
    result = distance;

    while (++index < value.length) {
      const distanceOther = code === codes[index] ? distance : distance + 1;
      distance = cache[index];
      if (distanceOther > result) {
        if (distanceOther > distance) {
          result = distance > result ? result + 1 : distance + 1;
        } else {
          result = distance > result ? result + 1 : distanceOther;
        }
      } else if (distanceOther > distance) {
        result = distance > result ? distanceOther : distance + 1;
      }
      // else if (distance > result) {
      //     result =
      //         distanceOther
      // }
      else {
        result = distanceOther;
      }
      cache[index] = result;
    }
  }

  return result;
}
