"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { useRouter } from "next/navigation";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CategoryIcon from "@mui/icons-material/Category";
import CloseIcon from "@mui/icons-material/Close";
import { alpha } from "@mui/material/styles";
import {
  useCategories,
  getCategorySlug,
  buildCategoryPath,
} from "@/entities/category";
import { getCategoryIcon } from "@/entities/category";
import { CategoryModel } from "@/entities/category";

interface CategoriesMenuProps {
  onClose: () => void;
  enabled?: boolean;
  showCloseButton?: boolean;
}

interface CategoryItemProps {
  category: CategoryModel;
  onClose: () => void;
  level?: number;
  parentSlugs?: string[];
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  onClose,
  level = 0,
  parentSlugs = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const hasChildren = category.childs?.length > 0;

  const currentSlug = getCategorySlug(category);
  const categoryPath = buildCategoryPath(parentSlugs, category);

  const Icon = getCategoryIcon(category.name);

  const handleCategoryClick = () => {
    if (hasChildren) {
      setIsExpanded((prev) => !prev);
    } else {
      router.replace(categoryPath);
      onClose();
    }
  };

  return (
    <>
      <ListItem
        disablePadding
        divider={level === 0}
        sx={{
          px: 1,
          pt: 0.25,
          pb: level === 0 ? 0.75 : 0.25,
        }}
      >
        <ListItemButton
          onClick={handleCategoryClick}
          sx={{
            position: "relative",
            overflow: "hidden",
            py: level === 0 ? 1.5 : 1.1,
            pl: 2 + level * 1.5,
            pr: 1.5,
            minHeight: level === 0 ? 56 : 48,
            borderRadius: 3,
            backgroundColor: isExpanded
              ? (theme) => alpha(theme.palette.primary.main, 0.08)
              : "transparent",
            transition: (theme) =>
              theme.transitions.create(
                ["background-color", "transform", "box-shadow"],
                {
                  duration: theme.transitions.duration.shorter,
                },
              ),
            "&::before": level
              ? {
                  content: '""',
                  position: "absolute",
                  left: 16 + (level - 1) * 12,
                  top: 8,
                  bottom: 8,
                  width: "1px",
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.12),
                }
              : undefined,
            "&:hover": {
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.06),
              transform: "translateX(2px)",
            },
            "&.Mui-focusVisible": {
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.1),
              boxShadow: (theme) =>
                `0 0 0 2px ${alpha(theme.palette.primary.main, 0.16)}`,
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: level === 0 ? "primary.main" : "text.secondary",
              "& svg": {
                fontSize: level === 0 ? 22 : 20,
              },
            }}
          >
            <Icon />
          </ListItemIcon>
          <ListItemText
            primary={category.name}
            primaryTypographyProps={{
              fontWeight: level === 0 ? 600 : 500,
              fontSize: level === 0 ? "1rem" : "0.875rem",
              color: level === 0 ? "text.primary" : "text.secondary",
              lineHeight: 1.3,
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: "50%",
              backgroundColor: (theme) => alpha(theme.palette.common.black, 0.04),
              color: "action.active",
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ExpandLessIcon sx={{ opacity: 0.8 }} />
              ) : (
                <ExpandMoreIcon sx={{ opacity: 0.8 }} />
              )
            ) : (
              <ChevronRightIcon sx={{ opacity: 0.7 }} />
            )}
          </Box>
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List
            component="div"
            disablePadding
            sx={{
              pb: 0.5,
            }}
          >
            {category.childs.map((childCategory) => (
              <CategoryItem
                key={childCategory.id}
                category={childCategory}
                onClose={onClose}
                level={level + 1}
                parentSlugs={[...parentSlugs, currentSlug]}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export const CategoriesMenu: React.FC<CategoriesMenuProps> = ({
  onClose,
  enabled = true,
  showCloseButton = false,
}) => {
  const { data: categories = [], isLoading, error } = useCategories({
    enabled,
  });
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 700);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Box
        onScroll={handleScroll}
        sx={{
          width: "100%",
          maxHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 140px)",
          overflowX: "hidden",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: isScrolling
            ? `rgba(148, 163, 184, 0.9) transparent`
            : "transparent transparent",
          msOverflowStyle: "auto",
          "&::-webkit-scrollbar": {
            width: "4px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: isScrolling
              ? "rgba(148, 163, 184, 0.9)"
              : "transparent",
            borderRadius: "999px",
          },
          "&::-webkit-scrollbar-corner": {
            background: "transparent",
          },
        }}
      >
      {/* Header with Figurzilla title */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 68,
          px: 2,
          py: 1.5,
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(10px)",
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            color: "secondary.main",
          }}
        >
          Figurzilla
        </Typography>
        {showCloseButton && (
          <IconButton
            onClick={onClose}
            aria-label="Закрыть меню категорий"
            sx={{
              display: { xs: "inline-flex", md: "none" },
              width: 44,
              height: 44,
              flexShrink: 0,
              backgroundColor: "background.default",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "220px",
            px: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        </Box>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Box sx={{ p: 2 }}>
          <Alert
            severity="error"
            sx={{
              borderRadius: 3,
              boxShadow: (theme) =>
                `0 12px 24px ${alpha(theme.palette.error.main, 0.12)}`,
            }}
          >
            {error.message}
          </Alert>
        </Box>
      )}

      {/* Categories list */}
      {!isLoading && !error && categories.length > 0 && (
        <List
          sx={{
            width: "100%",
            p: 1,
            pt: 1.25,
            pb: 2,
          }}
        >
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              onClose={onClose}
            />
          ))}
        </List>
      )}

      {/* Empty state */}
      {!isLoading && !error && categories.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "220px",
            px: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
              mb: 2,
            }}
          >
            <CategoryIcon
              sx={{
                fontSize: 36,
                color: "text.secondary",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Категории не найдены
          </Typography>
        </Box>
      )}
      </Box>
    </Box>
  );
};
