let controller = new AbortController();

// Сигнал — неперсистентная идентичность поколения, общая для store и HTTP.
export const getSessionSignal = (): AbortSignal => controller.signal;

export const advanceSessionGeneration = (): AbortSignal => {
  const previous = controller;
  controller = new AbortController();
  previous.abort();
  return controller.signal;
};
