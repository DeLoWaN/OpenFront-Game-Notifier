/**
 * LobbyBoardSidebar - the left column of the Lobby Board.
 *
 * It holds the filter component. It collapses to a thin rail that shows a
 * short summary of the filters. The collapsed state is stored with `GM_setValue`.
 * The sidebar is open by default.
 */

import { STORAGE_KEYS } from '@/config/constants';

const ICON_COLLAPSE = '«';
const ICON_EXPAND = '»';

export class LobbyBoardSidebar {
  private collapsed: boolean;
  private summary = '';
  private root: HTMLElement | null = null;

  constructor() {
    this.collapsed = GM_getValue<boolean>(STORAGE_KEYS.lobbyBoardSidebarCollapsed, false) === true;
  }

  /** Builds the sidebar. The container for the filter component is `body` of the result. */
  build(): { element: HTMLElement; body: HTMLElement } {
    const element = document.createElement('aside');
    element.className = 'of-board-sidebar';
    element.setAttribute('aria-label', 'Filters');

    const head = document.createElement('div');
    head.className = 'of-board-sidebar-head';
    const title = document.createElement('span');
    title.className = 'of-board-sidebar-title';
    title.textContent = 'Filters';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'of-board-sidebar-toggle';
    toggle.className = 'of-board-sidebar-toggle';
    toggle.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    head.append(title, toggle);

    const body = document.createElement('div');
    body.className = 'of-board-sidebar-body';

    const summary = document.createElement('div');
    summary.className = 'of-board-sidebar-summary';

    element.append(head, body, summary);
    this.root = element;
    this.apply();
    return { element, body };
  }

  /** Sets the line that the collapsed rail shows. */
  setSummary(text: string): void {
    this.summary = text;
    const summary = this.root?.querySelector('.of-board-sidebar-summary');
    if (summary) summary.textContent = text;
  }

  private setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    GM_setValue(STORAGE_KEYS.lobbyBoardSidebarCollapsed, collapsed);
    this.apply();
  }

  private apply(): void {
    const root = this.root;
    if (!root) return;
    root.classList.toggle('is-collapsed', this.collapsed);
    (root.querySelector('.of-board-sidebar-body') as HTMLElement).hidden = this.collapsed;
    const summary = root.querySelector('.of-board-sidebar-summary') as HTMLElement;
    summary.hidden = !this.collapsed;
    summary.textContent = this.summary;
    const toggle = root.querySelector('.of-board-sidebar-toggle') as HTMLButtonElement;
    toggle.textContent = this.collapsed ? ICON_EXPAND : ICON_COLLAPSE;
    toggle.setAttribute('aria-expanded', String(!this.collapsed));
    toggle.setAttribute('aria-label', this.collapsed ? 'Expand filters' : 'Collapse filters');
  }
}
