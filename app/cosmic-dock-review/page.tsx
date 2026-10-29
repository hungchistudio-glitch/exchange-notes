import { reviewRouteOnly } from '@/lib/reviewRoutes';
import CosmicDockReview from '@/components/cosmic-dock/CosmicDockReview';
export const metadata = { title: 'Yumi · Obsidian Core', robots: { index: false, follow: false } };
export default function Page() { reviewRouteOnly(); return <CosmicDockReview />; }
