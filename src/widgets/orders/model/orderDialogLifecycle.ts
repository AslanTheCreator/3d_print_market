export function createOrderDialogLifecycle(initialOpen: boolean) {
  let open = initialOpen;
  let generation = 0;
  let mounted = true;
  return {
    get generation() { return generation; },
    setOpen(next: boolean) {
      if (next !== open) { open = next; generation++; }
    },
    isCurrent(operation: number) { return mounted && open && operation === generation; },
    resetAfterExit(closing: number, reset: () => void) {
      if (mounted && !open && closing === generation) reset();
    },
    mount() { mounted = true; },
    dispose() { mounted = false; },
  };
}
