import { useCallback, useState } from "react";

export function useConfirmation<T>() {
  const [target, setTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  const request = useCallback((value: T) => setTarget(value), []);
  const cancel = useCallback(() => {
    if (busy) return;
    setTarget(null);
  }, [busy]);

  const run = useCallback(
    async (action: (value: T) => Promise<void> | void) => {
      if (target === null) return;
      setBusy(true);
      try {
        await action(target);
        setTarget(null);
      } finally {
        setBusy(false);
      }
    },
    [target],
  );

  return {
    target,
    busy,
    isOpen: target !== null,
    request,
    cancel,
    run,
  };
}
