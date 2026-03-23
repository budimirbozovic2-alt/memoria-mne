/**
 * Parse DOCX files using a Web Worker to avoid blocking the UI thread.
 * Falls back to main-thread parsing if Workers aren't available.
 */

export function parseDocxInWorker(arrayBuffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL("../workers/docx-worker.ts", import.meta.url),
        { type: "module" }
      );

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("DOCX parsing timed out"));
      }, 30_000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        if (e.data.success) {
          resolve(e.data.html);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        worker.terminate();
        // Fallback to main thread
        fallbackParse(arrayBuffer).then(resolve).catch(reject);
      };

      worker.postMessage({ arrayBuffer }, [arrayBuffer.slice(0)]);
    } catch {
      // Workers not supported — fallback
      fallbackParse(arrayBuffer).then(resolve).catch(reject);
    }
  });
}

async function fallbackParse(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}
