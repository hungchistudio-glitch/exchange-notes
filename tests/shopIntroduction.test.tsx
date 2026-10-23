import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ShopIntroduction from '@/components/shop/ShopIntroduction';

it('starts closed and reverses repeated taps without timers or resetting its content', () => {
  render(<ShopIntroduction openLabel="Open story" closeLabel="Close story"><button>Choose collection</button></ShopIntroduction>);
  const trigger = screen.getByRole('button', { name: 'Open story' });
  const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!;
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('inert');
  expect(screen.queryByRole('button', { name: 'Choose collection' })).toBeNull();
  fireEvent.click(trigger);
  expect(panel).not.toHaveAttribute('inert');
  fireEvent.click(screen.getByRole('button', { name: 'Choose collection' }));
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('aria-hidden', 'true');
  expect(panel).toHaveAttribute('inert');
});
