import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBoardStyles } from '@/styles/boardStyles';

describe('Lobby Board styles', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('lets the flash of a notification click win over the pulse of the 10 second alert', () => {
    const style = document.createElement('style');
    style.textContent = getBoardStyles();
    document.head.append(style);
    const card = document.createElement('button');
    card.className = 'of-board-card of-board-card-pulse of-board-card-flash';
    document.body.append(card);

    // The flash runs 4 times for 0.5 s. The pulse runs for ever for 1.45 s.
    const animation = getComputedStyle(card).animation;
    expect(animation).toContain('0.5s');
    expect(animation).not.toContain('infinite');
  });

  it.each(['boardStyles.ts', 'boardChromeStyles.ts'])(
    'takes every colour of %s from the theme tokens',
    (file) => {
      const source = readFileSync(resolve(__dirname, '../../src/styles', file), 'utf8');
      expect(source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)).toBeNull();
    }
  );
});
