import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CosmicCoreNavigation from '@/components/foundation/layout/CosmicCoreNavigation';
vi.mock('@/components/foundation/layout/NavPendingHint',()=>({default:()=>null}));
const items=[{href:'/home',label:'Home',icon:<span>H</span>,active:true},{href:'/messages',label:'Messages',icon:<span>M</span>,badgeCount:3},{label:'Search',icon:<span>S</span>,onSelect:vi.fn()}];
describe('Cosmic core navigation',()=>{
 it('keeps collapsed controls inert, opens and dismisses with Escape restoring focus',()=>{
  render(<CosmicCoreNavigation items={items} label="Controls"/>);
  const core=screen.getByRole('button',{name:'Controls'});const nav=screen.getByRole('navigation',{hidden:true});
  expect(nav).toHaveAttribute('inert');fireEvent.click(core);expect(nav).not.toHaveAttribute('inert');
  screen.getByRole('link',{name:'Messages'}).focus();fireEvent.keyDown(document,{key:'Escape'});
  expect(core).toHaveAttribute('aria-expanded','false');expect(core).toHaveFocus();
 });
 it('retains real links and per-destination badges; outside click closes',()=>{
  render(<CosmicCoreNavigation items={items} label="Controls"/>);fireEvent.click(screen.getByRole('button',{name:'Controls'}));
  expect(screen.getByRole('link',{name:'Messages'})).toHaveAttribute('href','/messages');expect(screen.getByText('3')).toBeVisible();
  fireEvent.pointerDown(document.body);expect(screen.getByRole('button',{name:'Controls'})).toHaveAttribute('aria-expanded','false');
 });
 it('runs search once synchronously and closes without navigating',()=>{
  const open=vi.fn();render(<CosmicCoreNavigation items={[...items.slice(0,2),{...items[2],onSelect:open}]} label="Controls"/>);
  fireEvent.click(screen.getByRole('button',{name:'Controls'}));fireEvent.click(screen.getByRole('button',{name:'Search'}));
  expect(open).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Controls'})).toHaveAttribute('aria-expanded','false');
 });
 it('starts closing on a destination click before route arrival, without cancelling navigation',()=>{
  render(<CosmicCoreNavigation items={items} label="Controls"/>);
  const core=screen.getByRole('button',{name:'Controls'});
  fireEvent.click(core);
  const link=screen.getByRole('link',{name:'Messages'});
  const click=new MouseEvent('click',{bubbles:true,cancelable:true});
  fireEvent(link,click);
  expect(click.defaultPrevented).toBe(false);
  expect(core).toHaveAttribute('aria-expanded','false');
  expect(screen.getByRole('navigation',{hidden:true})).toHaveAttribute('inert');
 });
 it('keeps the rail open for a modified new-tab click',()=>{
  render(<CosmicCoreNavigation items={items} label="Controls"/>);
  const core=screen.getByRole('button',{name:'Controls'});fireEvent.click(core);
  fireEvent.click(screen.getByRole('link',{name:'Messages'}),{metaKey:true});
  expect(core).toHaveAttribute('aria-expanded','true');
 });
 it('uses translated labels and resets disclosure on a route change without remounting',()=>{
  const {rerender}=render(<CosmicCoreNavigation routeKey="/home" items={items} label="Controls"/>);fireEvent.click(screen.getByRole('button',{name:'Controls'}));
  rerender(<CosmicCoreNavigation routeKey="/messages" items={items.map(i=>({...i,label:i.label==='Home'?'首頁':i.label}))} label="控制列"/>);
  expect(screen.getByRole('button',{name:'控制列'})).toHaveAttribute('aria-expanded','false');fireEvent.click(screen.getByRole('button',{name:'控制列'}));expect(screen.getByRole('link',{name:'首頁'})).toBeVisible();
 });
});
