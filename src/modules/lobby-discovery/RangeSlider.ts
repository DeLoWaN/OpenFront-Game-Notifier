import {
  clampToStops,
  positionToValue,
  valueToPosition,
} from '@/modules/lobby-discovery/RangeSliderHelpers';

export interface RangeSliderConfig {
  /** Where the elements are looked up. Defaults to the whole document. */
  root?: ParentNode;
  containerId: string;     // <div class="ld-slider-row"> outer container; scope for stepper buttons
  rangeRootId: string;     // <div class="ld-range"> element receiving --lo/--hi CSS vars
  minSliderId: string;     // <input type="range"> 0..1000 for min position
  maxSliderId: string;     // <input type="range"> 0..1000 for max position
  minInputId: string;      // <input type="number"> for min value
  maxInputId: string;      // <input type="number"> for max value
  fillId: string;          // <div> whose --lo / --hi CSS vars draw the fill
  ticksContainerId?: string;
  bounds: { min: number; max: number };
  stops?: readonly number[];
  lockMaxToTwiceMin?: () => boolean;
  onChange: (min: number, max: number) => void;
}

const POSITION_RANGE = 1000;

export class RangeSlider {
  private readonly minSlider: HTMLInputElement;
  private readonly maxSlider: HTMLInputElement;
  private readonly minInput: HTMLInputElement;
  private readonly maxInput: HTMLInputElement;
  private readonly rangeRoot: HTMLElement | null;
  private readonly container: HTMLElement | null;
  private readonly stops: readonly number[];
  private readonly root: ParentNode;
  private readonly cfg: RangeSliderConfig;
  private lastMin: number;
  private lastMax: number;

  constructor(cfg: RangeSliderConfig) {
    this.cfg = cfg;
    this.stops = cfg.stops ?? [cfg.bounds.min, cfg.bounds.max];
    this.root = cfg.root ?? document;
    this.minSlider = this.find(cfg.minSliderId) as HTMLInputElement;
    this.maxSlider = this.find(cfg.maxSliderId) as HTMLInputElement;
    this.minInput = this.find(cfg.minInputId) as HTMLInputElement;
    this.maxInput = this.find(cfg.maxInputId) as HTMLInputElement;
    this.rangeRoot = this.find(cfg.rangeRootId);
    this.container = this.find(cfg.containerId);

    if (!this.minSlider || !this.maxSlider || !this.minInput || !this.maxInput) {
      throw new Error(`RangeSlider: missing required element in ${cfg.rangeRootId}`);
    }

    this.minSlider.min = '0';
    this.minSlider.max = String(POSITION_RANGE);
    this.maxSlider.min = '0';
    this.maxSlider.max = String(POSITION_RANGE);

    this.lastMin = this.readInputClamped(this.minInput, cfg.bounds.min);
    this.lastMax = this.readInputClamped(this.maxInput, cfg.bounds.max);
    if (this.lastMax < this.lastMin) this.lastMax = this.lastMin;

    this.minSlider.addEventListener('input', this.onMinSliderInput);
    this.maxSlider.addEventListener('input', this.onMaxSliderInput);
    this.minInput.addEventListener('change', this.onMinInputChange);
    this.maxInput.addEventListener('change', this.onMaxInputChange);

    this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: 'both' });
    this.renderTicks();
    this.wireSteppers();
    this.applyLockState();
  }

  private find(id: string): HTMLElement | null {
    // An attribute selector: an id selector wrongly misses the element when the id exists twice in the document.
    return this.root.querySelector<HTMLElement>(`[id="${id}"]`);
  }

  /** Toggle the disabled appearance + behavior on max-side controls. */
  applyLockState(): void {
    const locked = !!this.cfg.lockMaxToTwiceMin?.();
    this.maxSlider.disabled = locked;
    this.maxSlider.classList.toggle('is-max-locked', locked);
    this.maxInput.disabled = locked;

    if (this.container) {
      this.container
        .querySelectorAll<HTMLButtonElement>('.ld-step-btn[data-target="max"]')
        .forEach((btn) => { btn.disabled = locked; });
    }

    if (locked) {
      // Re-apply the 2× constraint so visual state matches.
      // Min is the source of truth; max follows from it.
      this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: 'min' });
    }
  }

  /** Public setter — used when min is auto-bumped from outside (e.g. team-count chips). */
  setMin(value: number): void {
    this.applyValues(value, this.lastMax, { fireOnChange: true, changed: 'min' });
  }

  /** Public setter — used by reset / load. */
  setRange(min: number, max: number): void {
    this.applyValues(min, max, { fireOnChange: false, changed: 'both' });
  }

  private readInputClamped(el: HTMLInputElement, fallback: number): number {
    const parsed = parseInt(el.value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
  }

  private onMinSliderInput = (): void => {
    const position = parseInt(this.minSlider.value, 10) / POSITION_RANGE;
    const value = positionToValue(position, this.stops);
    this.applyValues(value, this.lastMax, { fireOnChange: true, changed: 'min' });
  };

  private onMaxSliderInput = (): void => {
    const position = parseInt(this.maxSlider.value, 10) / POSITION_RANGE;
    const value = positionToValue(position, this.stops);
    this.applyValues(this.lastMin, value, { fireOnChange: true, changed: 'max' });
  };

  private onMinInputChange = (): void => {
    const parsed = parseInt(this.minInput.value, 10);
    if (!Number.isFinite(parsed)) {
      this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: 'both' });
      return;
    }
    const clamped = clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
    this.applyValues(clamped, this.lastMax, { fireOnChange: true, changed: 'min' });
  };

  private onMaxInputChange = (): void => {
    const parsed = parseInt(this.maxInput.value, 10);
    if (!Number.isFinite(parsed)) {
      this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: 'both' });
      return;
    }
    const clamped = clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
    this.applyValues(this.lastMin, clamped, { fireOnChange: true, changed: 'max' });
  };

  private applyValues(
    min: number,
    max: number,
    opts: { fireOnChange: boolean; changed?: 'min' | 'max' | 'both' }
  ): void {
    let nextMin = min;
    let nextMax = max;

    // Lock-max-to-2× takes precedence when active.
    if (this.cfg.lockMaxToTwiceMin?.()) {
      nextMax = clampToStops(nextMin * 2, [this.cfg.bounds.min, this.cfg.bounds.max]);
    }

    if (nextMin > nextMax) {
      const side = opts.changed ?? 'both';
      if (side === 'min') {
        // Caller raised min; max follows.
        nextMax = nextMin;
      } else if (side === 'max') {
        // Caller lowered max; min follows.
        nextMin = nextMax;
      } else {
        // Both changed simultaneously — normalize symmetrically.
        nextMin = Math.min(min, max);
        nextMax = Math.max(min, max);
      }
    }

    this.lastMin = nextMin;
    this.lastMax = nextMax;

    this.minInput.value = String(nextMin);
    this.maxInput.value = String(nextMax);
    this.minSlider.value = String(Math.round(valueToPosition(nextMin, this.stops) * POSITION_RANGE));
    this.maxSlider.value = String(Math.round(valueToPosition(nextMax, this.stops) * POSITION_RANGE));

    if (this.rangeRoot) {
      const lo = valueToPosition(nextMin, this.stops) * 100;
      const hi = valueToPosition(nextMax, this.stops) * 100;
      this.rangeRoot.style.setProperty('--lo', `${lo}%`);
      this.rangeRoot.style.setProperty('--hi', `${hi}%`);
    }

    if (opts.fireOnChange) this.cfg.onChange(nextMin, nextMax);
  }

  private renderTicks(): void {
    if (!this.cfg.ticksContainerId || !this.cfg.stops) return;
    const container = this.find(this.cfg.ticksContainerId);
    if (!container) return;

    container.innerHTML = '';
    for (const stop of this.cfg.stops) {
      const pct = valueToPosition(stop, this.cfg.stops) * 100;
      const tick = document.createElement('div');
      tick.className = 'ld-tick';
      tick.style.left = `${pct}%`;
      const label = document.createElement('span');
      label.className = 'ld-tick-label';
      label.style.left = `${pct}%`;
      label.textContent = String(stop);
      container.appendChild(tick);
      container.appendChild(label);
    }
  }

  private wireSteppers(): void {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll<HTMLButtonElement>('.ld-step-btn');
    buttons.forEach((btn) => {
      const target = btn.dataset.target as 'min' | 'max' | undefined;
      const action = btn.dataset.action as 'inc' | 'dec' | undefined;
      if (!target || !action) return;
      btn.addEventListener('click', () => {
        const delta = action === 'inc' ? 1 : -1;
        if (target === 'min') {
          const next = clampToStops(
            this.lastMin + delta,
            [this.cfg.bounds.min, this.cfg.bounds.max]
          );
          this.applyValues(next, this.lastMax, { fireOnChange: true, changed: 'min' });
        } else {
          const next = clampToStops(
            this.lastMax + delta,
            [this.cfg.bounds.min, this.cfg.bounds.max]
          );
          this.applyValues(this.lastMin, next, { fireOnChange: true, changed: 'max' });
        }
      });
    });
  }
}
