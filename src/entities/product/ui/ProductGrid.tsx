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
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
}

export const ProductGridItem: React.FC<GridItemProps> = ({
  children,
  isMobile,
  xs = 6,
  sm = 3,
  md = 3,
  lg = 2,
}) => (
  <Grid
    item
    xs={xs}
    sm={sm}
    md={md}
    lg={lg}
    sx={{
      padding: isMobile ? "4px" : undefined,
    }}
  >
    {children}
  </Grid>
);
