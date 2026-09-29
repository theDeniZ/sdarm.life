import { describe, it, expect } from 'vitest';
import { GRID_BLOCK_IDS, defaultGridConfig, parseGridConfig } from './index';

describe('parseGridConfig', () => {
  it('shows the sunset card for a config stored before the card existed', () => {
    const stored = JSON.stringify({ blocks: { plan: { visible: false } } });
    const grid = parseGridConfig(stored);

    expect(grid.blocks.plan.visible).toBe(false);
    expect(grid.blocks.sunset).toEqual(defaultGridConfig().blocks.sunset);
    expect(grid.blocks.sunset.visible).toBe(true);
    expect(grid.blocks.sunset.clickable).toBe(false);
    expect(grid.blocks.sunset.showButton).toBe(false);
  });

  it('keeps an editor hiding the sunset card', () => {
    const grid = parseGridConfig(JSON.stringify({ blocks: { sunset: { visible: false } } }));
    expect(grid.blocks.sunset.visible).toBe(false);
  });

  it('fills every block from the defaults when nothing is stored', () => {
    const grid = parseGridConfig(null);
    expect(Object.keys(grid.blocks).sort()).toEqual([...GRID_BLOCK_IDS].sort());
  });
});
