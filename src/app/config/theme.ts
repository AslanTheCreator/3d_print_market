"use client";
import {
  alpha,
  Components,
  createTheme,
  responsiveFontSizes,
  Theme,
} from "@mui/material/styles";

const appFontFamily =
  'var(--font-montserrat), "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

// Создаем основные и вторичные цвета для более комплексной палитры
const primaryColor = {
  light: "#f76ea0",
  main: "#ef4284",
  dark: "#d32c6c",
  contrastText: "#fff",
};

const secondaryColor = {
  light: "#7ad4ee",
  main: "#54C5E5",
  dark: "#3ca8c6",
  contrastText: "#212121",
};

const successColor = {
  light: "#81c784", // Светло-зеленый
  main: "#4caf50", // Основной зеленый (Material Design Green 500)
  dark: "#388e3c", // Темно-зеленый
  contrastText: "#fff",
};

const preorderColor = { ...secondaryColor };
const accentColors = {
  primary: "#b51f57",
  secondary: "#17627a",
};

// Создаем базовую тему без компонентов
let theme = createTheme({
  spacing: 8, // Базовый размер для отступов
  shape: {
    borderRadius: 8, // Более современные скругленные углы по умолчанию
  },
  typography: {
    fontFamily: appFontFamily,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
      fontSize: "2.5rem", // 40px
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem", // 32px
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.5rem", // 24px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.25rem", // 20px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.125rem", // 18px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: "1rem", // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.57,
    },
    button: {
      fontSize: "0.875rem",
      fontWeight: 600,
      lineHeight: 1.75,
      textTransform: "none", // Отключаем автоматическое преобразование в верхний регистр
    },
    caption: {
      fontSize: "0.75rem",
      fontWeight: 400,
      lineHeight: 1.66,
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 500,
      lineHeight: 1.66,
      textTransform: "uppercase",
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1376,
      xl: 1536,
    },
  },
  palette: {
    mode: "light",
    contrastThreshold: 4.5,
    primary: primaryColor,
    secondary: secondaryColor,
    preorder: preorderColor,
    accent: accentColors,
    error: {
      main: "#d32f2f",
      light: "#e57373",
      dark: "#b71c1c",
      contrastText: "#fff",
    },
    warning: {
      main: "#ffb020",
      light: "#ffb74d",
      dark: "#f59e0b",
      contrastText: "#212121",
    },
    info: {
      main: accentColors.secondary,
      light: secondaryColor.light,
      dark: "#124d60",
      contrastText: "#fff",
    },
    success: {
      ...successColor,
      main: "#2e7d32",
      dark: "#1b5e20",
    },
    text: {
      primary: "#212121",
      secondary: "#616161",
      disabled: "#9e9e9e",
    },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
    divider: "#e0e0e0",
    action: {
      active: "rgba(0, 0, 0, 0.54)",
      hover: "rgba(0, 0, 0, 0.04)",
      hoverOpacity: 0.04,
      selected: "rgba(0, 0, 0, 0.08)",
      selectedOpacity: 0.08,
      disabled: "rgba(0, 0, 0, 0.26)",
      disabledBackground: "rgba(0, 0, 0, 0.12)",
      disabledOpacity: 0.38,
      focus: "rgba(0, 0, 0, 0.12)",
      focusOpacity: 0.12,
      activatedOpacity: 0.12,
    },
  },
});

theme = createTheme(theme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme: Theme) => ({
        html: {
          scrollBehavior: "smooth",
        },
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        },
        a: {
          color: "inherit",
          textDecoration: "none",
          "&:focus-visible": {
            outline: `3px solid var(--focus-ring-color, ${theme.palette.primary.dark})`,
            outlineOffset: 3,
          },
        },
        // Глобальные стили для скроллбара
        "*::-webkit-scrollbar": {
          width: "4px",
          height: "4px",
        },
        "*::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "*::-webkit-scrollbar-thumb": {
          background: "rgba(0, 0, 0, 0.1)",
          borderRadius: "2px",
        },
        "*::-webkit-scrollbar-thumb:hover": {
          background: "rgba(0, 0, 0, 0.2)",
        },
        "*::-webkit-scrollbar-corner": {
          background: "transparent",
        },
        // Для Firefox
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0, 0, 0, 0.1) transparent",
        },
      }),
    },
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          [theme.breakpoints.up("sm")]: {
            paddingLeft: 32,
            paddingRight: 32,
          },
        }),
        maxWidthLg: ({ theme }: { theme: Theme }) => ({
          [theme.breakpoints.up("lg")]: {
            maxWidth: 1504,
          },
        }),
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "&.Mui-focusVisible": {
            outline: `3px solid var(--focus-ring-color, ${theme.palette.primary.dark})`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderRadius: "8px",
          padding: "8px 16px",
          minHeight: 44,
          fontWeight: 600,
          boxShadow: "none",
          "&.Mui-focusVisible": {
            outline: `3px solid var(--focus-ring-color, ${theme.palette.primary.dark})`,
            outlineOffset: 2,
          },
        }),
        contained: {
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          },
        },
        containedPrimary: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.primary.dark,
          color: theme.palette.primary.contrastText,
          "&:hover": {
            backgroundColor: theme.palette.accent.primary,
          },
          "&.Mui-disabled": {
            backgroundColor: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled,
          },
        }),
        outlinedPrimary: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.accent.primary,
          borderColor: theme.palette.primary.main,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        }),
        textPrimary: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.accent.primary,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        }),
        textSecondary: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.accent.secondary,
        }),
        outlinedSecondary: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.accent.secondary,
          borderColor: theme.palette.accent.secondary,
        }),
        textWarning: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.warning.contrastText,
        }),
        outlinedWarning: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.warning.contrastText,
          borderColor: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.08),
        }),
        // Добавляем размер small для мобильных кнопок
        sizeSmall: {
          fontSize: "0.75rem",
          padding: "6px 12px",
        },
      },
      defaultProps: {
        disableElevation: true, // Отключаем тень по умолчанию
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          "&.Mui-focused:not(.Mui-error)": {
            color: ownerState.color === "secondary"
              ? theme.palette.accent.secondary
              : theme.palette.accent.primary,
          },
        }),
      },
    },
    MuiLink: {
      defaultProps: { color: "accent.primary" },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          overflow: "hidden",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "16px",
          "&:last-child": {
            paddingBottom: "16px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          const color = ownerState.color;
          const palette = color && color !== "default" ? theme.palette[color] : null;
          const foreground = color === "primary" ? theme.palette.accent.primary
            : color === "secondary" ? theme.palette.accent.secondary
            : color === "warning" ? theme.palette.warning.contrastText : palette?.dark;
          return {
            fontWeight: 500,
            "&.MuiChip-clickable, &.MuiChip-deletable": { minHeight: 44 },
            ...(palette && {
              color: color === "preorder" ? palette.contrastText : foreground,
              backgroundColor: color === "preorder" ? palette.main : alpha(palette.main, color === "warning" ? 0.16 : 0.08),
              "& .MuiChip-icon": { color: "inherit" },
              "& .MuiChip-deleteIcon": {
                color: "inherit",
                "&:hover": { color: "inherit" },
              },
              "&.MuiChip-clickable:hover, &.Mui-focusVisible": {
                backgroundColor: color === "preorder" ? palette.light : alpha(palette.main, color === "warning" ? 0.24 : 0.14),
              },
            }),
          };
        },
        sizeSmall: {
          height: "24px",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          minWidth: 44,
          minHeight: 44,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
          "&.Mui-focusVisible": {
            outline: `3px solid var(--focus-ring-color, ${theme.palette.primary.dark})`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          minWidth: 44,
          minHeight: 44,
          ...((ownerState.color === "primary" || ownerState.color === "secondary") && {
            "&.Mui-selected": { color: theme.palette.accent[ownerState.color] },
          }),
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: ({ theme }: { theme: Theme }) => ({ color: theme.palette.warning.light }),
        root: {
          "&:not(.MuiRating-readOnly) .MuiRating-label": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 44,
            minHeight: 44,
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        gutterBottom: {
          marginBottom: "0.75em",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: "0",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
        },
        standardWarning: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.warning.contrastText,
          backgroundColor: alpha(theme.palette.warning.main, 0.16),
          "& .MuiAlert-icon": { color: "inherit" },
        }),
        outlinedWarning: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.warning.contrastText,
          borderColor: theme.palette.warning.main,
          "& .MuiAlert-icon": { color: "inherit" },
        }),
        filledWarning: ({ theme }: { theme: Theme }) => ({
          color: theme.palette.warning.contrastText,
          backgroundColor: theme.palette.warning.main,
        }),
      },
    },
    MuiBadge: {
      styleOverrides: {
        colorPrimary: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.primary.dark,
          color: theme.palette.primary.contrastText,
        }),
        root: {
          "& .MuiBadge-badge": {
            fontWeight: 600,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.primary.dark,
          "&:hover": { backgroundColor: theme.palette.accent.primary },
        }),
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          ...(ownerState.color === "primary" && {
            "&.Mui-selected": {
              backgroundColor: theme.palette.primary.dark,
              color: theme.palette.primary.contrastText,
              "&:hover": { backgroundColor: theme.palette.accent.primary },
            },
          }),
        }),
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "&.Mui-active, &.Mui-completed": { color: theme.palette.primary.dark },
        }),
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          "& .MuiPaginationItem-root": {
            margin: "0 2px",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
        indicator: {
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          minHeight: 44,
          "&.Mui-selected": { color: theme.palette.accent.primary },
          "&.Mui-focusVisible": {
            outline: `3px solid var(--focus-ring-color, ${theme.palette.primary.dark})`,
            outlineOffset: -3,
          },
        }),
      },
    },
    // Оптимизация для мобильного меню
    MuiList: {
      styleOverrides: {
        root: {
          padding: "8px 0",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: "8px 16px",
        },
      },
    },
    // Оптимизация диалогов
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }: { theme: Theme }) => ({
          borderRadius: "12px",
          [theme.breakpoints.down("sm")]: {
            margin: "16px",
            maxWidth: "calc(100% - 32px)",
          },
        }),
      },
    },
  } satisfies Components<Theme>,
});

// Применяем адаптивные размеры шрифтов
theme = responsiveFontSizes(theme);

export default theme;

declare module "@mui/material/styles" {
  interface Palette {
    preorder: Palette["primary"];
    accent: typeof accentColors;
  }

  interface PaletteOptions {
    preorder?: PaletteOptions["primary"];
    accent?: typeof accentColors;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    preorder: true;
  }
}
