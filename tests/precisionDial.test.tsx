import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import PrecisionDial, { dialDelta, dialIndex } from '@/components/home/yumi/PrecisionDial';
const items = Array.from({ length: 8 }, (_, i) => ({ key: String(i), label: `Destination ${i}`, icon: null }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number; isPrimary = true;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  });
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const flush = () => act(() => vi.advanceTimersByTime(500));
function setup() {
  const choose = vi.fn();
  const tree = (enabled = true) => <PrecisionDial enabled={enabled} radius={100} items={items} onChoose={choose} onAim={() => {}} />;
  const view = render(tree());
  const button = screen.getByRole('button', { name: 'Destination 0' });
  return { choose, button, root: button.parentElement!, disable: () => view.rerender(tree(false)) };
}
it('wraps detents through multiple turns and crosses the angle seam continuously', () => {
  expect(dialIndex(Math.PI * 2, 8)).toBe(0);
  expect(dialIndex(Math.PI / 2, 8)).toBe(6);
  expect(dialDelta(Math.PI - .1, -Math.PI + .1)).toBeCloseTo(.2);
});
it('snaps on release without activating and suppresses the drag-generated click', () => {
  const { choose, button } = setup();
  fireEvent.pointerDown(button, { clientX: 0, clientY: -100, button: 0 });
  fireEvent.pointerMove(button, { clientX: 100, clientY: 0 });
  fireEvent.pointerUp(button, { clientX: 100, clientY: 0 });
  flush();
  fireEvent.click(button, { detail: 1 });
  expect(choose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Destination 6' })).toHaveAttribute('aria-current', 'true');
  fireEvent.pointerDown(button, { clientX: 100, clientY: 0, button: 0 });
  fireEvent.pointerUp(button, { clientX: 100, clientY: 0 });
  fireEvent.click(button, { detail: 1 });
  expect(choose).toHaveBeenCalledExactlyOnceWith(0);
});
it('supports keyboard detents and a separate keyboard activation', () => {
  const { choose, button } = setup();
  fireEvent.keyDown(button, { key: 'ArrowRight' }); flush();
  const next = screen.getByRole('button', { name: 'Destination 1' });
  expect(next).toHaveFocus();
  expect(next).toHaveAttribute('aria-current', 'true');
  expect(choose).not.toHaveBeenCalled();
  fireEvent.click(next, { detail: 0 });
  expect(choose).toHaveBeenCalledExactlyOnceWith(1);
});
it('cancels pending wheel motion when closed', () => {
  const { choose, root, disable } = setup();
  fireEvent.wheel(root, { deltaY: 150 });
  disable(); flush();
  expect(root).toHaveAttribute('inert');
  expect(choose).not.toHaveBeenCalled();
});
it('advances every rapid key press before the previous snap finishes', () => {
  const { button } = setup();
  fireEvent.keyDown(button, { key: 'ArrowRight' });
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
  flush();
  const third = screen.getByRole('button', { name: 'Destination 3' });
  expect(third).toHaveFocus();
  expect(third).toHaveAttribute('aria-current', 'true');
});
it('cancels a pointer without activating the source button', () => {
  const { button, choose } = setup();
  fireEvent.pointerDown(button, { clientX: 0, clientY: -100, button: 0 });
  fireEvent.pointerCancel(button, { clientX: 0, clientY: -100 });
  fireEvent.click(button, { detail: 1 });
  flush();
  expect(choose).not.toHaveBeenCalled();
});
it('releases the original button capture when disabled during a drag', () => {
  const { button, disable } = setup();
  button.hasPointerCapture = vi.fn(() => true);
  button.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(button, { clientX: 0, clientY: -100, button: 0 });
  disable();
  expect(button.releasePointerCapture).toHaveBeenCalledWith(1);
});
