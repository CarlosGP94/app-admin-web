import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      tablet: 900,
      md: 1200,
      desktop: 1440,
      lg: 1600,
      xl: 1920,
    },
  },
  palette: {
    mode: "light",
    background: {
      default: "#f7f9fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#191c1e",
      secondary: "#454650",
      disabled: "#8b9198",
    },
    primary: {
      main: "#001040",
      contrastText: "#ffffff",
      container: "#0a2366",
      onContainer: "#7a8dd5",
    },
    secondary: {
      main: "#505f76",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ba1a1a",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#e67e00",
      contrastText: "#ffffff",
    },
    success: {
      main: "#00875a",
      contrastText: "#ffffff",
    },
    info: {
      main: "#0052cc",
      contrastText: "#ffffff",
    },
    surface: {
      main: "#f7f9fb",
      dim: "#d8dadc",
      bright: "#f7f9fb",
      containerLowest: "#ffffff",
      containerLow: "#f2f4f6",
      container: "#eceef0",
      containerHigh: "#e6e8ea",
      containerHighest: "#e0e3e5",
    },
    surfaceVariant: {
      main: "#e0e3e5",
    },
    divider: "#c5c5d2",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    h1: {
      fontSize: "2.25rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "#001040",
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.43,
    },
    displayLg: {
      fontFamily: "Inter, sans-serif",
      fontSize: "2.25rem",
      fontWeight: 700,
      lineHeight: "2.75rem",
      letterSpacing: "-0.02em",
    },
    headlineMdMobile: {
      fontFamily: "Inter, sans-serif",
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: "1.75rem",
    },
    labelBold: {
      fontFamily: "Inter, sans-serif",
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: "1rem",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    dataMono: {
      fontFamily: "Inter, monospace",
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: "1.25rem",
      fontVariantNumeric: "tabular-nums",
    },
  },
  rounded: {
    sm: "4px",
    DEFAULT: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },
  customSpacing: {
    containerMargin: 24,
    gutter: 16,
    sidebarWidth: 260,
    unitXs: 4,
    unitSm: 8,
    unitMd: 16,
    unitLg: 24,
    unitXl: 48,
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.rounded.DEFAULT,
          padding: "8px 16px",
          fontWeight: 600,
          textTransform: "none",
          letterSpacing: "0.01em",
          "&:active": {
            transform: "scale(0.98)",
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.rounded.DEFAULT,
          border: "1px solid #eceef0",
          backgroundColor: "#ffffff",
          padding: theme.spacing(2.5),
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.rounded.DEFAULT,
          backgroundColor: "#f2f4f6",
          transition: "all 0.2s ease-in-out",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#c5c5d2",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#757681",
          },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#001040",
              borderWidth: "2px",
            },
          },
        }),
        input: {
          padding: "12px 14px",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.rounded.DEFAULT,
          border: "1px solid #eceef0",
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#eceef0",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
          borderBottom: "1px solid #eceef0",
        },
        head: {
          color: "#454650",
          fontWeight: 600,
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(0, 16, 64, 0.02) !important",
          },
        },
      },
    },
  },
});

export default theme;
