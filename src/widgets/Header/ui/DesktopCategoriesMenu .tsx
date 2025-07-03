"use client";

import React, { useState } from "react";
import {
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Paper,
  Popper,
  ClickAwayListener,
  Grow,
} from "@mui/material";
import Link from "next/link";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CategoryIcon from "@mui/icons-material/Category";
import { alpha } from "@mui/material/styles";
import { CategoryModel } from "@/entities/category/model/types";
import { useCategories } from "@/entities/category/hooks/useCategories";

interface DesktopCategoriesMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

interface CategorySubmenuProps {
  category: CategoryModel;
  onClose: () => void;
}

const CategorySubmenu: React.FC<CategorySubmenuProps> = ({
  category,
  onClose,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (category.childs && category.childs.length > 0) {
      setAnchorEl(event.currentTarget);
      setSubmenuOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setSubmenuOpen(false);
    setAnchorEl(null);
  };

  const hasChildren = category.childs && category.childs.length > 0;

  return (
    <>
      <MenuItem
        component={hasChildren ? "div" : Link}
        href={hasChildren ? undefined : `/categories/${category.id}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={hasChildren ? undefined : onClose}
        sx={{
          display: "flex",
          alignItems: "center",
          py: 1,
          px: 2,
          minHeight: 48,
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <CategoryIcon
          sx={{
            mr: 2,
            color: "primary.main",
          }}
        />
        <Typography
          variant="body1"
          sx={{
            flex: 1,
            fontWeight: 500,
          }}
        >
          {category.name}
        </Typography>
        {hasChildren && (
          <ChevronRightIcon
            sx={{
              color: "action.active",
              ml: 1,
            }}
          />
        )}
      </MenuItem>

      {hasChildren && (
        <Popper
          open={submenuOpen}
          anchorEl={anchorEl}
          placement="right-start"
          transition
          disablePortal
          sx={{
            zIndex: 1300,
          }}
        >
          {({ TransitionProps }) => (
            <Grow {...TransitionProps} timeout={150}>
              <Paper
                elevation={8}
                sx={{
                  mt: -1,
                  ml: 0.5,
                  minWidth: 200,
                  maxWidth: 300,
                  maxHeight: 400,
                  overflow: "auto",
                  borderRadius: 2,
                }}
                onMouseEnter={() => setSubmenuOpen(true)}
                onMouseLeave={handleMouseLeave}
              >
                <Box sx={{ py: 1 }}>
                  {category.childs.map((childCategory) => (
                    <MenuItem
                      key={childCategory.id}
                      component={Link}
                      href={`/categories/${childCategory.id}`}
                      onClick={onClose}
                      sx={{
                        py: 0.75,
                        px: 2,
                        "&:hover": {
                          backgroundColor: (theme) =>
                            alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 400,
                          color: "text.secondary",
                        }}
                      >
                        {childCategory.name}
                      </Typography>
                    </MenuItem>
                  ))}
                </Box>
              </Paper>
            </Grow>
          )}
        </Popper>
      )}
    </>
  );
};

export const DesktopCategoriesMenu: React.FC<DesktopCategoriesMenuProps> = ({
  anchorEl,
  open,
  onClose,
}) => {
  const { categories, loading, error } = useCategories();

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      MenuListProps={{
        "aria-labelledby": "categories-button",
        sx: { py: 1 },
      }}
      PaperProps={{
        elevation: 8,
        sx: {
          mt: 1,
          minWidth: 250,
          maxWidth: 350,
          maxHeight: 500,
          overflow: "auto",
          borderRadius: 2,
          "& .MuiMenuItem-root": {
            borderRadius: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: "left", vertical: "top" }}
      anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
    >
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 4,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Загрузка...
          </Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {!loading && !error && categories.length > 0 && (
        <>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 600,
                color: "text.secondary",
                letterSpacing: 0.5,
              }}
            >
              Категории
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {categories.map((category) => (
            <CategorySubmenu
              key={category.id}
              category={category}
              onClose={onClose}
            />
          ))}
        </>
      )}

      {!loading && !error && categories.length === 0 && (
        <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Категории не найдены
          </Typography>
        </Box>
      )}
    </Menu>
  );
};
