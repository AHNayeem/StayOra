import { PageSkeleton } from "@/features/dashboard/components/page-skeleton";

/** Route-level loading UI for the dashboard subtree (streams during nav). */
export default function DashboardLoading() {
  return <PageSkeleton />;
}
