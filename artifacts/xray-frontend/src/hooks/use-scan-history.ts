import { useState, useCallback } from "react";
import type { PredictionResponse } from "@/hooks/use-xray-api";

export interface HistoryEntry {
  id: string;
  imageSrc: string;
  result: PredictionResponse;
  timestamp: Date;
}

const MAX_HISTORY = 10;

export function useScanHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const push = useCallback((imageSrc: string, result: PredictionResponse): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry: HistoryEntry = { id, imageSrc, result, timestamp: new Date() };
    setEntries((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    return id;
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, clear };
}
