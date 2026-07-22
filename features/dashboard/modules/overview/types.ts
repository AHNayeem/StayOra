export interface DashboardSummary {
  revenueTotal: number;
  revenueCurrency: string;
  bookingsCount: number;
  newUsers: number;
  activeMerchants: number;
  /** Occupancy as a 0–1 ratio. */
  occupancy: number;
  /** Conversion as a 0–1 ratio. */
  conversion: number;
}

/** One point on the revenue/bookings trend (monthly). */
export interface PerformancePoint {
  /** Short month label, e.g. "Jan". */
  month: string;
  revenue: number;
  bookings: number;
}

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  when: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}
