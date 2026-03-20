"use client";

import HomeIcon from "@mui/icons-material/Home";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import NextLink from "next/link";
import { buildCategoryPath } from "@/entities/category";
import { CategoryModel } from "@/shared/types";

interface ProductDetailsBreadcrumbsProps {
  categories: CategoryModel[];
  mb?: number;
}

export function ProductDetailsBreadcrumbs({
  categories,
  mb = 2,
}: ProductDetailsBreadcrumbsProps) {
  const primaryCategory = categories[0];

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      maxItems={3}
      sx={{
        mb,
        "& .MuiBreadcrumbs-separator": {
          color: "text.secondary",
        },
      }}
    >
      <Link
        component={NextLink}
        href="/"
        underline="hover"
        sx={{
          display: "flex",
          alignItems: "center",
          color: "text.secondary",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Главная
      </Link>

      {primaryCategory ? (
        <Link
          component={NextLink}
          href={buildCategoryPath([], primaryCategory)}
          underline="hover"
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          {primaryCategory.name}
        </Link>
      ) : null}
    </Breadcrumbs>
  );
}
