import { Typography } from "@mui/material";
import { CategoryBreadcrumbs, type CategoryPath } from "@/entities/category";

interface CategoryPageHeaderProps {
  categoryPath: CategoryPath;
}

export const CategoryPageHeader = ({
  categoryPath,
}: CategoryPageHeaderProps) => {
  return (
    <>
      <CategoryBreadcrumbs items={categoryPath.breadcrumbs} />

      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          mb: 3,
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {categoryPath.title}
      </Typography>
    </>
  );
};
