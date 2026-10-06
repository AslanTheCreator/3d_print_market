import { useEffect, useRef } from "react";
import { createOrderDialogLifecycle } from "./orderDialogLifecycle";

// Open-state принадлежит caller; callbacks и reset принадлежат его открытию.
export function useOrderDialogLifecycle(open: boolean, reset: () => void) {
  const state = useRef(createOrderDialogLifecycle(open));
  state.current.setOpen(open);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    if (open) resetRef.current();
  }, [open]);
  useEffect(() => {
    const current = state.current;
    current.mount();
    return () => current.dispose();
  }, []);
  const generation = state.current.generation;
  return {
    generation,
    isCurrent: state.current.isCurrent,
    // Сбрасываем состояние после анимации закрытия
    onExited: () => {
      state.current.resetAfterExit(generation, () => resetRef.current());
    },
  };
}
