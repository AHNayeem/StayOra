import type { Metadata } from "next";
import { WishlistView } from "./wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Places you've saved, grouped into boards.",
};

export default function WishlistPage() {
  return <WishlistView />;
}
