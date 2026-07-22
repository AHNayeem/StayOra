import { getOverview } from "@/services/account";
import { OverviewView } from "./overview-view";

/**
 * Account overview — the traveler's home. Fetches the aggregated dashboard
 * payload on the server and hands it to the client view (which layers live
 * wishlist/notification counts on top and formats money/dates by locale).
 */
export default async function AccountOverviewPage() {
  const data = await getOverview();
  return <OverviewView data={data} />;
}
