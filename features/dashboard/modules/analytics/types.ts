/** Analytics module data contracts. */

export interface AnalyticsSummary {
  sessions: number;
  /** Conversion as a 0–1 ratio. */
  conversion: number;
  avgOrderValue: number;
  currency: string;
  bookings: number;
  /** Percentage deltas vs the previous period (already ×100). */
  deltas: {
    sessions: number;
    conversion: number;
    avgOrderValue: number;
    bookings: number;
  };
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface TrafficSource {
  name: string;
  value: number;
  color: string;
}

export interface CategoryVolume {
  category: string;
  bookings: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}
