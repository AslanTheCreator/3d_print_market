"use client";
import { Montserrat } from "next/font/google";
import { createTheme, responsiveFontSizes, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

const montserrat = Montserrat({
  subsets: ["cyrillic"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Создаем основные и вторичные цвета для более комплексной палитры
const primaryColor = {
  light: "#f76ea0",
  main: "#ef4284",
  dark: "#d32c6c",
  contrastText: "#fff",
};

const secondaryColor = {
  light: "#7ad4ee", // светлее на ~15%
  main: "#54C5E5", // ваш запрошенный цвет
  dark: "#3ca8c6", // темнее на ~15%
  contrastText: "#ffffff", // белый для хорошего контраста с голубым
};

// Создаем базовую тему без компонентов
let theme = createTheme({
  spacing: 8, // Базовый размер для отступов
  shape: {
    borderRadius: 8, // Более современные скругленные углы по умолчанию
  },
  typography: {
    fontFamily: montserrat.style.fontFamily,
    fontWeightLight: 400,
    fontWeightRegular: 500,
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
      lg: 1200, // Стандартный размер десктопа
      xl: 1536,
    },
  },
  palette: {
    mode: "light",
    primary: primaryColor,
    secondary: secondaryColor,
    error: {
      main: "#f44336",
      light: "#e57373",
      dark: "#d32f2f",
      contrastText: "#fff",
    },
    warning: {
      main: "#ff9800",
      light: "#ffb74d",
      dark: "#f57c00",
      contrastText: "#fff",
    },
    info: {
      main: "#2196f3",
      light: "#64b5f6",
      dark: "#1976d2",
      contrastText: "#fff",
    },
    success: {
      main: "#4caf50",
      light: "#81c784",
      dark: "#388e3c",
      contrastText: "#fff",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
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

// Расширяем тему с компонентами, теперь можно безопасно использовать theme
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
        main: {
          paddingTop: "119px", // Равняется высоте хедера
        },
        // Глобальные стили для скроллбара
        "*::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "*::-webkit-scrollbar-track": {
          background: theme.palette.background.default,
        },
        "*::-webkit-scrollbar-thumb": {
          background: alpha(theme.palette.primary.main, 0.2),
          borderRadius: "4px",
        },
        "*::-webkit-scrollbar-thumb:hover": {
          background: alpha(theme.palette.primary.main, 0.3),
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          borderRadius: "8px",
          padding: "8px 16px",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          },
        }),
        containedPrimary: ({ theme }: { theme: Theme }) => ({
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
          },
        }),
        outlinedPrimary: ({ theme }: { theme: Theme }) => ({
          borderColor: theme.palette.primary.main,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        }),
        textPrimary: ({ theme }: { theme: Theme }) => ({
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
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
        root: {
          fontWeight: 500,
        },
        sizeSmall: {
          height: "24px",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        }),
      },
    },
    MuiTypography: {
      styleOverrides: {
        gutterBottom: {
          marginBottom: "0.75em",
        },
      },
    },
    // Кастомный стиль для мобильных компонентов
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          [theme.breakpoints.down("sm")]: {
            padding: "0px 16px",
          },
        }),
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
      },
    },
    MuiBadge: {
      styleOverrides: {
        root: {
          "& .MuiBadge-badge": {
            fontWeight: 600,
          },
        },
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
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
        },
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
    // Адаптивный Grid для мобильных устройств
    MuiGrid: {
      styleOverrides: {
        container: ({ theme }: { theme: Theme }) => ({
          [theme.breakpoints.down("sm")]: {
            padding: "0 4px", // Уменьшенный отступ на мобильных
          },
        }),
        item: ({ theme }: { theme: Theme }) => ({
          [theme.breakpoints.down("sm")]: {
            padding: "4px", // Уменьшенный отступ между элементами на мобильных
          },
        }),
      },
    },
  },
});

// Применяем адаптивные размеры шрифтов
theme = responsiveFontSizes(theme);

export default theme;
