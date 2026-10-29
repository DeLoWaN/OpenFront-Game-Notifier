/**
 * LobbyDiscoveryControls - the discovery switch with its status, the search
 * timer, the sound toggle and the desktop notification toggle.
 *
 * Any container can mount the component. The component keeps its own state, so
 * a second `mount` shows the same values in the new container.
 */

const ICON_SOUND = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>`;

export interface LobbyDiscoveryControlsOptions {
  discoveryEnabled: boolean;
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  /** True while OpenFront's original lobby area shows in place of the Lobby Board. */
  originalPage: boolean;
  /** Called when the player clicks the status to pause or resume discovery. */
  onToggleDiscovery: () => void;
  /** Called with the new value when the player changes the sound toggle. */
  onSoundChange: (enabled: boolean) => void;
  /** Called with the requested value when the player changes the desktop toggle. */
  onDesktopChange: (enabled: boolean) => void;
  /** Called with the new value when the player changes the "Original page" switch. */
  onOriginalPageChange: (enabled: boolean) => void;
}

export class LobbyDiscoveryControls {
  private discoveryEnabled: boolean;
  private soundEnabled: boolean;
  private desktopEnabled: boolean;
  private originalPage: boolean;
  private searchActive = false;
  private timerText: string | null = null;
  private root: HTMLElement | null = null;

  constructor(private readonly options: LobbyDiscoveryControlsOptions) {
    this.discoveryEnabled = options.discoveryEnabled;
    this.soundEnabled = options.soundEnabled;
    this.desktopEnabled = options.desktopNotificationsEnabled;
    this.originalPage = options.originalPage;
  }

  /** Renders the controls into the container. A second call moves them to the new container. */
  mount(container: HTMLElement): void {
    this.cleanup();

    const root = document.createElement('div');
    root.className = 'ld-status';
    root.innerHTML = `
      <span class="ld-pulse" aria-hidden="true"></span>
      <div class="ld-status-text" id="discovery-status" role="button" tabindex="0">
        <strong>Discovery active</strong>
        <span class="sep">·</span>
        <span class="meta" id="discovery-search-timer"></span>
      </div>
      <div class="ld-icons">
        ${this.renderIconButton('discovery-sound-toggle', 'Sound alert', ICON_SOUND)}
        ${this.renderIconButton('discovery-desktop-toggle', 'Desktop notification', ICON_BELL)}
      </div>
      <label class="ld-original-switch" title="Show OpenFront's original lobby area">
        <input type="checkbox" id="discovery-original-toggle">
        <span class="ld-original-track" aria-hidden="true"></span>
        <span>Original page</span>
      </label>
    `;
    container.appendChild(root);
    this.root = root;

    this.$('discovery-status')?.addEventListener('click', () => this.options.onToggleDiscovery());
    this.$('discovery-sound-toggle')?.addEventListener('change', (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      this.setSoundOn(checked);
      this.options.onSoundChange(checked);
    });
    this.$('discovery-desktop-toggle')?.addEventListener('change', (event) => {
      this.options.onDesktopChange((event.target as HTMLInputElement).checked);
    });
    this.$('discovery-original-toggle')?.addEventListener('change', (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      this.originalPage = checked;
      this.options.onOriginalPageChange(checked);
    });

    this.setSoundOn(this.soundEnabled);
    this.setOriginalPageOn(this.originalPage);
    this.setDesktopOn(this.desktopEnabled);
    this.setDiscoveryEnabled(this.discoveryEnabled);
    this.setSearchActive(this.searchActive);
    this.setTimerText(this.timerText);
  }

  /** Removes the controls from their container. The state stays in memory. */
  cleanup(): void {
    this.root?.remove();
    this.root = null;
  }

  setDiscoveryEnabled(enabled: boolean): void {
    this.discoveryEnabled = enabled;
    const label = this.root?.querySelector('.ld-status-text strong');
    if (label) label.textContent = enabled ? 'Discovery active' : 'Discovery paused';
  }

  /** The pulse beats while the search runs and rests while it is paused or has no Criterion. */
  setSearchActive(active: boolean): void {
    this.searchActive = active;
    this.root?.querySelector('.ld-pulse')?.classList.toggle('is-paused', !active);
  }

  /** Shows the text, or hides the timer when the text is null. */
  setTimerText(text: string | null): void {
    this.timerText = text;
    const timer = this.$('discovery-search-timer');
    if (!timer) return;
    timer.textContent = text ?? '';
    timer.style.display = text === null ? 'none' : 'inline';
  }

  setSoundOn(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.syncToggle('discovery-sound-toggle', enabled);
  }

  setDesktopOn(enabled: boolean): void {
    this.desktopEnabled = enabled;
    this.syncToggle('discovery-desktop-toggle', enabled);
  }

  setOriginalPageOn(enabled: boolean): void {
    this.originalPage = enabled;
    this.syncToggle('discovery-original-toggle', enabled);
  }

  private syncToggle(id: string, on: boolean): void {
    const input = this.$(id) as HTMLInputElement | null;
    if (!input) return;
    input.checked = on;
    input.toggleAttribute('checked', on);
    input.closest('.ld-icon-btn')?.classList.toggle('is-on', on);
  }

  private $(id: string): HTMLElement | null {
    return this.root?.querySelector<HTMLElement>(`[id="${id}"]`) ?? null;
  }

  private renderIconButton(id: string, title: string, svg: string): string {
    return `
      <label class="ld-icon-btn" title="${title}" aria-label="${title}">
        <input type="checkbox" id="${id}">${svg}
      </label>
    `;
  }
}
