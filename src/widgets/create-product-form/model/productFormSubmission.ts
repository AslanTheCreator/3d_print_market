// Lock и таймер принадлежат экземпляру формы, а не состоянию mutation observer.
export const createProductFormSubmission = () => {
  let active = true;
  let revision = 0;
  let pending = false;
  let saved = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const isCurrent = (operation: number) => active && operation === revision;
  return {
    activate: () => { active = true; },
    dispose: () => {
      active = false;
      revision++;
      pending = false;
      clearTimeout(timer);
    },
    isActive: () => active,
    isBlocked: () => !active || pending || saved,
    start: (): number | null => {
      if (!active || pending || saved) return null;
      pending = true;
      return revision;
    },
    isCurrent,
    confirm: (operation: number) => { if (isCurrent(operation)) saved = true; },
    finish: (operation: number) => { if (isCurrent(operation)) pending = false; },
    schedule: (operation: number, callback: () => void) => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (isCurrent(operation)) callback(); }, 1500);
    },
  };
};
