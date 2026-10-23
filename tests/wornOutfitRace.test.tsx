import { act, render, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { YumiOutfit } from '@/lib/shop/catalog';
const server = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/shop/wallet', () => ({ createSupabaseWallet: () => ({ load: server.load }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { getWornOutfit, setWornOutfit, useWornOutfit } from '@/lib/shop/wornOutfit';
it('ignores a stale home refresh that resolves after a shop save', async () => {
  let resolve!: (value: { outfit: YumiOutfit }) => void;
  server.load.mockImplementation(() => new Promise(done => { resolve = done; }));
  function Home() { const outfit = useWornOutfit(); return <span>{outfit.eyewear}</span>; }
  render(<Home />);
  await waitFor(() => expect(server.load).toHaveBeenCalled());
  act(() => setWornOutfit({ eyewear: 'monocle' }));
  await act(async () => resolve({ outfit: {} }));
  expect(getWornOutfit()).toEqual({ eyewear: 'monocle' });
});
