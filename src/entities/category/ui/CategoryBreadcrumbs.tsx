import { Breadcrumbs, Link, Typography } from "@mui/material";
import NextLink from "next/link";
import HomeIcon from "@mui/icons-material/Home";
import type { BreadcrumbItem } from "../model/types";

interface CategoryBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const CategoryBreadcrumbs = ({ items }: CategoryBreadcrumbsProps) => {
  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      sx={{
        mb: 3,
        "& .MuiBreadcrumbs-separator": {
          color: "text.secondary",
        },
      }}
    >
      {/* Главная страница */}
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
        <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
        Главная
      </Link>

      {/* Категории */}
      {items.map((item) =>
        item.isLast ? (
          <Typography
            key={item.id}
            color="text.primary"
            sx={{ fontWeight: 500 }}
          >
            {item.name}
          </Typography>
        ) : (
          <Link
            key={item.id}
            component={NextLink}
            href={item.path}
            underline="hover"
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            {item.name}
          </Link>
        )
      )}
    </Breadcrumbs>
  );
};
