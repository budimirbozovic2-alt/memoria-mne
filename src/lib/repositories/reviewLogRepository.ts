// M1+A1 — Review-log repository facade. Wraps the debounced IDB micro-queue
// so call sites depend on a stable contract instead of the queue internals.
import type { ReviewLogEntry } from "@/lib/storage";
import {
  idbAddReviewLogEntry,
  idbAddReviewLogEntries,
  flushReviewLogQueue,
} from "@/lib/db";

export const reviewLogRepository = {
  append(entry: ReviewLogEntry): void {
    idbAddReviewLogEntry(entry);
  },
  appendMany(entries: ReviewLogEntry[]): void {
    if (entries.length === 0) return;
    idbAddReviewLogEntries(entries);
  },
  async flush(): Promise<void> {
    await flushReviewLogQueue();
  },
};
