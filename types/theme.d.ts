import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    tablet: true; // <-- Habilitamos el breakpoint personalizado 'tablet'
    md: true;
    desktop: true; // <-- Habilitamos el breakpoint personalizado 'desktop'
    lg: true;
    xl: true;
  }

  interface Palette {
    surface: Palette["primary"];
    surfaceVariant: Palette["primary"];
    surfaceTint: string;
    tertiary: Palette["primary"];
    errorContainer: Palette["primary"];
  }

  interface PaletteOptions {
    surface?: PaletteOptions["primary"];
    surfaceVariant?: PaletteOptions["primary"];
    surfaceTint?: string;
    tertiary?: PaletteOptions["primary"];
    errorContainer?: PaletteOptions["primary"];
  }

  // Agregamos las propiedades personalizadas para los colores
  interface PaletteColor {
    dim?: string;
    bright?: string;
    containerLowest?: string;
    containerLow?: string;
    container?: string;
    onContainer?: string; // <-- Propiedad agregada para solucionar el error
    containerHigh?: string;
    containerHighest?: string;
    inverse?: string;
    onInverse?: string;
    fixed?: string;
    fixedDim?: string;
    onFixed?: string;
    onFixedVariant?: string;
  }

  interface SimplePaletteColorOptions {
    dim?: string;
    bright?: string;
    containerLowest?: string;
    containerLow?: string;
    container?: string;
    onContainer?: string; // <-- Propiedad agregada para solucionar el error
    containerHigh?: string;
    containerHighest?: string;
    inverse?: string;
    onInverse?: string;
    fixed?: string;
    fixedDim?: string;
    onFixed?: string;
    onFixedVariant?: string;
  }

  interface Theme {
    rounded: {
      sm: string;
      DEFAULT: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
    customSpacing: {
      containerMargin: number;
      gutter: number;
      sidebarWidth: number;
      unitXs: number;
      unitSm: number;
      unitMd: number;
      unitLg: number;
      unitXl: number;
    };
  }

  interface ThemeOptions {
    rounded?: {
      sm?: string;
      DEFAULT?: string;
      md?: string;
      lg?: string;
      xl?: string;
      full?: string;
    };
    customSpacing?: {
      containerMargin?: number;
      gutter?: number;
      sidebarWidth?: number;
      unitXs?: number;
      unitSm?: number;
      unitMd?: number;
      unitLg?: number;
      unitXl?: number;
    };
  }

  interface TypographyVariants {
    displayLg: React.CSSProperties;
    headlineMdMobile: React.CSSProperties;
    labelBold: React.CSSProperties;
    dataMono: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    displayLg?: React.CSSProperties;
    headlineMdMobile?: React.CSSProperties;
    labelBold?: React.CSSProperties;
    dataMono?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    displayLg: true;
    headlineMdMobile: true;
    labelBold: true;
    dataMono: true;
  }
}
