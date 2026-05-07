"use client";

import { useCallback, useEffect, useState } from "react";

const AGE_VERIFICATION_STORAGE_KEY = "figurzilla:age-verification:18-plus";

const getStoredAgeVerification = (): boolean => {
  try {
    return window.localStorage.getItem(AGE_VERIFICATION_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const storeAgeVerification = () => {
  try {
    window.localStorage.setItem(AGE_VERIFICATION_STORAGE_KEY, "true");
  } catch {
    return;
  }
};

export const useAgeVerification = (isRequired: boolean) => {
  const [isVerified, setIsVerified] = useState(!isRequired);

  useEffect(() => {
    if (!isRequired) {
      setIsVerified(true);
      return;
    }

    setIsVerified(getStoredAgeVerification());
  }, [isRequired]);

  const confirmAge = useCallback(() => {
    storeAgeVerification();
    setIsVerified(true);
  }, []);

  return {
    isVerified,
    confirmAge,
  };
};
