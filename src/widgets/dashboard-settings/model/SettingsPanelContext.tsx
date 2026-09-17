"use client";

import { createContext, useContext, useEffect } from "react";

export const SettingsPanelContext = createContext({
  active: true,
  reportDirty: (_dirty: boolean) => {},
});

export const useSettingsPanel = (dirty: boolean) => {
  const context = useContext(SettingsPanelContext);
  const { reportDirty } = context;
  useEffect(() => {
    reportDirty(dirty);
    return () => reportDirty(false);
  }, [reportDirty, dirty]);
  return context;
};
