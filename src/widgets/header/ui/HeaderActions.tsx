"use client";

import React, { useCallback, useRef, useState } from "react";
import { useCartChecks } from "@/entities/cart";
import { useFavoritesChecks } from "@/entities/favorite";
import { useAuth } from "@/features/auth";
import {
  Stack,
  IconButton,
  useTheme,
  Typography,
  Box,
  Badge,
  alpha,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import FavoritesCustomIcon from "@/shared/assets/icons/favorites.png";
import PersonCustomIcon from "@/shared/assets/icons/userAccount.svg";
import ShoppingCartCustomIcon from "@/shared/assets/icons/backet.svg";
import { ICON_SIZES } from "../model/constants";
import { useUserPendingActions } from "../model/pendingActions";
import { PendingActionsPopover } from "./PendingActionsPopover";

interface HeaderActionsProps {
  isMobile: boolean;
}

interface HeaderIconConfig {
  url: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  wrapperRef?: React.Ref<HTMLDivElement>;
  triggerRef?: React.Ref<HTMLAnchorElement>;
}

export const HeaderActions = ({ isMobile }: HeaderActionsProps) => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const { getCartItemsCount } = useCartChecks(isAuthenticated);
  const { getFavoritesItemsCount } = useFavoritesChecks(isAuthenticated);
  const {
    totalCount: pendingActionsCount,
    sellerActionGroups,
    customerActionGroups,
    renewalGroup,
    isLoading: isPendingLoading,
  } = useUserPendingActions();

  const canShowProfilePopover = isAuthenticated && pendingActionsCount > 0;
  const profileUrl = isAuthenticated ? "/dashboard" : "/auth/login";
  const profileBadge =
    pendingActionsCount > 0 ? pendingActionsCount : undefined;

  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isPopoverHovered, setIsPopoverHovered] = useState(false);
  const [isTriggerFocused, setIsTriggerFocused] = useState(false);
  const [isPopoverFocused, setIsPopoverFocused] = useState(false);

  const profileTriggerWrapperRef = useRef<HTMLDivElement | null>(null);
  const profileTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);

  const isPopoverOpen =
    canShowProfilePopover &&
    Boolean(profileTriggerWrapperRef.current) &&
    (isTriggerHovered ||
      isPopoverHovered ||
      isTriggerFocused ||
      isPopoverFocused);

  const isMovingToElement = (
    relatedTarget: EventTarget | null,
    element: HTMLElement | null,
  ) =>
    relatedTarget instanceof Node && Boolean(element?.contains(relatedTarget));

  const handleProfileMouseEnter = useCallback(() => {
    if (!canShowProfilePopover) return;
    setIsTriggerHovered(true);
  }, [canShowProfilePopover]);

  const handleProfileMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setIsTriggerHovered(false);

      if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
        setIsPopoverHovered(true);
      }
    },
    [],
  );

  const handleProfileFocus = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (
        !canShowProfilePopover ||
        !event.currentTarget.matches(":focus-visible")
      ) {
        return;
      }

      setIsTriggerFocused(true);
    },
    [canShowProfilePopover],
  );

  const handleProfileBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      setIsTriggerFocused(false);

      if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
        setIsPopoverFocused(true);
      }
    },
    [],
  );

  const handlePopoverMouseEnter = useCallback(() => {
    setIsPopoverHovered(true);
  }, []);

  const handlePopoverMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setIsPopoverHovered(false);

      if (
        isMovingToElement(event.relatedTarget, profileTriggerWrapperRef.current)
      ) {
        setIsTriggerHovered(true);
      }
    },
    [],
  );

  const handlePopoverFocus = useCallback(() => {
    setIsPopoverFocused(true);
  }, []);

  const handlePopoverBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
        return;
      }

      setIsPopoverFocused(false);

      if (isMovingToElement(event.relatedTarget, profileTriggerRef.current)) {
        setIsTriggerFocused(true);
      }
    },
    [],
  );

  const handlePopoverClose = useCallback(() => {
    setIsTriggerHovered(false);
    setIsPopoverHovered(false);
    setIsTriggerFocused(false);
    setIsPopoverFocused(false);
  }, []);

  const iconSize = isMobile ? ICON_SIZES.mobile : ICON_SIZES.desktop;

  const headerIcons: HeaderIconConfig[] = [
    {
      url: "/favorites",
      icon: (
        <Image
          src={FavoritesCustomIcon}
          alt="Избранное"
          width={iconSize}
          height={iconSize}
          style={{ objectFit: "contain" }}
        />
      ),
      label: "Избранное",
      badge: getFavoritesItemsCount,
    },
    {
      url: profileUrl,
      icon: (
        <Image
          src={PersonCustomIcon}
          alt="Профиль"
          width={iconSize}
          height={iconSize}
          style={{ objectFit: "contain" }}
        />
      ),
      label: "Профиль",
      badge: profileBadge,
      onMouseEnter: handleProfileMouseEnter,
      onMouseLeave: handleProfileMouseLeave,
      onFocus: handleProfileFocus,
      onBlur: handleProfileBlur,
      wrapperRef: profileTriggerWrapperRef,
      triggerRef: profileTriggerRef,
    },
    {
      url: "/checkout",
      icon: (
        <Image
          src={ShoppingCartCustomIcon}
          alt="Корзина"
          width={iconSize}
          height={iconSize}
          style={{ objectFit: "contain" }}
        />
      ),
      label: "Корзина",
      badge: getCartItemsCount,
    },
  ];

  return (
    <>
      <Stack
        component="nav"
        direction="row"
        spacing={isMobile ? 0.5 : 1}
        alignItems="center"
        sx={{
          minHeight: { xs: 40, sm: 50 },
        }}
        aria-label="Действия в шапке сайта"
      >
        {headerIcons.map((item) => (
          <HeaderActionItem key={item.label} {...item} isMobile={isMobile} />
        ))}
      </Stack>

      <PendingActionsPopover
        anchorEl={profileTriggerWrapperRef.current}
        open={isPopoverOpen}
        onClose={handlePopoverClose}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
        onFocus={handlePopoverFocus}
        onBlur={handlePopoverBlur}
        paperRef={popoverPaperRef}
        sellerActionGroups={sellerActionGroups}
        customerActionGroups={customerActionGroups}
        renewalGroup={renewalGroup}
        totalCount={pendingActionsCount}
        isLoading={isPendingLoading}
      />
    </>
  );
};

interface HeaderActionItemProps extends HeaderIconConfig {
  isMobile: boolean;
}

const HeaderActionItem = ({
  url,
  icon,
  label,
  badge,
  isMobile,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  wrapperRef,
  triggerRef,
}: HeaderActionItemProps) => {
  const theme = useTheme();

  return (
    <Box
      ref={wrapperRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{ display: "flex" }}
    >
      <Link
        ref={triggerRef}
        href={url}
        style={{ textDecoration: "none" }}
        aria-label={label}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            minWidth: { xs: 40, sm: 64 },
          }}
        >
          <IconButton
            component="div"
            aria-hidden
            sx={{
              padding: { xs: 1, sm: 0.5 },
              borderRadius: theme.shape.borderRadius,
              transition: theme.transitions.create(
                ["background-color", "transform"],
                {
                  duration: theme.transitions.duration.shorter,
                  easing: theme.transitions.easing.easeInOut,
                },
              ),
              "&:hover": {
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                transform: "scale(1.05)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
              "& img": {
                transition: theme.transitions.create(["filter", "transform"], {
                  duration: theme.transitions.duration.shorter,
                }),
              },
              "&:hover img": {
                filter:
                  "brightness(0) invert(1) drop-shadow(0px 0px 4px rgba(247, 110, 160, 0.6))",
                transform: "scale(1.1)",
              },
            }}
          >
            {badge !== undefined && badge > 0 ? (
              <Badge badgeContent={badge} color="primary">
                {icon}
              </Badge>
            ) : (
              icon
            )}
          </IconButton>

          {!isMobile && (
            <Typography
              variant="caption"
              sx={{
                color: "#ffffff",
                fontWeight: 500,
                fontSize: "0.78rem",
                letterSpacing: 0,
                textAlign: "center",
                lineHeight: 1.2,
                transition: theme.transitions.create(["color"], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            >
              {label}
            </Typography>
          )}
        </Box>
      </Link>
    </Box>
  );
};
