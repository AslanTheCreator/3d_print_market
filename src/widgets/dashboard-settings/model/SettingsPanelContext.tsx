"use client";

import { createContext, useContext, useEffect } from "react";
import { useUnsavedChanges } from "@/shared/lib";

export const SettingsPanelContext = createContext({
  active: true,
  reportDirty: (_dirty: boolean) => {},
});

export const useSettingsPanel = (dirty: boolean, pending = false) => {
  useUnsavedChanges(false, pending);
  const context = useContext(SettingsPanelContext);
  const { reportDirty } = context;
  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [reportDirty, dirty]);
  return context;
};
