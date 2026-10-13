'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useTranslation from '@/hooks/i18n/useTranslation';
import copy from '@/lib/shop/energyCopy';
import { ENERGY_REFRESH_EVENT } from '@/lib/shop/energyEvents';
import EnergyReward from './EnergyReward';
type Credit = {id:string;amount:number;kind:'save'|'review'|'paid'};
/** Only committed, server-owned receipts can trigger a real reward animation. */
export default function EnergyRewardObserver({userId}:{userId:string}) {
 const {language}=useTranslation();
 const [reward,setReward]=useState<{amount:number;kind:Credit['kind']|'mixed';key:string}|null>(null);
 useEffect(()=>{
  const client=createClient(); let cancelled=false,busy=false; let timer:ReturnType<typeof setTimeout>|undefined;
  const seen=new Set<string>();
  async function check(){
   if(cancelled||busy||document.hidden||!navigator.onLine)return;
   busy=true;
   try{
    const {data,error}=await client.from('yumi_energy_ledger').select('id,amount,kind').eq('user_id',userId).is('notified_at',null).in('kind',['save','review','paid']).gt('amount',0).order('created_at',{ascending:true}).limit(100);
    if(error||cancelled)return;
    const all=(data??[]) as Credit[]; const fresh=all.filter(x=>!seen.has(x.id));
    if(fresh.length){
     fresh.forEach(x=>seen.add(x.id));
     const kinds=new Set(fresh.map(x=>x.kind));
     setReward({amount:fresh.reduce((n,x)=>n+x.amount,0),kind:kinds.size===1?fresh[0].kind:'mixed',key:fresh[0].id});
     clearTimeout(timer);timer=setTimeout(()=>{if(!cancelled)setReward(null)},2400);
    }
    // Failed acknowledgements are retried; in-memory seen prevents replay in this mount.
    if(all.length)await client.rpc('ack_yumi_energy',{p_ids:all.map(x=>x.id)});
   }catch{/* Rewards remain queued on the server while offline. */}finally{busy=false;}
  }
  void check(); const interval=setInterval(()=>void check(),15000);
  const wake=()=>void check();
  window.addEventListener(ENERGY_REFRESH_EVENT,wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
  return()=>{cancelled=true;clearTimeout(timer);clearInterval(interval);window.removeEventListener(ENERGY_REFRESH_EVENT,wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
 },[userId]);
 if(!reward)return null;
 const c=copy[language]; const label=reward.kind==='save'?c.saved:reward.kind==='review'?c.review:reward.kind==='paid'?c.paid:c.mixed;
 return <EnergyReward key={reward.key} amount={reward.amount} label={label}/>;
}
