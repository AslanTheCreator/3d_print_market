"use client";

import React, { useState } from "react";
import { Alert, Box, Button } from "@mui/material";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/entities/user";
import { ErrorState } from "@/shared/ui/states";
import { DashboardContent } from "./DashboardContent";
import { DashboardHomeSkeleton } from "./DashboardHomeSkeleton";
import { DashboardMobileNavigation } from "./DashboardMobileNavigation";
import { ProfileForm } from "./ProfileForm";
import { AdminEntryLink } from "@/features/admin-access";

export const DashboardHomeWidget = () => {
  const { data: userData, isLoading, error, refetch, isFetching } = useCurrentUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetry = async () => {
    if (isFetching) return;
    setIsRetrying(true);
    try { await refetch(); } finally { setIsRetrying(false); }
  };

  if (isEditingProfile && userData) {
    return (
      <ProfileForm
        onBack={() => setIsEditingProfile(false)}
        initialData={userData}
        onSuccess={() => setIsEditingProfile(false)}
      />
    );
  }

  return (
    <Box>
      <AdminEntryLink />
      {isLoading && !isRetrying ? (
        <DashboardHomeSkeleton />
      ) : error || !userData ? (
        <>
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 1.5 }}>
            <Alert
              severity="error"
              sx={{ borderRadius: 2, "& .MuiAlert-action": { alignItems: "center" } }}
              action={
                <Button color="inherit" disabled={isFetching} onClick={() => void handleRetry()}>
                  {isFetching ? "Загрузка..." : "Повторить"}
                </Button>
              }
            >
              Не удалось загрузить профиль.
            </Alert>
          </Box>
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <ErrorState type="profile" onRetry={() => void handleRetry()} retryPending={isFetching} />
          </Box>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DashboardContent
            user={userData}
            onEditProfile={() => setIsEditingProfile(true)}
          />
        </motion.div>
      )}
      <DashboardMobileNavigation />
    </Box>
  );
};
