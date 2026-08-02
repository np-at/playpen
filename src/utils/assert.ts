export function assert(condition: unknown, message?: string, ...debugObjects: unknown[]): asserts condition {
  if (!condition) {
    console.dir(debugObjects);
    const err = new Error(message || "Assertion failed", { cause: debugObjects.length > 0 ? debugObjects : undefined });

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(err, assert);
    }

    throw err;
  }
}
