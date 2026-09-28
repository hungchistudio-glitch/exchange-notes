import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LiquidRingButton, { LiquidRingSurface } from '@/components/home/yumi/LiquidRingButton';

const labels = ['Vocabulary', 'Review', 'Notes', 'Speech', 'Search', 'Messages', 'Discover', 'Settings'];
const position = (index: number) => {
  const angle = -Math.PI / 2 + Math.PI / 8 + index * Math.PI / 4;
  return { clientX: 195 + Math.cos(angle) * 132, clientY: 340 + Math.sin(angle) * 132 };
};
const pointer = (index: number, pointerId = 1) => ({ ...position(index), pointerId, button: 0 });

function setup() {
  const choose = vi.fn();
  const tree = (enabled: boolean) => <LiquidRingSurface enabled={enabled} onChoose={choose}>
    {labels.map((label, index) => <LiquidRingButton key={label} label={label} index={index}>
      <span data-liquid-disc>{label}</span>
    </LiquidRingButton>)}
  </LiquidRingSurface>;
  const view = render(tree(true));
  const buttons = labels.map((name, index) => {
    const button = screen.getByRole('button', { name });
    const {clientX: x, clientY: y} = position(index);
    const box = { left: x - 31, top: y - 31, right: x + 31, bottom: y + 31, width: 62, height: 62 } as DOMRect;
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(box);
    vi.spyOn(button.querySelector('[data-liquid-disc]')!, 'getBoundingClientRect').mockReturnValue(box);
    return button;
  });
  return { ...view, buttons, choose, disable: () => view.rerender(tree(false)) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const settle = () => act(() => vi.advanceTimersByTime(600));
function move(button: HTMLElement, event: PointerEventInit) {
  fireEvent.pointerMove(button, event);
  act(() => vi.advanceTimersByTime(20));
}

describe('liquid orbit navigation', () => {
  it('paints only the latest pointer sample once per frame', () => {
    const {buttons} = setup();
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');
    fireEvent.pointerDown(buttons[0], pointer(0));
    fireEvent.pointerMove(buttons[0], pointer(0.3));
    fireEvent.pointerMove(buttons[0], pointer(1));
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(buttons[0]).toHaveAttribute('data-active');
    act(() => vi.advanceTimersByTime(20));
    expect(buttons[1]).toHaveAttribute('data-active');
    expect(buttons[0]).not.toHaveAttribute('data-active');
  });

  it('uses the release location even before the queued frame can paint', () => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    fireEvent.pointerMove(buttons[0], pointer(1));
    fireEvent.pointerUp(buttons[0], pointer(2));
    settle();
    expect(choose).toHaveBeenCalledExactlyOnceWith(2);
    expect(buttons.every(button => !button.hasAttribute('data-active'))).toBe(true);
  });

  it('activates a tap once, after its rebound, despite the following browser click', () => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    fireEvent.pointerUp(buttons[0], pointer(0));
    fireEvent.click(buttons[0], {detail: 1});
    expect(choose).not.toHaveBeenCalled();
    expect(buttons[0]).toHaveAttribute('data-releasing');
    settle();
    expect(choose).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('scrubs across several destinations and opens the final one after rebound', () => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    move(buttons[0], pointer(0.35));
    expect(Number(buttons[0].style.getPropertyValue('--liquid-stretch'))).toBeGreaterThan(1.2);
    move(buttons[0], pointer(1));
    expect(buttons[1]).toHaveAttribute('data-active');
    expect(buttons[0]).not.toHaveAttribute('data-active');
    move(buttons[0], pointer(2));
    fireEvent.pointerUp(buttons[0], pointer(2));
    expect(choose).not.toHaveBeenCalled();
    settle();
    expect(choose).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('wraps across the first and last destinations in either direction', () => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    move(buttons[0], pointer(7));
    fireEvent.pointerUp(buttons[0], pointer(7));
    settle();
    expect(choose).toHaveBeenLastCalledWith(7);
    fireEvent.pointerDown(buttons[7], pointer(7));
    fireEvent.pointerUp(buttons[7], pointer(0));
    settle();
    expect(choose).toHaveBeenLastCalledWith(0);
  });

  it('does not flicker between targets at the angular boundary', () => {
    const {buttons} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    move(buttons[0], pointer(0.51));
    expect(buttons[0]).toHaveAttribute('data-active');
    move(buttons[0], pointer(0.6));
    expect(buttons[1]).toHaveAttribute('data-active');
    move(buttons[0], pointer(0.49));
    expect(buttons[1]).toHaveAttribute('data-active');
  });

  it.each([{clientX: 195, clientY: 340}, {clientX: 195, clientY: 750}])('cancels releases off the orbit: %j', point => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    fireEvent.pointerUp(buttons[0], {...point, pointerId: 1});
    settle();
    expect(choose).not.toHaveBeenCalled();
    expect(buttons.every(button => !button.hasAttribute('data-active'))).toBe(true);
  });

  it.each(['pointerCancel', 'lostPointerCapture'] as const)('cancels safely on %s', event => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    move(buttons[0], pointer(1));
    fireEvent[event](buttons[0], {pointerId: 1});
    fireEvent.pointerUp(buttons[0], pointer(1));
    settle();
    expect(choose).not.toHaveBeenCalled();
    expect(buttons[1]).not.toHaveAttribute('data-dragging');
  });

  it('ignores a second pointer without disturbing the first', () => {
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    fireEvent.pointerDown(buttons[3], pointer(3, 2));
    move(buttons[3], pointer(4, 2));
    fireEvent.pointerUp(buttons[3], pointer(4, 2));
    expect(buttons[0]).toHaveAttribute('data-active');
    fireEvent.pointerUp(buttons[0], pointer(1));
    settle();
    expect(choose).toHaveBeenCalledExactlyOnceWith(1);
  });

  it.each(['disable', 'unmount', 'blur', 'resize', 'escape'])('cancels pending navigation on %s', event => {
    const view = setup();
    fireEvent.pointerDown(view.buttons[0], pointer(0));
    fireEvent.pointerUp(view.buttons[0], pointer(1));
    if (event === 'disable') view.disable();
    if (event === 'unmount') view.unmount();
    if (event === 'blur') fireEvent(window, new Event('blur'));
    if (event === 'resize') fireEvent(window, new Event('resize'));
    if (event === 'escape') fireEvent.keyDown(view.buttons[0], {key: 'Escape'});
    settle();
    expect(view.choose).not.toHaveBeenCalled();
  });

  it('preserves keyboard and assistive activation, but disables closed options', () => {
    const {buttons, choose, disable} = setup();
    fireEvent.click(buttons[4], {detail: 0});
    expect(choose).toHaveBeenCalledExactlyOnceWith(4);
    disable();
    fireEvent.click(buttons[2], {detail: 0});
    expect(choose).toHaveBeenCalledTimes(1);
    expect(buttons[2]).toHaveAttribute('tabindex', '-1');
  });

  it('keeps drag selection in reduced motion without deformation or delay', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
    const {buttons, choose} = setup();
    fireEvent.pointerDown(buttons[0], pointer(0));
    move(buttons[0], pointer(3));
    expect(buttons[3]).toHaveAttribute('data-active');
    expect(buttons[3].style.getPropertyValue('--liquid-x')).toBe('');
    fireEvent.pointerUp(buttons[0], pointer(3));
    expect(choose).toHaveBeenCalledExactlyOnceWith(3);
  });
});
