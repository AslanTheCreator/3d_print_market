import { useEffect, useRef, useState } from "react";
import { imageApi, type ImageTag } from "@/entities/image";
import { usePrivateScope } from "@/shared/lib/query";

// Вызывать только после подтверждённого сохранения связей без этих ID.
export const useImageCleanup = (tag: ImageTag) => {
  const scope = usePrivateScope();
  const mounted = useRef(true);
  const pending = useRef<number[]>([]);
  const running = useRef(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const isActive = () => mounted.current && scope.isCurrent();
  const retry = async (): Promise<boolean> => {
    if (running.current || !isActive()) return false;
    running.current = true;
    setIsCleaning(true);
    setHasError(false);
    try {
      for (const id of [...pending.current]) {
        if (!isActive()) return false;
        try {
          await imageApi.deleteImages([id], tag);
          if (!isActive()) return false;
          pending.current = pending.current.filter(value => value !== id);
          setPendingIds([...pending.current]);
        } catch {
          if (!isActive()) return false;
          // Остальные ID независимы: успешные удаления повторять не нужно.
        }
      }
      setHasError(pending.current.length > 0);
      return pending.current.length === 0;
    } finally {
      running.current = false;
      if (isActive()) setIsCleaning(false);
    }
  };

  const cleanup = async (ids: number[]): Promise<boolean> => {
    if (running.current || !isActive()) return false;
    pending.current = [...new Set([...pending.current, ...ids])];
    setPendingIds([...pending.current]);
    return retry();
  };

  return { cleanup, retry, pendingIds, isCleaning, hasError };
};
