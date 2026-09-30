"use client";
import { useEffect } from "react";

const dirtyForms = new Set<symbol>();
export const confirmDiscardChanges = () => dirtyForms.size === 0 || window.confirm("Есть несохранённые изменения. Покинуть форму?");

// Нативные ссылки и Back/Forward защищают черновики без сохранения данных в браузере.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const key = Symbol();
    dirtyForms.add(key);
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { dirtyForms.delete(key); window.removeEventListener("beforeunload", beforeUnload); };
  }, [dirty]);
}
