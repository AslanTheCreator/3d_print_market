"use client";
import { useLayoutEffect, useRef } from "react";
import { confirmFormLeave, installUnsavedChangesGuard, registerUnsavedForm } from "./unsavedChangesGuard";

export { confirmDiscardChanges } from "./unsavedChangesGuard";

export function useUnsavedChangesNavigation() {
  useLayoutEffect(() => installUnsavedChangesGuard(), []);
}

// Нативные ссылки и Back/Forward защищают черновики без сохранения данных в браузере.
export function useUnsavedChanges(dirty: boolean, pending = false) {
  const state = useRef({ dirty, pending });
  useLayoutEffect(() => {
    state.current.dirty = dirty;
    state.current.pending = pending;
  }, [dirty, pending]);
  useLayoutEffect(() => registerUnsavedForm(state.current), []);
  return {
    confirmLeave: () => confirmFormLeave(state.current),
    markSaved: () => { state.current.dirty = false; state.current.pending = false; },
  };
}
