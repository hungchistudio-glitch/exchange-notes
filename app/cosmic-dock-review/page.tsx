import { reviewRouteOnly } from '@/lib/reviewRoutes';
import CosmicDockReview from '@/components/cosmic-dock/CosmicDockReview';
export const metadata = { title: 'Yumi · Obsidian Core', robots: { index: false, follow: false } };
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) {
 reviewRouteOnly();
 const {view}=await searchParams;
 const index=Number(view);
 const active=view!==undefined && [0,1,2,4,5].includes(index)?index:4;
 return <CosmicDockReview active={active}/>;
}
