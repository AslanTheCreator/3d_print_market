import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface GridProps {
  children: React.ReactNode;
}

export const ProductGrid: React.FC<GridProps> = ({ children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        sm: "repeat(auto-fill, minmax(156px, 1fr))",
        md: "repeat(auto-fill, minmax(190px, 1fr))",
      },
      gap: { xs: 1, sm: 1.5, md: 2.5 },
      margin: { xs: "-4px", sm: 0 },
      width: { xs: "calc(100% + 8px)", sm: "100%" },
    }}
  >
    {children}
  </Box>
);

interface GridItemProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
}

export const ProductGridItem: React.FC<GridItemProps> = ({
  children,
  sx,
  xs = 6,
  sm = 3,
  md = 3,
  lg = 2,
}) => (
  <Box
    sx={[
      {
        padding: { xs: "4px", sm: 0 },
        minWidth: 0,
        gridColumn: {
          xs: xs >= 12 ? "1 / -1" : "span 1",
          sm: sm >= 6 ? "span 2" : "span 1",
          md: md >= 6 ? "span 2" : "span 1",
          lg: lg >= 4 ? "span 2" : "span 1",
        },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);
