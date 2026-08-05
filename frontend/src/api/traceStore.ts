export interface ApiTraceEntry {
  id: string;
  timestamp: string;
  operationId: string;
  method: string;
  path: string;
  controller: string;
  action: string;
  traceMatch: string;
  status: number;
}

type Listener = () => void;

let entries: ApiTraceEntry[] = [];
const listeners = new Set<Listener>();

export function recordApiTrace(entry: Omit<ApiTraceEntry, "id" | "timestamp">) {
  entries = [
    {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    },
    ...entries,
  ].slice(0, 12);
  listeners.forEach((listener) => listener());
}

export function subscribeApiTraces(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiTraceSnapshot() {
  return entries;
}

export function clearApiTraces() {
  entries = [];
  listeners.forEach((listener) => listener());
}
