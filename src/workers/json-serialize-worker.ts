/**
 * JSON serialization worker.
 *
 * Receives batches of already-deserialized rows from the main thread and
 * returns the joined JSON fragment (without surrounding `[` `]` brackets,
 * i.e. `"{...},{...},{...}"`). Keeps `JSON.stringify` — the dominant CPU
 * cost during backup export — off the main thread so the progress bar and
 * UI stay responsive on databases with tens of thousands of rows.
 *
 * Protocol:
 *   in:  { id: number, rows: unknown[] }
 *   out: { id: number, ok: true, chunk: string }
 *      | { id: number, ok: false, error: string }
 */

interface InMsg { id: number; rows: unknown[] }
interface OutOk { id: number; ok: true; chunk: string }
interface OutErr { id: number; ok: false; error: string }

self.onmessage = (e: MessageEvent<InMsg>) => {
  const { id, rows } = e.data;
  try {
    // Stringify each row individually and join. This matches the streaming
    // shape used by `emitArray` (comma-separated row literals between the
    // surrounding `[`…`]` markers).
    let out = "";
    for (let i = 0; i < rows.length; i++) {
      out += (i === 0 ? "" : ",") + JSON.stringify(rows[i]);
    }
    const reply: OutOk = { id, ok: true, chunk: out };
    self.postMessage(reply);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const reply: OutErr = { id, ok: false, error: msg };
    self.postMessage(reply);
  }
};
