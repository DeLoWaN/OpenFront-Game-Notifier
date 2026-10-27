# See All support, new Modifiers and a Map Filter

## Problem Statement

OpenFront now advertises up to six lobbies in each Queue. A Queue is one of the lists of lobbies that OpenFront advertises: FFA, Team, Special or Hosted. The OpenFront home page still shows one card per Queue, and a "See all" button opens the See All View, a page that lists every advertised lobby.

The notifier reads only the first two lobbies of the FFA, Team and Special Queues. As a result:

- A lobby that matches my Criteria in third to sixth place never alerts me. A Criterion is one description of a game I want: mode, team format, player range and Modifier filters.
- A Hosted Lobby never alerts me. A Hosted Lobby is a private game that a subscriber lists in the Hosted Queue.
- I cannot filter on Doomsday Clock or Trusted. A Modifier is a game rule that OpenFront turns on for one lobby. Doomsday Clock and Trusted are Modifiers that OpenFront added recently. A Trusted game accepts only accounts that OpenFront marks as trusted.
- The panel still offers Ports Disabled, but OpenFront no longer puts this Modifier in public games.
- I cannot say which maps I want or refuse. OpenFront has about 135 maps.
- The notifier believes that I am on the lobby page during a game in streamer mode. In that mode, the URL has no `?live` marker.

## Solution

The notifier evaluates every advertised lobby of every Queue, the Hosted Queue included.

- **Live Lobby.** A Live Lobby is the first lobby of the FFA, Team or Special Queue. A match on a Live Lobby keeps the existing behaviour: the home page card pulses.
- **Upcoming Lobby.** An Upcoming Lobby is any other advertised lobby. A match on the second lobby of a Queue keeps the existing Up Next card. A match further down the Queue, or a match on a Hosted Lobby, has two effects:
  - The "See all" button pulses.
  - The matching card in the See All View has a highlight.
- **Desktop notification click.** Clicking the notification brings the tab to the front. For an Upcoming Lobby that only the See All View shows, the click also opens the See All View on the lobby's Queue.
- **Hosted and Custom Lobbies.** A Custom Lobby is a private game that a host paid to place in the Special Queue. A global option, "Include hosted and custom lobbies", controls both kinds of lobby, and it is on by default.
- **New Modifiers.** Doomsday Clock and Trusted are added as tri-state Modifier filters. A tri-state filter has three states: any, required or blocked. Ports Disabled is removed.
- **Map Filter.** A new collapsible "Maps" section holds the Map Filter: one tri-state state per map that applies to every Criterion. The section has a search box and groups the maps by category.

## User Stories

1. As a player, I want the notifier to evaluate all six lobbies of each Queue, so that a matching game in third place is not missed.
2. As a player, I want the notifier to evaluate the Hosted Queue, so that a subscriber's game that fits my Criteria alerts me.
3. As a player, I want Custom Lobbies in the Special Queue evaluated like any other lobby, so that a paid special game can match.
4. As a player, I want a global option to exclude Hosted and Custom Lobbies, so that I can ignore games with an unusual configuration.
5. As a player, I want that option on by default, so that I see every possible match without any setup.
6. As a player, I want the home page card to keep pulsing when its Live Lobby matches, so that the behaviour I know does not change.
7. As a player, I want the Up Next card to keep showing the second lobby of each Queue, so that the panel stays compact.
8. As a player, I want the "See all" button to pulse when a lobby that only the See All View shows matches, so that I know to open it.
9. As a player, I want the "See all" button to stop pulsing when no such match remains, so that a stale signal does not mislead me.
10. As a player, I want the matching cards in the See All View to have a highlight, so that I find the match among up to 24 lobbies.
11. As a player, I want the highlight to follow the cards when the See All View re-renders or reorders them, so that the highlight stays on the right lobby.
12. As a player, I want the highlight to disappear when the lobby leaves the feed or stops matching, so that I never chase a game that is gone.
13. As a player, I want a desktop notification click to bring the OpenFront tab to the front, so that I can act at once.
14. As a player, I want a desktop notification click for an Upcoming Lobby to open the See All View on that lobby's Queue, so that the matching card is in front of me.
15. As a player, I want the notifier never to join, click a join control or open a page by itself, so that I always decide when I enter a game.
16. As a player, I want the "notify upcoming lobbies" option to cover every Upcoming Lobby, Hosted Lobbies included, so that one switch controls all early alerts.
17. As a player, I want one alert per lobby, not one per feed update, so that six queued lobbies do not flood me with sounds.
18. As a player, I want to require or block Doomsday Clock, so that I can look for or avoid that game rule.
19. As a player, I want one Doomsday Clock filter with no speed choice, so that the panel stays simple.
20. As a player, I want to require or block Trusted, so that I can avoid games I cannot join or look for games with trusted players only.
21. As a player, I want the Ports Disabled filter gone, so that the panel offers only rules that OpenFront still uses.
22. As a returning player, I want a saved Ports Disabled state to be removed when my settings load, so that a Criterion that required it does not stay silently impossible to match.
23. As a player, I want the Modifiers of a Hosted or Custom Lobby read from its own configuration, so that my Modifier filters work on these lobbies too.
24. As a player, I want a Modifier with no equivalent in a Hosted or Custom Lobby configuration to count as absent, so that the result is predictable.
25. As a player, I want a "Maps" section in the panel, so that I can choose which maps I want or refuse.
26. As a player, I want to search maps by name, so that I find one map among about 135.
27. As a player, I want the maps grouped by category, such as Europe, Asia or Fictional, so that I can scan related maps together.
28. As a player, I want the "Maps" section collapsible, so that it does not push my Criteria off screen.
29. As a player, I want to set each map to any, required or blocked, so that the Map Filter works like the Modifier filters I already know.
30. As a player, I want a blocked map to exclude a lobby always, so that I never get an alert for a map I refuse.
31. As a player, I want a lobby to match only on a required map when at least one map is required, so that I can watch for a short list of favourite maps.
32. As a player, I want the Map Filter to apply to all my Criteria at once, so that I set my map taste in one place.
33. As a player, I want a map that is new in OpenFront and not yet in the notifier's list to appear in the "Maps" section once the feed shows it, so that I can filter it without a notifier update.
34. As a player, I want the map names shown as OpenFront shows them, so that I recognise each map.
35. As a player, I want the panel to show how many maps are required or blocked, so that I see that a Map Filter is active while the section is collapsed.
36. As a player, I want a reset control for the Map Filter, so that I can clear it in one action.
37. As a player, I want my Map Filter and the Hosted option saved with my other settings, so that they survive a page reload.
38. As a player in streamer mode, I want the notifier to sleep during a game, so that it does not alert me while I play.
39. As a player, I want the notifier to work only from the live lobby feed, so that it does not call an endpoint that no longer exists.
40. As a player, I want the notifier to keep working when the See All View is closed, so that alerts do not depend on that page.
41. As a player, I want the notifier to keep working when OpenFront hides the Special card on short screens, so that a Special match still alerts me.
42. As a player, I want the notification text to name the map and the Queue, so that I know which game matched before I look.

## Implementation Decisions

- **Lobby feed.** The data layer keeps the `public-lobbies-update` DOM event as its only source. It reads the four Queue keys `ffa`, `team`, `special` and `hosted`. Every key is optional, and order is kept inside each Queue. The HTTP fallback is removed, because OpenFront no longer serves `/api/public_lobbies`.
- **Snapshot model.** The UI groups lobbies by Queue.
  - Index 0 of the FFA, Team and Special Queues is the Live Lobby.
  - Every other lobby is an Upcoming Lobby, and every Hosted Lobby is an Upcoming Lobby.
  - The Up Next strip keeps reading index 1 only.
- **Hosted and Custom detection.** A lobby is Hosted when its Queue is `hosted`. A lobby is Custom when it carries `custom: true`. When the global option is off, both kinds are dropped before matching.
- **Modifier reading.** A single helper returns the Modifier values of a lobby.
  - For a scheduled public lobby, it reads `gameConfig.publicGameModifiers`, which now includes `isDoomsdayClock`.
  - It reads Trusted from `gameConfig.trusted` for every lobby.
  - For a Hosted or Custom Lobby, it translates the raw configuration:

    | Raw field | Modifier |
    |---|---|
    | `randomSpawn` | Random Spawn |
    | `disableAlliances` | Alliances Disabled |
    | `waterNukes` | Water Nukes |
    | `doomsdayClock` present | Doomsday Clock |
    | `gameMapSize` Compact | Compact |
    | `disabledUnits` contains every nuke type | Nukes Disabled |
    | `disabledUnits` contains the SAM launcher | SAMs Disabled |
    | `startingGold`, `goldMultiplier` | Starting Gold, Gold Multiplier |

  - Crowded, Hard Nations and Peace Time count as absent for Hosted and Custom Lobbies. Confirm the exact unit names and the difficulty mapping against OpenFront's schema during the work.
- **Modifier filter set.** Doomsday Clock (`isDoomsdayClock`) and Trusted (`isTrusted`) are added to the boolean tri-state keys. `isPortsDisabled` is removed from the keys, the UI and the type. Settings normalization drops any stored `isPortsDisabled` value.
- **Map Filter.** A new settings field holds a map of `gameMap` value to tri-state. Settings normalization defaults it to empty and drops unknown states.
  - The engine applies the Map Filter before the Criteria. A blocked map rejects the lobby.
  - If one or more maps are required, a map outside that set rejects the lobby.
  - A lobby without a `gameMap` passes only when no map is required.
- **Map catalogue.** A committed data module lists every OpenFront map. Each entry has the `gameMap` wire value, the English display name and the categories. It is generated once from OpenFront's map enum, English strings and map info, and it is refreshed by hand. At runtime, a `gameMap` value seen in the feed and missing from the catalogue is added to an "Other" group under its raw value.
- **Matching order.** The order is: the Hosted/Custom option, then the Map Filter, then the existing Criteria (mode, team format, players, Modifiers).
- **Notification key.** The deduplication key now includes the map. One lobby still produces at most one sound and one desktop notification.
- **"See all" button signal.** The UI finds OpenFront's "See all" button in `game-mode-selector`. When a matching Upcoming Lobby beyond index 1 exists, or a matching Hosted Lobby exists, the UI adds the same active class it uses on home page cards. It removes the class when no such match remains.
- **See All View highlight.** The See All View is the `detailed-view-modal` element. It loads on demand, and it renders each lobby card inside an element that carries `data-lobby-slot="<gameID>"`.
  - A MutationObserver re-applies a highlight class to matching slots whenever the element renders.
  - The highlight only adds a class. It never changes OpenFront's state or filters.
  - When the See All View's own filters hide a matching lobby, the "See all" button still pulses.
- **Notification click.** The desktop notification click handler focuses the window.
  - For an Upcoming Lobby beyond index 1, or a Hosted Lobby, it also calls OpenFront's `showPage("page-detailed-view")`, then selects the lobby's Queue tab on the element. If the tab cannot be selected, the See All View stays on its default "All" tab, which also shows the card.
  - This runs only inside the click handler.
- **In-game detection.** The UI treats the game as live when `document.body` has the `in-game` class or the URL has `?live`. This also covers streamer mode, where the URL is `/streamer-mode`.
- **Version.** The version becomes 2.12.0.
- **Glossary and ADR.** The work uses the terms in the root `GLOSSARY.md`. It follows ADR 0001, which keeps a single global Map Filter.

## Testing Decisions

- **What a good test is.** A good test feeds lobby data in and asserts what the player sees or hears: classes on cards and buttons, sound calls, desktop notification calls and page navigation. It does not assert private methods or internal data shapes.
- **Seam 1: the UI.** Most tests drive `LobbyDiscoveryUI.receiveLobbyUpdate(lobbies)` inside a fake OpenFront DOM under JSDOM.
  - The existing `mountHomepageCards` fixture gains a fake "See all" button and a fake `detailed-view-modal` with `data-lobby-slot` cards.
  - Tests cover:
    - six lobbies per Queue and the Hosted Queue;
    - the pulse on the "See all" button and when it clears;
    - the See All View highlight, including after a re-render;
    - the Hosted/Custom option;
    - the "notify upcoming lobbies" option over every Upcoming Lobby;
    - the notification click, which opens the See All View only from a click;
    - the Map Filter section: search, categories, state cycling, reset and persistence;
    - sleep on `body.in-game`.
  - Prior art: `LobbyDiscoveryUI.test.ts`, including the Up Next block and the "navigates to the game URL only on a real click, never from processing" test.
- **Seam 2: the engine.** Pure tests on `LobbyDiscoveryEngine` cover the edge cases of matching:
  - the required and blocked maps;
  - a lobby without a map;
  - Doomsday Clock and Trusted;
  - the translation of Hosted and Custom raw fields.

  Prior art: `LobbyDiscoveryEngine.test.ts`.
- **Seam 3: the data layer.** `LobbyDataManager` tests fire the `public-lobbies-update` event with a `hosted` key and check that no HTTP request ever happens. Prior art: `LobbyDataManager.test.ts`.
- **Settings migration.** `LobbyDiscoveryHelpers.test.ts` covers three cases:
  - a stored `isPortsDisabled` value is dropped;
  - the Map Filter defaults to empty;
  - the Hosted option defaults to on.
- **No-automation contract.** The existing contract test stays green. A new assertion proves that lobby processing never calls `showPage`.

## Out of Scope

- A Map Filter per Criterion (see ADR 0001).
- A Doomsday Clock speed filter.
- An Up Next strip that lists more than the second lobby of each Queue.
- Any change to the See All View's own filters or saved filter profiles.
- A script that regenerates the map catalogue automatically from OpenFront.
- Joining a lobby, or opening the join modal, from a desktop notification.
- The overtime rule, which OpenFront turns on in every public FFA game and does not show as a badge.

## Further Notes

- Facts come from OpenFront `main` at commit 41503200d (2026-10-27):
  - The See All View exists since #5228.
  - Six lobbies per Queue since #5022.
  - The Hosted Queue since #4480.
  - Custom Lobbies since #5640.
  - Doomsday Clock since #4589.
  - Trusted games since #5127.
  - `body.in-game` since #5061.
- OpenFront may coordinate queues across sites (#5474). Whether coordinated queues also hold six lobbies is not confirmed. The design does not depend on the exact count.
- Only accounts that OpenFront marks as trusted can join a Trusted game. The notifier does not know whether the player is trusted. Blocking Trusted is the player's choice.
- The project `CLAUDE.md` still points at OpenFront's old `src/core/AssetUrls.ts` path. The file is now `packages/shared/src/AssetUrls.ts`. Update the reference during the work.
