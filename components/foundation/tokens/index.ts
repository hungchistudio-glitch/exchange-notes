export const foundationSpacing = {
  none: "0",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "3rem",
} as const;

export const foundationRadius = {
  none: "0",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  full: "9999px",
} as const;

export const foundationShadow = {
  none: "none",
  sm: "0 1px 2px rgb(0 0 0 / 0.05)",
  md: "0 4px 12px rgb(0 0 0 / 0.08)",
  lg: "0 12px 32px rgb(0 0 0 / 0.12)",
} as const;

export const foundationMotion = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
} as const;

export const foundationZIndex = {
  base: 0,
  raised: 10,
  header: 30,
  navigation: 40,
  modal: 50,
  toast: 60,
} as const;

export const foundationLayout = {
  pageMaxWidth: "48rem",
  contentMaxWidth: "40rem",
  pagePaddingMobile: "1rem",
  pagePaddingDesktop: "1.5rem",
  bottomNavigationHeight: "5rem",
} as const;
