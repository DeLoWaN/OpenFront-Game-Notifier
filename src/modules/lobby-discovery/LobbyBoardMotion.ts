/**
 * Motion of the Lobby Board cards.
 *
 * Both effects use `Element.animate`, so they never touch the DOM of a card.
 * They do nothing when the browser has no `Element.animate` or when the
 * player prefers reduced motion.
 */

const SLIDE_DURATION_MS = 250;
const APPEAR_DURATION_MS = 300;
const EASING = 'ease-out';
const APPEAR_OFFSET_PX = 8;

/** The cell of a card and the place of the card on the screen. */
export interface CardPlacement {
  queue: string;
  row: string;
  top: number;
  left: number;
}

export function canAnimate(): boolean {
  if (typeof HTMLElement.prototype.animate !== 'function') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Ends the running animations of a card, so its box has no in-flight transform. */
export function finishAnimations(card: HTMLElement): void {
  card.getAnimations?.().forEach((animation) => animation.finish());
}

/** Reads where a card is. Returns null for a card that is not in a cell. */
export function readPlacement(card: HTMLElement): CardPlacement | null {
  const cell = card.parentElement;
  if (!cell?.dataset.queue || cell.dataset.row === undefined) return null;
  const { top, left } = card.getBoundingClientRect();
  return { queue: cell.dataset.queue, row: cell.dataset.row, top, left };
}

/** Moves a card from its old place to its current place. Does nothing when the card did not change cell. */
export function slideCard(card: HTMLElement, from: CardPlacement, to: CardPlacement): void {
  if (from.queue === to.queue && from.row === to.row) return;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (dx === 0 && dy === 0) return;
  card.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
    { duration: SLIDE_DURATION_MS, easing: EASING }
  );
}

/** Fades a new card in with a short slide up. The card ends at its own opacity, which a dimmed card keeps. */
export function appearCard(card: HTMLElement): void {
  const opacity = getComputedStyle(card).opacity || '1';
  card.animate(
    [
      { opacity: '0', transform: `translateY(${APPEAR_OFFSET_PX}px)` },
      { opacity, transform: 'translateY(0px)' },
    ],
    { duration: APPEAR_DURATION_MS, easing: EASING }
  );
}
