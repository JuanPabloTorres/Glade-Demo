import { useCallback, useEffect, useState } from "react";
import { aiApi } from "../api/aiApi";
import type { AIHealthStatus } from "../types/api";

const REFRESH_INTERVAL_MS = 45_000;

export function useAiHealth() {
  const [data, setData] = useState<AIHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const status = await aiApi.health();
      setData(status);
    } catch {
      setError("errors.codes.OLLAMA_UNAVAILABLE");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { data, loading, error, refresh };
}
