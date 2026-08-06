"use client";

import React, { useState } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/entities/user";
import { ErrorState } from "@/shared/ui/states";
import { DashboardContent } from "./DashboardContent";
import { DashboardHomeSkeleton } from "./DashboardHomeSkeleton";
import { ProfileForm } from "./ProfileForm";

export const DashboardHomeWidget = () => {
  const { data: userData, isLoading, error } = useCurrentUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (isLoading) {
    return <DashboardHomeSkeleton />;
  }

  if (error || !userData) {
    return <ErrorState type="profile" />;
  }

  if (isEditingProfile) {
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
    </Box>
  );
};
