export const DASHBOARD_SECTIONS = {
  MAIN: "main",
  PROFILE: "profile",
  PAYMENT_METHODS: "payment-methods",
} as const;

export type DashboardSection =
  (typeof DASHBOARD_SECTIONS)[keyof typeof DASHBOARD_SECTIONS];
