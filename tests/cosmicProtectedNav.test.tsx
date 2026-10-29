import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedNav from '@/components/foundation/layout/ProtectedNav';
const state = vi.hoisted(() => ({ pathname: '/home', cosmic: true, search: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/contexts/InterfaceModeContext', () => ({ useInterfaceMode: () => ({ isCosmic: state.cosmic }) }));
vi.mock('@/contexts/LexiconSearchContext', () => ({ useLexiconSearchSheet: () => ({ openSearch: state.search }) }));
vi.mock('@/hooks/i18n/useTranslation', () => ({ default: () => ({ t: { navigation: { vocabulary:'Vocabulary', messages:'Messages', home:'Home', search:'Search', discover:'Discover', settings:'Settings', allFeatures:'All features', primaryLabel:'Navigation' }, cosmic: { deck: { dockLabel:'Cosmic controls' } } } }) }));
vi.mock('@/hooks/messages/useUnreadMessageCount', () => ({ default: () => ({ unreadCount:2 }) }));
vi.mock('@/hooks/friends/useIncomingFriendRequestCount', () => ({ default: () => ({ count:1 }) }));
vi.mock('@/components/foundation/navigation/AllFeaturesSheet', () => ({ default: () => null }));
vi.mock('@/components/foundation/layout/NavPendingHint', () => ({ default: () => null }));
vi.mock('@/components/foundation/layout/BottomNavigation', () => ({ default: () => <nav aria-label="Standard navigation" /> }));
describe('Cosmic integration in ProtectedNav', () => {
 beforeEach(() => { state.pathname='/home'; state.cosmic=true; state.search.mockClear(); });
 it('opens the real search action and retains all five route destinations', () => {
  render(<ProtectedNav />);
  fireEvent.click(screen.getByRole('button', {name:'Cosmic controls'}));
  expect(screen.getAllByRole('link').map(link=>link.getAttribute('href'))).toEqual(['/vocabulary','/messages','/home','/discover','/profile']);
  fireEvent.click(screen.getByRole('button', {name:'Search'}));
  expect(state.search).toHaveBeenCalledTimes(1);
 });
 it('collapses on arrival at a new route', () => {
  const {rerender}=render(<ProtectedNav />);
  fireEvent.click(screen.getByRole('button', {name:'Cosmic controls'}));
  const core=screen.getByRole('button', {name:'Cosmic controls'});
  state.pathname='/discover'; rerender(<ProtectedNav />);
  expect(screen.getByRole('button', {name:'Cosmic controls'})).toBe(core);
  expect(screen.getByRole('button', {name:'Cosmic controls'})).toHaveAttribute('aria-expanded','false');
 });
 it.each(['/shop','/hangyumi','/wordvault','/games','/messages/conversation-id'])('preserves mobile hiding on %s', pathname => {
  state.pathname=pathname;
  const {container}=render(<ProtectedNav />);
  expect(container.firstElementChild).toHaveClass('hidden','sm:block');
 });
 it('keeps Standard navigation on inner pages', () => {
  state.cosmic=false; state.pathname='/vocabulary'; render(<ProtectedNav />);
  expect(screen.getByRole('navigation', {name:'Standard navigation'})).toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'Cosmic controls'})).not.toBeInTheDocument();
 });
});
