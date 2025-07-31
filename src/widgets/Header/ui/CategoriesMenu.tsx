"use client";

import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Collapse,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CategoryIcon from "@mui/icons-material/Category";
import { alpha } from "@mui/material/styles";
import { CategoryModel } from "@/entities/category/model/types";
import { useCategories } from "@/entities/category/hooks/useCategories";

interface CategoriesMenuProps {
  onClose: () => void;
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

  // Создаем текущий slug для категории
  // В CategoriesMenu.tsx
  const currentSlug = `${category.id}-${encodeURIComponent(
    category.name.toLowerCase().replace(/\s+/g, "-")
  )}`;

  // Формируем полный путь категории
  const categoryPath = `/catalog/category/${[...parentSlugs, currentSlug].join(
    "/"
  )}`;

  const handleToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleCategoryClick = () => {
    if (!hasChildren) {
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
          pl: level * 2, // Отступ для вложенных элементов
        }}
      >
        <ListItemButton
          onClick={handleCategoryClick}
          sx={{
            py: 1.5,
            pl: level > 0 ? 2 : 2,
            minHeight: 48,
            "&:hover": {
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: level === 0 ? "primary.main" : "text.secondary",
            }}
          >
            <CategoryIcon />
          </ListItemIcon>
          <ListItemText
            primary={category.name}
            primaryTypographyProps={{
              fontWeight: level === 0 ? 500 : 400,
              fontSize: level === 0 ? "1rem" : "0.875rem",
              color: level === 0 ? "text.primary" : "text.secondary",
            }}
          />
          {hasChildren ? (
            <IconButton
              onClick={handleToggle}
              size="small"
              sx={{
                color: "action.active",
                opacity: 0.7,
                "&:hover": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          ) : (
            <ChevronRightIcon
              sx={{
                color: "action.active",
                opacity: 0.7,
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
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

export const CategoriesMenu: React.FC<CategoriesMenuProps> = ({ onClose }) => {
  const { categories, loading, error } = useCategories();

  return (
    <Box
      sx={{
        width: "100%",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "8px",
          display: "none",
        },
        "&:hover::-webkit-scrollbar": {
          display: "block",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.3),
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.5),
        },
      }}
    >
      {/* Header with Figurzilla title */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: "57px",
          px: 2,
          py: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
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
      </Box>

      {/* Loading state */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}

      {/* Error state */}
      {error && !loading && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Categories list */}
      {!loading && !error && categories.length > 0 && (
        <List sx={{ width: "100%", p: 0, mt: 0 }}>
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
      {!loading && !error && categories.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
            px: 2,
          }}
        >
          <CategoryIcon
            sx={{
              fontSize: 48,
              color: "text.secondary",
              mb: 2,
            }}
          />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Категории не найдены
          </Typography>
        </Box>
      )}
    </Box>
  );
};
