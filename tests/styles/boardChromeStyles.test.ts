import { describe, expect, it } from 'vitest';
import { getBoardChromeStyles } from '@/styles/boardChromeStyles';

/** The declarations of the first rule that has this exact selector. */
const ruleBody = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return getBoardChromeStyles().match(new RegExp(`(?<!,)\\n\\s*${escaped} \\{([^}]*)\\}`))?.[1] ?? '';
};

describe('Lobby Board sidebar styles', () => {
  it('puts the label of a player range above its steppers, and keeps both steppers and the dash on one line', () => {
    const label = ruleBody('.of-board-sidebar .ld-slider-label');
    expect(label).toContain('flex-direction: column;');
    expect(label).toContain('align-items: flex-start;');
    const steppers = ruleBody('.of-board-sidebar .ld-slider-label .val');
    expect(steppers).toContain('display: flex;');
    expect(steppers).toContain('flex-wrap: nowrap;');
    expect(steppers).toContain('white-space: nowrap;');
  });
});
