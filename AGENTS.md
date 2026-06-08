
# OpenFront Game Notifier

## Project Overview

This userscript (**OpenFront Game Notifier**) is a **notify-first** lobby discovery tool for OpenFront.io. It surfaces public lobbies that match user-defined criteria (game mode, player counts, team configuration, modifiers) — including each slot's **upcoming** game — and alerts the user via in-page UI, sound, and optional desktop notifications. It **never auto-joins**: it never programmatically clicks join controls and never navigates from background logic, matching, watchers, or timers. The only join affordance is a **manual quick-join** — clicking an Up Next card navigates to OpenFront's own join modal in direct response to that user click, where the user still confirms entry through OpenFront's controls.

It also enhances OpenFront's native join-lobby modal by highlighting the current player and their team.

**Requirements:** OpenFront.io v0.30+

The userscript is built from modular TypeScript source in `src/` and compiled to `dist/bundle.user.js` for distribution.

---

## Development Architecture

### Build System

- **Language**: TypeScript 5.3+ with strict mode enabled
- **Bundler**: esbuild
- **Testing**: Vitest with JSDOM environment

### Directory Structure

```
.
├── src/
│   ├── config/
│   │   ├── constants.ts     # CONFIG, STORAGE_KEYS, Z_INDEX
│   │   └── theme.ts         # COLORS, SPACING, design tokens
│   ├── types/
│   │   ├── game.d.ts
│   │   └── greasemonkey.d.ts
│   ├── styles/
│   │   └── styles.ts
│   ├── utils/
│   │   ├── BrowserNotificationUtils.ts
│   │   ├── LobbyUtils.ts
│   │   ├── ResizeHandler.ts
│   │   ├── SoundUtils.ts
│   │   └── URLObserver.ts
│   ├── data/
│   │   └── LobbyDataManager.ts        # WebSocket + HTTP fallback
│   ├── modules/
│   │   └── lobby-discovery/
│   │       ├── LobbyDiscoveryTypes.ts
│   │       ├── LobbyDiscoveryHelpers.ts
│   │       ├── LobbyDiscoveryEngine.ts
│   │       ├── LobbyDiscoveryUI.ts
│   │       └── CurrentPlayerHighlighter.ts
│   └── main.ts
├── tests/
├── dist/
├── package.json
├── tsconfig.json
├── esbuild.config.js
└── vitest.config.js
```

### Architecture Layers

Unidirectional dependency flow:

1. **Config** — constants and theme tokens
2. **Types** — TypeScript interfaces
3. **Styles** — CSS-in-JS using theme tokens
4. **Utils** — pure helpers and DOM/audio utilities
5. **Data** — `LobbyDataManager` (WebSocket with HTTP polling fallback, subscriber pattern)
6. **Modules** — `lobby-discovery` (panel UI + matching engine + native modal highlighter)
7. **Main** — wires everything together

### Development Workflow

```bash
npm install
npm run dev         # esbuild watch mode
npm run build:prod  # production bundle
npm test            # vitest
npm run type-check  # tsc --noEmit
```

### Key Architectural Decisions

- **No automation**: The script never invokes the lobby join API or simulates clicks on join controls. Two contract tests in `tests/modules/lobby-discovery/` enforce this.
- **Path aliases**: `@/` maps to `src/`.
- **Pure functions**: Helpers in `*Helpers.ts` are side-effect-free for testability.
- **Subscriber pattern**: `LobbyDataManager` publishes lobby snapshots; `LobbyDiscoveryUI` subscribes.
- **Type safety**: TypeScript strict mode.

### Module Overview

**Lobby Discovery** ([src/modules/lobby-discovery/](src/modules/lobby-discovery/)):
- `LobbyDiscoveryTypes.ts` — settings, criteria, modifier filter types
- `LobbyDiscoveryHelpers.ts` — pure functions: criteria sanitization, settings normalization, lobby parsing, notification text formatting
- `LobbyDiscoveryEngine.ts` — matching logic over lobby snapshots
- `LobbyDiscoveryUI.ts` — panel UI, sound and desktop notification dispatch
- `CurrentPlayerHighlighter.ts` — additive enhancer for OpenFront's native join-lobby modal

**Data Layer** ([src/data/](src/data/)):
- `LobbyDataManager.ts` — WebSocket connection with automatic HTTP fallback, subscriber pattern

---

## Core Features

### 1. Lobby Discovery (notify-only)

- **Criteria-based matching**: filter by game mode (FFA / Team), player count range, team format (Duos / Trios / Quads / Humans Vs Nations / 2–7 teams), and lobby modifiers (compact, random spawn, crowded, hard nations, alliances/ports/nukes/SAMs disabled, peace time, starting gold, gold multiplier).
- **Three notification channels**: in-page panel highlight on the matching queue card, sound alert, and (optional) browser desktop notification.
- **Search timer**: shows how long the current search has been running.
- **Sleep when in-game**: panel hides while a game is live (URL has `?live`).

### 2. Current Player Highlight on Native Modal

- **Additive enhancer**: when OpenFront opens its native join-lobby modal, the current player's row gets a glow and their team card is also highlighted.
- Uses a MutationObserver and reads OpenFront's own custom-element properties (`currentClientID`, `clients`, `teamPreview`); does not modify any of OpenFront's internals.

### 3. Smart Lobby Data Pipeline

- **WebSocket-first**: real-time lobby updates via WebSocket.
- **HTTP fallback**: after 3 failed WebSocket connection attempts, falls back to polling.
- **URL-aware sleep**: stops processing while a game is live.

---

## Settings Persistence

Stored under `OF_LOBBY_DISCOVERY_SETTINGS` and `OF_LOBBY_DISCOVERY_PANEL_SIZE` via `GM_setValue`. Settings include:

- Discovery criteria list
- Discovery enabled/disabled
- Sound enabled/disabled
- Desktop notifications enabled/disabled
- `isTeamTwoTimesMinEnabled` constraint flag

`normalizeSettings` in `LobbyDiscoveryHelpers.ts` validates and applies defaults on load.

---

## Project Context

Integrates with:
- OpenFront.io public lobby endpoint and WebSocket feed
- OpenFront.io game configuration shape
- Tampermonkey / Greasemonkey

Contributors: DeLoVaN, SyntaxMenace, DeepSeek, Claude.

---

## Live Integration Testing (no user required)

When unit tests are insufficient — e.g. to verify matching logic against real lobby data or to reproduce a highlighting bug — use the **Playwright MCP** tools directly. No Tampermonkey, no manual steps.

### Key constraints

- **CSP blocks `page.addScriptTag`** on openfront.io. Always use `page.evaluate()` to inject code; it runs via DevTools Protocol and bypasses CSP.
- **The `/api/public_lobbies` fetch returns HTML** when called manually (SPA routing). Do not `fetch()` it directly.
- **Live lobby data** is already on the page via WebSocket. Read it from the `game-mode-selector` custom element or wait for the `public-lobbies-update` DOM event.
- The data feed is at `wss://openfront.io/w{N}/lobbies` (worker index chosen randomly by the game). The page connects automatically on load.

### How to get live lobby data

Navigate to `https://openfront.io/` (root, not `/play` — the data feed starts there), then in a `page.evaluate()`:

```js
// Option A: already connected — read directly from the DOM element
const sel = document.querySelector('game-mode-selector');
const data = sel?.lobbies; // { games: { ffa: [...], team: [...], special: [...] } }

// Option B: wait for the next WebSocket push (up to 15 s)
const data = await new Promise((resolve) => {
  document.addEventListener('public-lobbies-update', (e) => {
    resolve(e.detail?.payload);
  }, { once: true });
  setTimeout(() => resolve(null), 15000);
});
```

`data.games` is keyed by `"ffa"`, `"team"`, `"special"`. Each value is an array of `Lobby` objects — the game UI always shows index `[0]` of each source; the notifier only evaluates `[0]` as the "featured" lobby for that slot.

> **`gameConfig.playerTeams` is polymorphic.** OpenFront encodes a team game's structure two ways: as a **number** (the team count, e.g. `6` → "6 teams") or as a **named format string** — `"Duos"`/`"Trios"`/`"Quads"` (a fixed players-per-team of 2/3/4, with the team count *derived* as `floor(capacity / playersPerTeam)`), or `"Humans Vs Nations"` (a distinct format with no per-team structure). Both forms appear in the live feed simultaneously. Because "Quads" + capacity 24 and numeric `6` + capacity 24 both render as "6 teams of 4", code that compares against the *team count* MUST resolve named formats to their derived count first — never compare a number against the raw `playerTeams` (`6 !== "Quads"`). The matcher in `LobbyDiscoveryEngine` does this via `resolveLobbyTeamCount`.

### How to run the matcher against live data

Inline the logic from `LobbyDiscoveryHelpers.ts` + `LobbyDiscoveryEngine.ts` directly in `page.evaluate()` (pure functions, no imports needed). Then iterate over the lobbies, annotate each with `{ source, featured, matched, wouldPulse, failReason }`, and return the array. This gives a full picture of what the notifier would do without running the full bundle.

Skeleton (expand with real helper implementations):

```js
page.evaluate(() => {
  // paste normalizeGameMode, parseTeamCount, getLobbyTeamConfig,
  // getLobbyCapacity, getPlayersPerTeam, matchesCriteria inline here
  const criteria = [ /* test criteria */ ];
  const data = document.querySelector('game-mode-selector')?.lobbies;
  const seenSources = new Set();
  return Object.entries(data.games).flatMap(([source, lobbies]) =>
    lobbies.map(lobby => {
      const featured = !seenSources.has(source);
      if (featured) seenSources.add(source);
      const matched = matchesCriteria(lobby, criteria);
      return { source, featured, map: lobby.gameConfig?.gameMap, matched, wouldPulse: matched && featured };
    })
  );
});
```

### What to watch for

| Symptom | Likely cause |
|---|---|
| `matched: true, wouldPulse: false` | Matching lobby is at `[1]` or later — blocked by a non-matching featured lobby at `[0]` |
| `matched: false` for HvN lobby | `getPlayersPerTeam('Humans Vs Nations', cap)` returns `cap`; players/team filter compares against full capacity |
| `matched: false` for a Duos/Trios/Quads lobby | A numeric NUMBER OF TEAMS criterion is being compared against the raw named `playerTeams` instead of the derived team count — resolve `"Quads"`+cap to `floor(cap/4)` first (see `resolveLobbyTeamCount`) |
| No lobbies at all | Navigated to `/play` instead of `/`; the data feed doesn't start there |

# Version Management

Version is centralized in `package.json` and propagates to:
- `package-lock.json` (via `npm install`)
- `dist/bundle.user.js` userscript header (via build)

## How to Upgrade Version

1. **Update version in package.json**:
   ```bash
   npm version patch   # 2.5.0 → 2.5.1
   npm version minor   # 2.5.0 → 2.6.0
   npm version major   # 2.5.0 → 3.0.0
   ```

2. **Rebuild the production bundle**:
   ```bash
   npm run build:prod
   ```

3. **Verify version consistency**:
   ```bash
   grep '"version"' package.json
   grep '@version' dist/bundle.user.js
   ```

The build reads the version from `package.json` and injects it into the userscript header. Always run `npm run build:prod` after a version bump.
