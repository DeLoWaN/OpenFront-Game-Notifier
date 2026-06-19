## Purpose
Define how the userscript surfaces each lobby slot's upcoming ("Up Next") game alongside the native lobby cards, including visual treatment, fallbacks, sleep gating, and the upcoming-notification toggle.

## Requirements

### Requirement: Upcoming Game Surfaced Per Lobby Slot
The userscript SHALL present, for each lobby slot (FFA, special, team) that has an upcoming game, a card showing that upcoming game's available configuration — map, game mode, team format, capacity, and active modifiers — in a dedicated "Up Next" area positioned with the native lobby cards.

#### Scenario: Each slot has an upcoming game
- **WHEN** the lobby feed provides an upcoming game for one or more slots
- **THEN** the userscript SHALL render one upcoming card per such slot, each showing that game's map, mode, team format, capacity, and modifiers

#### Scenario: Upcoming card position aligns with live slots
- **WHEN** the Up Next area is rendered alongside the native lobby grid
- **THEN** each upcoming card SHALL be associated with its corresponding live slot rather than presented as an unrelated list

### Requirement: Upcoming Cards Are Clearly Not Live And Show No Countdown
Upcoming cards MUST be visually distinguished from live lobby cards and MUST NOT display a countdown timer or any fabricated start time, because the feed assigns a start time only once a game becomes live.

#### Scenario: Upcoming card is rendered
- **WHEN** an upcoming card is displayed
- **THEN** it SHALL use a not-live visual treatment distinct from live cards and SHALL show a non-temporal "up next" indicator in place of a countdown

#### Scenario: Upcoming game has no start time
- **WHEN** an upcoming game is rendered and its data contains no start time
- **THEN** the userscript MUST NOT display any countdown, elapsed, or estimated start value for that card

### Requirement: Absent Upcoming Slot Shows Fallback
When a slot has no upcoming game, the userscript SHALL indicate the absence rather than render an empty or stale card.

#### Scenario: A slot has no upcoming game
- **WHEN** the lobby feed provides no upcoming game for a given slot
- **THEN** the userscript SHALL show an explicit "no upcoming game" indication for that slot and SHALL NOT render upcoming game details there

### Requirement: Up Next Area Follows Discovery Sleep Gating
The Up Next area SHALL follow the same visibility gating as the discovery panel, remaining hidden while a game is live or when the user is not on the lobby page.

#### Scenario: A game is live
- **WHEN** the user is in a live game (lobby page is not active)
- **THEN** the Up Next area SHALL be hidden

#### Scenario: User returns to the lobby page
- **WHEN** the user is on the lobby page and discovery is active
- **THEN** the Up Next area SHALL be shown

### Requirement: Upcoming Notification Toggle Persists
The userscript SHALL provide a "notify on upcoming games" setting that defaults to enabled and is persisted across sessions using the existing discovery settings storage.

#### Scenario: First run with no saved preference
- **WHEN** discovery settings are loaded and no upcoming-notification preference is stored
- **THEN** the setting SHALL default to enabled

#### Scenario: Preference is changed
- **WHEN** the user changes the "notify on upcoming games" setting
- **THEN** the new value SHALL be persisted and restored on the next session

### Requirement: Upcoming Card Map Thumbnail Resolves Against OpenFront Asset Globals
An upcoming ("Up Next") card SHALL resolve its map-thumbnail image URL the same way OpenFront resolves its own assets, reading OpenFront's current asset-manifest and CDN-base page globals so the card reuses the exact CDN-hosted, fingerprinted thumbnail. When those globals are unavailable, the card SHALL degrade gracefully without rendering broken or empty art as if it were valid map art.

#### Scenario: Asset manifest and CDN base are available
- **WHEN** an upcoming card is rendered and OpenFront exposes its asset manifest and CDN base on the page
- **THEN** the card SHALL resolve the map thumbnail to the manifest's fingerprinted, CDN-prefixed URL for that map and display it

#### Scenario: Manifest is exposed under a fallback location
- **WHEN** the primary asset-globals location is absent but OpenFront's fallback asset-globals location is present
- **THEN** the card SHALL resolve the thumbnail from the fallback location rather than failing to find it

#### Scenario: Asset globals are unavailable
- **WHEN** neither the primary nor fallback asset globals are present (for example in a test environment or after an unanticipated OpenFront change)
- **THEN** the card SHALL fall back to a deterministic relative thumbnail path and SHALL NOT misrepresent a failed image load as valid map art

#### Scenario: Map name requires normalization to match the manifest key
- **WHEN** a map's display name contains whitespace, dots, or parentheses
- **THEN** the userscript SHALL normalize the name to the same manifest key form OpenFront uses before looking the thumbnail up
