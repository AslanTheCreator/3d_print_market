"use client";

import React, { useState } from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/entities/user";
import { ErrorState } from "@/shared/ui/states";
import { DashboardSkeleton } from "@/shared/ui/skeletons";
import { DashboardContent } from "./DashboardContent";
import { ProfileForm } from "./ProfileForm";

export const DashboardHomeWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useCurrentUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
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
