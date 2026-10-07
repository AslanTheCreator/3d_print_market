type FormState = { dirty: boolean; pending: boolean };

const forms = new Set<FormState>();
const message = "Есть несохранённые изменения. Покинуть форму?";
const positionKey = "figurzillaNavigationPosition";

export function registerUnsavedForm(state: FormState) {
  forms.add(state);
  return () => { forms.delete(state); };
}

export function confirmFormLeave(state: FormState) {
  return !state.pending && (!state.dirty || window.confirm(message));
}

export function isNavigationPending() {
  return Array.from(forms).some(form => form.pending);
}

export function confirmDiscardChanges() {
  return !isNavigationPending() &&
    (!Array.from(forms).some(form => form.dirty) || window.confirm(message));
}

// Только публичный History API и собственная метка; состояние Next сохраняется.
export function installUnsavedChangesGuard() {
  const history = window.history;
  let originalPush = history.pushState;
  let originalReplace = history.replaceState;
  let position: number = history.state?.[positionKey] ?? 0;
  let currentUrl = window.location.href;
  let restoring: { delta: number; origin: number } | null = null;
  let approvedPosition: number | null = null;
  let approvedDocumentLeave = false;
  let approvalTimer: ReturnType<typeof setTimeout> | undefined;

  const push: History["pushState"] = function (data, unused, url) {
    const nextPosition = position + 1;
    originalPush.call(history, { ...data, [positionKey]: nextPosition }, unused, url);
    position = nextPosition;
    currentUrl = window.location.href;
  };
  const replace: History["replaceState"] = function (data, unused, url) {
    originalReplace.call(history, { ...data, [positionKey]: position }, unused, url);
    currentUrl = window.location.href;
  };
  // Слушатель popstate регистрируется до router effects. Методы History — после
  // них, чтобы hydration не заменила владельца меток при настройке роутера.
  const installationTimer = setTimeout(() => {
    originalPush = history.pushState;
    originalReplace = history.replaceState;
    position = history.state?.[positionKey] ?? 0;
    currentUrl = window.location.href;
    originalReplace.call(history, { ...history.state, [positionKey]: position }, "");
    history.pushState = push;
    history.replaceState = replace;
  }, 0);

  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (approvedDocumentLeave) return;
    if (Array.from(forms).some(form => form.dirty || form.pending)) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || link.hasAttribute("data-navigation-overlay")) return;
    const target = new URL(link.href, window.location.href);
    // Внешние переходы защищает beforeunload; hash не размонтирует форму.
    if (target.origin !== window.location.origin || target.protocol !== window.location.protocol ||
      (target.pathname === window.location.pathname && target.search === window.location.search)) return;
    if (restoring || !confirmDiscardChanges()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    // Для обычного <a> уже дано одно подтверждение; Next Link не вызывает unload.
    approvedDocumentLeave = true;
    clearTimeout(approvalTimer);
    approvalTimer = setTimeout(() => { approvedDocumentLeave = false; }, 0);
  };
  const pop = (event: PopStateEvent) => {
    const targetPosition: unknown = event.state?.[positionKey];
    if (typeof targetPosition !== "number") return;
    if (restoring) {
      event.stopImmediatePropagation();
      if (targetPosition !== restoring.origin) return;
      const { delta } = restoring;
      restoring = null;
      // Сначала возвращаем URL и историю, затем спрашиваем, не размонтируя UI.
      if (confirmDiscardChanges()) {
        approvedPosition = position + delta;
        history.go(delta);
      }
      return;
    }
    if (approvedPosition === targetPosition) {
      approvedPosition = null;
      position = targetPosition;
      currentUrl = window.location.href;
      return;
    }
    const delta = targetPosition - position;
    const previousUrl = new URL(currentUrl);
    const leavesRoute = previousUrl.pathname !== window.location.pathname || previousUrl.search !== window.location.search;
    if (delta !== 0 && leavesRoute && Array.from(forms).some(form => form.dirty || form.pending)) {
      event.stopImmediatePropagation();
      restoring = { delta, origin: position };
      history.go(-delta);
      return;
    }
    position = targetPosition;
    currentUrl = window.location.href;
  };
  document.addEventListener("click", click, true);
  window.addEventListener("popstate", pop, true);
  window.addEventListener("beforeunload", beforeUnload);
  return () => {
    clearTimeout(installationTimer);
    clearTimeout(approvalTimer);
    document.removeEventListener("click", click, true);
    window.removeEventListener("popstate", pop, true);
    window.removeEventListener("beforeunload", beforeUnload);
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
  };
}
