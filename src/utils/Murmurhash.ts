/* eslint-disable no-fallthrough */
/**
 * @preserve
 * JS Implementation of incremental MurmurHash3 (r150) (as of May 10, 2013)
 *
 * @author <a href="mailto:jensyt@gmail.com">Jens Taylor</a>
 * @see http://github.com/homebrewing/brauhaus-diff
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 */

// Call this function without `new` to use the cached object (good for
// single-threaded environments), or with `new` to create a new object.
//
// @param {string} key A UTF-16 or ASCII string
// @param {number} seed An optional positive integer
// @return {object} A MurmurHash3 object for incremental hashing

export class Murmurhash3 {
  private k1: number = 0;
  len: number = 0;
  rem: number = 0;
  h1: number = 0;
  constructor(key?: string, seed?: number) {
    this.reset(seed);
    if (typeof key === "string" && key.length > 0) {
      this.hash(key);
    }
  }

  // Incrementally add a string to this hash
  //
  // @param {string} key A UTF-16 or ASCII string
  // @return {object} this
  public hash(key: string): this {
    let h1, k1, i, top, len;

    len = key.length;
    this.len += len;

    k1 = this.k1;
    i = 0;
    // noinspection FallThroughInSwitchStatementJS
    switch (this.rem) {
      // @ts-expect-error fallthrough intentional
      case 0:
        k1 ^= len > i ? key.charCodeAt(i++) & 0xffff : 0;
      // @ts-expect-error fallthrough intentional
      case 1:
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xffff) << 8 : 0;
      // @ts-expect-error fallthrough intentional
      case 2:
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xffff) << 16 : 0;
      case 3:
        k1 ^= len > i ? (key.charCodeAt(i) & 0xff) << 24 : 0;
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xff00) >> 8 : 0;
    }

    this.rem = (len + this.rem) & 3; // & 3 is same as % 4
    len -= this.rem;
    if (len > 0) {
      h1 = this.h1;
      while (true) {
        k1 = (k1 * 0x2d51 + (k1 & 0xffff) * 0xcc9e0000) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = (k1 * 0x3593 + (k1 & 0xffff) * 0x1b870000) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 = (h1 * 5 + 0xe6546b64) & 0xffffffff;

        if (i >= len) {
          break;
        }

        k1 = (key.charCodeAt(i++) & 0xffff) ^ ((key.charCodeAt(i++) & 0xffff) << 8) ^ ((key.charCodeAt(i++) & 0xffff) << 16);
        top = key.charCodeAt(i++);
        k1 ^= ((top & 0xff) << 24) ^ ((top & 0xff00) >> 8);
      }

      k1 = 0;
      // noinspection FallThroughInSwitchStatementJS
      switch (this.rem) {
        // @ts-expect-error fallthrough intentional
        case 3:
          k1 ^= (key.charCodeAt(i + 2) & 0xffff) << 16;
        // @ts-expect-error fallthrough intentional
        case 2:
          k1 ^= (key.charCodeAt(i + 1) & 0xffff) << 8;
        case 1:
          k1 ^= key.charCodeAt(i) & 0xffff;
      }

      this.h1 = h1;
    }

    this.k1 = k1;
    return this;
  }

  // Get the result of this hash
  //
  // @return {number} The 32-bit hash
  public result(): number {
    let k1, h1;

    k1 = this.k1;
    h1 = this.h1;

    if (k1 > 0) {
      k1 = (k1 * 0x2d51 + (k1 & 0xffff) * 0xcc9e0000) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (k1 * 0x3593 + (k1 & 0xffff) * 0x1b870000) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= this.len;

    h1 ^= h1 >>> 16;
    h1 = (h1 * 0xca6b + (h1 & 0xffff) * 0x85eb0000) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (h1 * 0xae35 + (h1 & 0xffff) * 0xc2b20000) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  // Reset the hash object for reuse
  //
  // @param {number} seed An optional positive integer
  public reset(seed?: number): this {
    this.h1 = typeof seed === "number" ? seed : 0;
    this.rem = 0;
    this.k1 = 0;
    this.len = 0;
    return this;
  }

  public digest(): string {
    return this.result().toString(16);
  }
}
