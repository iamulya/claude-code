/**
 * Bounded Concurrency Pool
 *
 * M9 fix: Extracted from 4 duplicate inline definitions
 * (store.ts, tfidfSearch.ts, groundingPlugin.ts, differential.ts).
 *
 * Executes async task factories with a bounded concurrency limit.
 * Semantics match Promise.allSettled — all tasks run to completion
 * (fulfilled or rejected), no early abort. Results are returned in
 * the same order as the input tasks.
 *
 * @param tasks - Array of zero-argument async factory functions
 * @param limit - Maximum concurrent tasks (defaults to 1, clamped ≥ 1)
 * @returns PromiseSettledResult[] in input order
 *
 * @example
 * ```ts
 * const results = await pAllSettled(
 *   urls.map(url => () => fetch(url)),
 *   8, // max 8 concurrent fetches
 * );
 * ```
 *
 * @module knowledge/utils/concurrency
 */

export function pAllSettled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<Array<PromiseSettledResult<T>>> {
  const concurrency = Math.max(1, limit);
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let next = 0;
  let active = 0;
  return new Promise((resolve) => {
    const launch = () => {
      while (active < concurrency && next < tasks.length) {
        const i = next++;
        active++;
        tasks[i]!()
          .then(
            (v) => { results[i] = { status: "fulfilled", value: v }; },
            (e) => { results[i] = { status: "rejected", reason: e }; },
          )
          .finally(() => {
            active--;
            launch();
            if (active === 0 && next === tasks.length) resolve(results);
          });
      }
      if (tasks.length === 0) resolve(results);
    };
    launch();
  });
}
