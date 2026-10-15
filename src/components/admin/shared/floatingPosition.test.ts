import { describe, expect, it } from 'vitest';
import { computeFloatingPosition } from './floatingPosition';

const anchor = (top: number, left = 100) => ({ top, bottom: top + 44, left, right: left + 100 });
const viewport = { width: 1280, height: 800 };

describe('computeFloatingPosition', () => {
  it('opens below the anchor when there is room', () => {
    const p = computeFloatingPosition({ anchor: anchor(100), viewport, layerHeight: 230, width: 240 });
    expect(p.side).toBe('below');
    expect(p.top).toBe(148);
    expect(p.bottom).toBeNull();
    expect(p.left).toBe(100);
  });

  it('flips above when the layer does not fit below but fits above', () => {
    const p = computeFloatingPosition({ anchor: anchor(700), viewport, layerHeight: 230, width: 240 });
    expect(p.side).toBe('above');
    expect(p.top).toBeNull();
    expect(p.bottom).toBe(800 - 700 + 4);
  });

  it('keeps the layer inside the viewport horizontally and caps the width', () => {
    const p = computeFloatingPosition({
      anchor: anchor(100, 300),
      viewport: { width: 360, height: 800 },
      layerHeight: 200,
      width: 360,
    });
    expect(p.width).toBe(344);
    expect(p.left).toBe(8);
  });

  it('fits a tall layer inside the viewport when neither side has room', () => {
    const p = computeFloatingPosition({
      anchor: anchor(300),
      viewport: { width: 1280, height: 800 },
      layerHeight: 690,
      width: 360,
    });
    expect(p.side).toBe('fit');
    expect(p.top).toBe(800 - 8 - 690);
    expect(p.maxHeight).toBe(784);
  });

  it('caps a layer taller than the viewport and lets it scroll', () => {
    const p = computeFloatingPosition({
      anchor: anchor(300),
      viewport: { width: 360, height: 600 },
      layerHeight: 900,
      width: 240,
    });
    expect(p.side).toBe('fit');
    expect(p.top).toBe(8);
    expect(p.maxHeight).toBe(584);
  });
});
