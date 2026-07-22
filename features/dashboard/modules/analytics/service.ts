import { CHART_COLORS } from "../../ui";
import type {
  AnalyticsSummary,
  CategoryVolume,
  FunnelStage,
  RevenuePoint,
  TrafficSource,
} from "./types";

// All fixtures are static/deterministic — SSR and client render identically, and
// the shapes mirror what a real analytics API would return (swap the service body
// for `httpClient` calls with no UI changes).

const SUMMARY: AnalyticsSummary = {
  sessions: 128_400,
  conversion: 0.041,
  avgOrderValue: 378.5,
  currency: "USD",
  bookings: 1_284,
  deltas: { sessions: 8.2, conversion: 0.4, avgOrderValue: -2.1, bookings: 6.5 },
};

const REVENUE_TREND: RevenuePoint[] = [
  { month: "Aug", revenue: 28_400 },
  { month: "Sep", revenue: 31_900 },
  { month: "Oct", revenue: 30_100 },
  { month: "Nov", revenue: 35_600 },
  { month: "Dec", revenue: 44_800 },
  { month: "Jan", revenue: 39_200 },
  { month: "Feb", revenue: 37_500 },
  { month: "Mar", revenue: 42_300 },
  { month: "Apr", revenue: 45_900 },
  { month: "May", revenue: 49_700 },
  { month: "Jun", revenue: 52_400 },
  { month: "Jul", revenue: 48_200 },
];

const TRAFFIC_SOURCES: TrafficSource[] = [
  { name: "Organic search", value: 46_800, color: CHART_COLORS.primary },
  { name: "Direct", value: 32_100, color: CHART_COLORS.accent },
  { name: "Referral", value: 21_400, color: CHART_COLORS.info },
  { name: "Social", value: 17_900, color: CHART_COLORS.violet },
  { name: "Paid ads", value: 10_200, color: CHART_COLORS.teal },
];

const BOOKINGS_BY_CATEGORY: CategoryVolume[] = [
  { category: "Hotels", bookings: 512 },
  { category: "Flights", bookings: 318 },
  { category: "Tours", bookings: 194 },
  { category: "Car rental", bookings: 128 },
  { category: "Visa", bookings: 86 },
  { category: "Halls", bookings: 46 },
];

const FUNNEL: FunnelStage[] = [
  { stage: "Sessions", count: 128_400 },
  { stage: "Listing views", count: 68_200 },
  { stage: "Checkout started", count: 12_640 },
  { stage: "Payment", count: 6_820 },
  { stage: "Bookings", count: 5_284 },
];

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Platform analytics data source (stub; repository-ready). */
export const analyticsService = {
  getSummary: (): Promise<AnalyticsSummary> => delay(SUMMARY),
  getRevenueTrend: (): Promise<RevenuePoint[]> => delay(REVENUE_TREND),
  getTrafficSources: (): Promise<TrafficSource[]> => delay(TRAFFIC_SOURCES),
  getBookingsByCategory: (): Promise<CategoryVolume[]> => delay(BOOKINGS_BY_CATEGORY),
  getFunnel: (): Promise<FunnelStage[]> => delay(FUNNEL),
};

export const analyticsKeys = {
  summary: ["analytics", "summary"] as const,
  revenue: ["analytics", "revenue-trend"] as const,
  traffic: ["analytics", "traffic-sources"] as const,
  categories: ["analytics", "bookings-by-category"] as const,
  funnel: ["analytics", "funnel"] as const,
};
