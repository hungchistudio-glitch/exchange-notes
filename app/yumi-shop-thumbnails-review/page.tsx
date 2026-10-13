import ShopThumbnailsReview from "@/components/shop/ShopThumbnailsReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Renders every shop piece's picture for scripts/render-shop-thumbnails.mjs,
 * which writes them to public/shop-thumbs. Development furniture.
 */
export const metadata = {
  title: "Yumi shop thumbnails",
  robots: { index: false, follow: false },
};

export default function Page() {
  reviewRouteOnly();
  return <ShopThumbnailsReview />;
}
