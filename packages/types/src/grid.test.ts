import { describe, it, expect } from 'vitest';
import { GRID_BLOCK_IDS, GRID_SLOT_IDS, defaultGridConfig, parseGridConfig, slotOf } from './index';

/** A config as the fixed-slot editor stored it: no `slots`, five blocks, all visible. */
const LEGACY = JSON.stringify({
  blocks: {
    plan: { visible: true },
    verse: { visible: true },
    invite: { visible: true, image: { key: 'uploads/invite.webp', enabled: true } },
    book: { visible: true, showLabel: true, image: { key: 'uploads/book.webp', enabled: true, scrim: 'none' } },
    faith: { visible: true, text: { de: { label: '', title: 'Unser Glaube', button: '' } } },
  },
});

describe('parseGridConfig', () => {
  it('fills every block and slot from the defaults when nothing is stored', () => {
    const grid = parseGridConfig(null);
    expect(Object.keys(grid.blocks).sort()).toEqual([...GRID_BLOCK_IDS].sort());
    expect(Object.keys(grid.slots)).toEqual(GRID_SLOT_IDS);
  });

  it('places sunset, lesson, Bible and songbook by default and hides the rest', () => {
    const grid = defaultGridConfig();
    expect(grid.slots).toEqual({ col2Top: 'sunset', col2Bottom: 'sbl', col3Top: 'bible', col3Bottom: 'book' });
    for (const id of ['plan', 'sunset', 'sbl', 'bible', 'book'] as const) expect(grid.blocks[id].visible).toBe(true);
    for (const id of ['verse', 'invite', 'faith'] as const) {
      expect(grid.blocks[id].visible).toBe(false);
      expect(slotOf(grid, id)).toBeNull();
    }
    expect(grid.blocks.sunset.clickable).toBe(false);
    expect(grid.blocks.sunset.showButton).toBe(false);
  });

  it('migrates a config stored before the slots existed to the default five', () => {
    const grid = parseGridConfig(LEGACY);
    expect(grid.slots).toEqual(defaultGridConfig().slots);
    expect(grid.blocks.verse.visible).toBe(false);
    expect(grid.blocks.invite.visible).toBe(false);
    expect(grid.blocks.faith.visible).toBe(false);
    expect(grid.blocks.bible.visible).toBe(true);
    expect(grid.blocks.sbl.visible).toBe(true);
    expect(grid.blocks.sunset.visible).toBe(true);
  });

  it('keeps everything but visibility when migrating', () => {
    const grid = parseGridConfig(LEGACY);
    expect(grid.blocks.book.image.key).toBe('uploads/book.webp');
    expect(grid.blocks.book.image.scrim).toBe('none');
    expect(grid.blocks.invite.image.key).toBe('uploads/invite.webp');
    expect(grid.blocks.faith.text.de.title).toBe('Unser Glaube');
  });

  it('resets a hidden block to visible when migrating', () => {
    const grid = parseGridConfig(JSON.stringify({ blocks: { plan: { visible: false }, sunset: { visible: false } } }));
    expect(grid.blocks.plan.visible).toBe(true);
    expect(grid.blocks.sunset.visible).toBe(true);
  });

  it('reads a config with slots as stored', () => {
    const grid = parseGridConfig(
      JSON.stringify({
        slots: { col2Top: 'verse', col2Bottom: 'invite', col3Top: 'bible', col3Bottom: null },
        blocks: { verse: { visible: true }, invite: { visible: true }, sunset: { visible: false } },
      })
    );
    expect(grid.slots).toEqual({ col2Top: 'verse', col2Bottom: 'invite', col3Top: 'bible', col3Bottom: null });
    expect(grid.blocks.verse.visible).toBe(true);
    expect(grid.blocks.sunset.visible).toBe(false);
    expect(slotOf(grid, 'sunset')).toBeNull();
  });

  it('empties a slot holding an unknown, duplicate or unslottable block', () => {
    const grid = parseGridConfig(
      JSON.stringify({ slots: { col2Top: 'plan', col2Bottom: 'nope', col3Top: 'bible', col3Bottom: 'bible' } })
    );
    expect(grid.slots).toEqual({ col2Top: null, col2Bottom: null, col3Top: 'bible', col3Bottom: null });
  });
});
