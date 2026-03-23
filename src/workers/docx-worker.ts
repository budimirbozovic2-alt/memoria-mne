/**
 * Web Worker for DOCX parsing.
 * Keeps mammoth.js processing off the main thread.
 */

import mammoth from "mammoth";

self.onmessage = async (e: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: e.data.arrayBuffer });
    self.postMessage({ success: true, html: result.value, messages: result.messages });
  } catch (err: any) {
    self.postMessage({ success: false, error: err?.message || "DOCX parsing failed" });
  }
};
