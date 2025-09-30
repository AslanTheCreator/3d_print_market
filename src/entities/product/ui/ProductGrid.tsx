import { Grid } from "@mui/material";

interface GridProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const ProductGrid: React.FC<GridProps> = ({ children, isMobile }) => (
  <Grid
    container
    spacing={{ xs: 1, sm: 1.5, md: 2.5 }}
    sx={{
      margin: isMobile ? "-4px" : undefined,
      width: isMobile ? "calc(100% + 8px)" : "100%",
    }}
  >
    {children}
  </Grid>
);

interface GridItemProps {
  children: React.ReactNode;
  isMobile: boolean;
}

export const ProductGridItem: React.FC<GridItemProps> = ({
  children,
  isMobile,
}) => (
  <Grid
    item
    xs={6}
    sm={3}
    md={3}
    lg={2}
    sx={{
      padding: isMobile ? "4px" : undefined,
    }}
  >
    {children}
  </Grid>
);
