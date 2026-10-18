// Keep native decoders and remote requests bounded; failures remain retryable.
export function createThumbnailLoader(
  generate: (url: string) => Promise<string>,
  concurrency = 2,
  capacity = 48
) {
  const cache = new Map<string, string>();
  const pending = new Map<string, Promise<string>>();
  const waiting: (() => void)[] = [];
  let active = 0;
  function load(url: string): Promise<string> {
    const cached = cache.get(url);
    if (cached) {
      cache.delete(url);
      cache.set(url, cached);
      return Promise.resolve(cached);
    }
    const existing = pending.get(url);
    if (existing) return existing;
    const result = new Promise<string>((resolve, reject) => {
      const run = () => {
        active++;
        const finished = () => {
          pending.delete(url);
          active--;
          waiting.shift()?.();
        };
        Promise.resolve()
          .then(() => generate(url))
          .then(
            (uri) => {
              cache.set(url, uri);
              if (cache.size > capacity) cache.delete(cache.keys().next().value!);
              finished();
              resolve(uri);
            },
            (error) => {
              finished();
              reject(error);
            }
          );
      };
      if (active < concurrency) run();
      else waiting.push(run);
    });
    pending.set(url, result);
    return result;
  }
  return Object.assign(load, {
    invalidate(url: string) {
      cache.delete(url);
    },
  });
}
