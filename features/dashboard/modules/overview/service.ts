import type { ActivityItem, DashboardSummary, PerformancePoint } from "./types";

const SUMMARY: DashboardSummary = {
  revenueTotal: 486_200,
  revenueCurrency: "USD",
  bookingsCount: 1_284,
  newUsers: 342,
  activeMerchants: 87,
  occupancy: 0.73,
  conversion: 0.041,
};

const ACTIVITY: ActivityItem[] = [
  { id: "act_1", icon: "CalendarCheck", title: "New booking BK-1058 confirmed", when: "2 min ago", tone: "success" },
  { id: "act_2", icon: "Store", title: "Merchant “Marina Living” requested approval", when: "18 min ago", tone: "warning" },
  { id: "act_3", icon: "Wallet", title: "Payout PMT-9042 released", when: "1 hr ago", tone: "info" },
  { id: "act_4", icon: "Star", title: "Review reported on “Azure Bay Resort”", when: "3 hrs ago", tone: "danger" },
  { id: "act_5", icon: "Users", title: "27 new customers signed up today", when: "5 hrs ago", tone: "neutral" },
];

// Trailing-12-months revenue & bookings trend. Static (deterministic) so SSR and
// client render identically; the shape matches what an analytics API would return.
const PERFORMANCE: PerformancePoint[] = [
  { month: "Aug", revenue: 28_400, bookings: 812 },
  { month: "Sep", revenue: 31_900, bookings: 905 },
  { month: "Oct", revenue: 30_100, bookings: 878 },
  { month: "Nov", revenue: 35_600, bookings: 1_012 },
  { month: "Dec", revenue: 44_800, bookings: 1_268 },
  { month: "Jan", revenue: 39_200, bookings: 1_104 },
  { month: "Feb", revenue: 37_500, bookings: 1_061 },
  { month: "Mar", revenue: 42_300, bookings: 1_190 },
  { month: "Apr", revenue: 45_900, bookings: 1_247 },
  { month: "May", revenue: 49_700, bookings: 1_336 },
  { month: "Jun", revenue: 52_400, bookings: 1_402 },
  { month: "Jul", revenue: 48_200, bookings: 1_284 },
];

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Dashboard metrics/activity data source (stub; repository-ready). */
export const overviewService = {
  getSummary: (): Promise<DashboardSummary> => delay(SUMMARY),
  getActivity: (): Promise<ActivityItem[]> => delay(ACTIVITY),
  getPerformance: (): Promise<PerformancePoint[]> => delay(PERFORMANCE),
};

export const overviewKeys = {
  summary: ["overview", "summary"] as const,
  activity: ["overview", "activity"] as const,
  performance: ["overview", "performance"] as const,
  recentBookings: ["overview", "recent-bookings"] as const,
};
