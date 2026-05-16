import { useEffect, useState } from "react";
import { persistQueue } from "@/lib/persist-queue";

/**
 * Phase A / P0-2: zamijenjen 100ms `setInterval` polling sa observable
 * `persistQueue.subscribe()`. Re-render samo kad se queue stvarno mijenja.
 */
export function usePersistingState() {
  const [hasPending, setHasPending] = useState<boolean>(() => persistQueue.hasPending());
  const [pendingCount, setPendingCount] = useState<number>(() => persistQueue.getPendingCount());

  useEffect(() => {
    const sync = () => {
      setHasPending(persistQueue.hasPending());
      setPendingCount(persistQueue.getPendingCount());
    };
    // Initial sync in case queue mutated between render and effect commit.
    sync();
    return persistQueue.subscribe(sync);
  }, []);

  return { hasPending, pendingCount };
}
