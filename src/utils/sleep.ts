/**
 * Your basic sleep function
 * @param {number} duration in ms
 * @return {Promise<void>}
 */
export async function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
