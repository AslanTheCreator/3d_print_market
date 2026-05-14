"use client";

import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/entities/user";
import { ErrorState } from "@/shared/ui/states";
import { DashboardSkeleton } from "@/shared/ui/skeletons";
import { DashboardContent } from "./DashboardContent";

export const DashboardHomeWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: userData, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (error || !userData) {
    return <ErrorState type="profile" />;
  }

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardContent user={userData} />
      </motion.div>
    </Box>
  );
};
