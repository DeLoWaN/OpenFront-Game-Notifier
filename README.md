# OpenFront Game Notifier

A TypeScript userscript for OpenFront `v0.31+` that watches public lobbies and notifies you when one matches your filters — via in-page highlight, sound, and optional desktop notification. It surfaces each slot's **upcoming** game in an "Up Next" area and enhances OpenFront's native join modal. Never auto-joins.

## For Players

<img width="404" height="1174" alt="image" src="https://github.com/user-attachments/assets/db113419-2624-461a-b8b0-a69d956992d7" />

### Features

**Lobby discovery**
- Filter `FFA` and `Team` public lobbies by mode, format, team count, capacity, and modifiers
- Matching evaluates both the **live** lobby and the **upcoming** lobby for each slot, so a match is detected whether the game is live now or queued next
- Team panel splits into `Format` (`Humans Vs Nations`) and `Number of teams` (`2`–`7`)
- Capacity sliders use the right semantics per mode: total lobby size for `FFA`, players-per-team for `Team`
- Per-team slider uses log-scaled stops with editable steppers; optional `2×` lock pins the max to twice the minimum
- Tri-state modifier filters cycle `Any` → `Required` → `Excluded`, grouped by `Map` / `Gameplay` / `Economy`

**Up Next**
- Dedicated "Up Next" area shows each slot's queued-next game (`FFA`, `Special`, `Team`) alongside the native lobby cards — map, mode, team format, capacity, and active modifiers
- Cards are visually marked not-live and show an "up next" indicator instead of a fabricated countdown (the feed assigns a start time only once a game goes live)
- Slots with no upcoming game show an explicit fallback rather than a stale card
- Clicking an upcoming card navigates to OpenFront's own join modal — manual quick-join only, you still confirm entry there

<img width="946" height="352" alt="image" src="https://github.com/user-attachments/assets/e9d14503-90de-4a8a-93ae-ce460f82e4d0" />


**Alerts**
- Pulse highlight on the matching homepage queue card the moment a lobby matches
- Optional sound alert on new matches
- Upcoming matches alert with the same highlight and sound as live matches; a toggle gates upcoming notifications (display them silently, or alert on them)
- Optional desktop notification when the OpenFront tab is in the background
- Sound on game start, triggered by OpenFront's own `?live` URL transition

**Smart UX**
- Stronger highlight for your own player row (and your team card) inside the native join modal
- Filter settings persist across reloads
- Discovery feedback automatically pauses while you're already inside a joined lobby flow

### Modifier filters

- Compact
- Random Spawn
- Crowded
- Hard Nations
- Alliances Disabled
- Ports Disabled
- Nukes Disabled
- SAMs Disabled
- Peace Time
- Water Nukes
- Starting Gold `1M`, `5M`, `25M`
- Gold Multiplier `x2`

### Requirements

- OpenFront `v0.31+`
- [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
- Browser notification permission (only if you want desktop alerts)

### Install

1. Install Tampermonkey or Greasemonkey.
2. Install from Greasy Fork: [OpenFront Game Notifier][greasyfork].
3. Visit [openfront.io](https://openfront.io/).

### Usage

1. Open the Play page on [openfront.io](https://openfront.io/).
2. In the `OpenFront Game Notifier` panel, enable `FFA`, `Team`, or both.
3. For `Team`, optionally toggle `Humans Vs Nations` and pick allowed team counts (`2`–`7`).
4. Set capacity bounds; click modifier chips to require or exclude them.
5. When a queue card pulses on the homepage, click it yourself to join.
6. Check the `Up Next` area to see each slot's queued game; click a card to open OpenFront's join modal for it.

### What this doesn't do

- Never auto-joins, auto-rejoins, or switches lobbies.
- Never modifies the native join modal — the player-row highlight is purely additive styling.
- Doesn't read or write any cross-domain data.

## For Developers

### Project structure

```text
.
├── src/
│   ├── config/                                 # constants, theme tokens
│   ├── data/
│   │   └── LobbyDataManager.ts                 # WebSocket + HTTP polling fallback
│   ├── modules/
│   │   └── lobby-discovery/
│   │       ├── CurrentPlayerHighlighter.ts     # additive native-modal enhancer
│   │       ├── LobbyDiscoveryEngine.ts         # criteria matching
│   │       ├── LobbyDiscoveryHelpers.ts        # pure helpers
│   │       ├── LobbyDiscoveryTypes.ts
│   │       ├── LobbyDiscoveryUI.ts             # panel UI
│   │       ├── RangeSlider.ts                  # per-team log-scaled slider component
│   │       └── RangeSliderHelpers.ts           # pure stop/position helpers
│   ├── styles/
│   ├── types/
│   ├── utils/
│   │   ├── BrowserNotificationUtils.ts
│   │   ├── LobbyUtils.ts
│   │   ├── SoundUtils.ts
│   │   └── URLObserver.ts
│   └── main.ts
├── tests/
├── dist/bundle.user.js
├── package.json
├── tsconfig.json
├── esbuild.config.js
└── vitest.config.js
```

### Quick start

Prerequisites: Node.js `18+` and npm.

```bash
npm install
npm run build:prod   # writes dist/bundle.user.js
```

Common scripts:

```bash
npm run dev          # esbuild watch
npm run build:prod   # production bundle
npm run test         # vitest --run (use --watch for TDD)
npm run type-check   # tsc --noEmit
```

### Storage keys

- `OF_LOBBY_DISCOVERY_SETTINGS` — criteria, sound/desktop preferences, `2×` toggle

### Testing

Vitest with JSDOM. The suite covers the matching engine, helpers, panel UI, the native-modal highlighter, and the `LobbyDataManager` connection fallback.

```bash
npm run test
npm run test -- --watch
npm run test -- --coverage
```

### Contributing

- Follow the existing layered architecture (`config → types → styles → utils → data → modules → main`).
- Use `@/` path aliases.
- Keep new logic covered by tests; run `npm run test` and `npm run type-check` before shipping.
- Rebuild `dist/bundle.user.js` for releases (`npm run build:prod`).

### License

UNLICENSED — private project.

### Authors

DeLoVaN · SyntaxMenace · DeepSeek · Claude

[greasyfork]: https://greasyfork.org/en/scripts/555551-openfront-io-lobby-intel-discovery
