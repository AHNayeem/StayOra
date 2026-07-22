/**
 * theme.ts — Single source of truth for design tokens.
 *
 * These mirror the CSS custom properties declared in `app/globals.css` (@theme).
 * Use CSS/Tailwind utilities in components; import these values only when a token
 * is needed in TypeScript (e.g. Framer Motion, canvas, inline chart colors).
 */

export const colors = {
  primary: "#63ab45",
  primary600: "#559537",
  primary700: "#457a2d",
  accent: "#fbb03b",
  accent600: "#e89a26",
  ink: "#100c08",
  body: "#787878",
  muted: "#888888",
  surface: "#ffffff",
  surfaceMuted: "#f5f6f7",
  dark: "#100c08",
  line: "#e7e7e7",
  success: "#63ab45",
  danger: "#e2483d",
  rating: "#fbb03b",
} as const;

export const radius = {
  field: "5px",
  card: "10px",
  panel: "30px",
  pill: "50px",
} as const;

export const shadow = {
  card: "0 10px 30px rgba(16, 12, 8, 0.08)",
  cardHover: "0 18px 44px rgba(16, 12, 8, 0.14)",
  menu: "0 12px 32px rgba(16, 12, 8, 0.12)",
} as const;

export const container = {
  max: "1320px",
} as const;

/** Tailwind default breakpoints (px), exposed for JS-side matchMedia logic. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/** Motion tokens shared between CSS and Framer Motion. */
export const motion = {
  ease: {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
  duration: {
    fast: 0.15,
    base: 0.25,
    slow: 0.5,
  },
} as const;

export const theme = { colors, radius, shadow, container, breakpoints, motion } as const;
export type Theme = typeof theme;
