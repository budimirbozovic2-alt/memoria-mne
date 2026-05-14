import { useState, useEffect } from "react";
import { persistQueue } from "@/lib/persist-queue";

export function usePersistingState() {
  const [hasPending, setHasPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Provjeravamo svakih 100ms da li ima nečega u redu čekanja
    const interval = setInterval(() => {
      setHasPending(persistQueue.hasPending());
      setPendingCount(persistQueue.getPendingCount());
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  return { hasPending, pendingCount };
}
