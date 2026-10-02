// Bound access waits without letting a timed-out operation later open a wallet.
export function assertAccessActive(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new Error('Se canceló el acceso. Puedes volver a ingresar.');
}

export async function withAccessDeadline<T>(work: (signal: AbortSignal) => Promise<T>, controller: AbortController, timeoutMs = 120_000): Promise<T> {
  const { signal } = controller;
  assertAccessActive(signal);
  let rejectAbort: () => void = () => undefined;
  const interrupted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(signal.reason ?? new Error('Se canceló el acceso. Puedes volver a ingresar.'));
    signal.addEventListener('abort', rejectAbort, { once: true });
  });
  const timer = setTimeout(() => controller.abort(new Error('Abrir tu wallet tardó demasiado. Vuelve a ingresar con la misma cuenta; no crees otra.')), timeoutMs);
  try { return await Promise.race([work(signal), interrupted]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', rejectAbort); }
}

export function createTimedFetch(fetcher: typeof fetch, accessSignal: () => AbortSignal | undefined = () => undefined, timeoutMs = 30_000): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const inherited = init?.signal ?? (typeof input === 'object' && 'signal' in input ? input.signal : undefined);
    const signals = [inherited, accessSignal()].filter((signal): signal is AbortSignal => Boolean(signal));
    const subscriptions = signals.map(signal => {
      const abort = () => controller.abort(signal.reason);
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
      return () => signal.removeEventListener('abort', abort);
    });
    const timer = setTimeout(() => controller.abort(new Error('Supabase no respondió a tiempo. Revisa tu conexión y vuelve a ingresar.')), timeoutMs);
    try { return await fetcher(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); subscriptions.forEach(remove => remove()); }
  };
}
