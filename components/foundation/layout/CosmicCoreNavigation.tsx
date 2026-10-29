'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import NavPendingHint from './NavPendingHint';
import s from './CosmicCoreNavigation.module.css';

type Item = { href?: string; label: string; icon: ReactNode; active?: boolean; onSelect?: () => void; badgeCount?: number };
/** Keep the same DOM across route arrivals so closing CSS transitions finish.
 * Navigation and search start in the click event, never after an animation timer. */
export default function CosmicCoreNavigation({items,label,routeKey}:{items:Item[];label:string;routeKey?:string}) {
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<number|null>(null),[showLabel,setShowLabel]=useState(false);
 const [previousRoute,setPreviousRoute]=useState(routeKey);
 if(previousRoute!==routeKey){
  setPreviousRoute(routeKey);setOpen(false);setSelected(null);setShowLabel(false);
 }
 const root=useRef<HTMLDivElement>(null),core=useRef<HTMLButtonElement>(null);
 const labelTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(labelTimer.current)clearTimeout(labelTimer.current);},[]);
 const id=useId();
 const active=Math.max(0,items.findIndex(item=>item.active));
 const current=selected??active;
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);core.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[open]);
 function choose(index:number){
  setSelected(index);setShowLabel(true);setOpen(false);core.current?.focus();
  if(labelTimer.current)clearTimeout(labelTimer.current);
  labelTimer.current=setTimeout(()=>setShowLabel(false),1400);
  if(items[index].onSelect){setOpen(false);core.current?.focus();items[index].onSelect?.();}
 }
 const unread=items.some(item=>(item.badgeCount??0)>0);
 return <div ref={root} data-app-bottom-navigation className={s.dock} data-open={open} style={{'--slot':current} as CSSProperties}>
  <div className={s.label} role="status" data-visible={showLabel}>{items[current]?.label}</div>
  <nav id={id} className={s.rail} aria-label={label} inert={!open} aria-hidden={!open}>
   <div className={s.track}/><div className={s.energy}/>
   {items.map((item,index)=>{const content=<>{item.icon}<span className={s.dot}/>{Boolean(item.badgeCount)&&<span className={s.badge}>{item.badgeCount!>9?'9+':item.badgeCount}</span>}</>;return item.href&&!item.onSelect?
    <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={item.active?'page':undefined} data-selected={current===index} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;choose(index);if(item.active){setOpen(false);core.current?.focus();}}}>{content}<NavPendingHint/></Link>:
    <button key={item.label} type="button" title={item.label} aria-label={item.label} data-selected={current===index} onClick={()=>choose(index)}>{content}</button>;})}
  </nav>
  <button ref={core} className={s.core} type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>{setSelected(null);setOpen(value=>!value);}}><span className={s.gear}/><span className={s.lens}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M23 8a11 11 0 1 0 0 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M5 16h8" stroke="currentColor" strokeWidth="2"/><circle cx="17" cy="16" r="4" stroke="currentColor" strokeWidth="1.5"/><circle cx="17" cy="16" r="1.2" fill="currentColor"/></svg></span>{unread&&<span className={s.coreUnread} aria-hidden="true"/>}</button>
 </div>;
}
