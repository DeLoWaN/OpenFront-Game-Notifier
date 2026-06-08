## Purpose
Define notification-driven lobby discovery behavior for manual join workflows.

## Requirements

### Requirement: Notify-Only Discovery
The userscript SHALL continue discovering matching lobbies and presenting notifications, while never performing an automated lobby join. Discovery SHALL evaluate both the live (featured) lobby and the upcoming lobby for each slot, so a configured criteria match SHALL be detected whether the matching game is live now or queued next.

#### Scenario: Team criteria match triggers notification
- **WHEN** a lobby matches the configured Team criteria
- **THEN** the userscript SHALL display a game-found notification without performing an automated join

#### Scenario: Upcoming lobby matches criteria
- **WHEN** the upcoming lobby for a slot matches the configured criteria and upcoming notifications are enabled
- **THEN** the userscript SHALL present a game-found notification for that upcoming game without performing an automated join

#### Scenario: Repeated processing of the same match
- **WHEN** the same matching lobby (live or upcoming) is processed repeatedly during discovery updates
- **THEN** the userscript SHALL avoid duplicating notifications beyond the configured deduplication behavior

### Requirement: Team Criteria Filtering Remains Available
The userscript SHALL keep Team criteria configuration available for manual discovery, including team-format filters and players-per-team constraints. When evaluating a numeric NUMBER OF TEAMS criterion, the userscript SHALL compare it against the lobby's effective team count, resolving OpenFront's named team formats (`Duos`/`Trios`/`Quads`) to their derived team count (`floor(capacity / players-per-team)`) rather than comparing the criterion against the raw format value.

#### Scenario: Team format criteria is configured
- **WHEN** the user selects specific Team formats (for example Duos, Trios, Quads, or numeric team counts)
- **THEN** discovery matching SHALL evaluate lobbies against those selected Team formats

#### Scenario: Numeric team-count criterion matches a named-format lobby
- **WHEN** the user selects a numeric NUMBER OF TEAMS value and a lobby reports a named format (`Duos`/`Trios`/`Quads`) whose derived team count (`floor(capacity / players-per-team)`) equals that value
- **THEN** discovery matching SHALL treat the lobby as matching that team-count criterion

#### Scenario: Numeric team-count criterion rejects a non-matching named-format lobby
- **WHEN** the user selects a numeric NUMBER OF TEAMS value and a named-format lobby's derived team count does not equal that value
- **THEN** discovery matching SHALL NOT treat the lobby as matching that team-count criterion

#### Scenario: Players-per-team range is configured
- **WHEN** the user sets Team min/max players-per-team constraints
- **THEN** discovery matching SHALL only notify for lobbies that satisfy the configured range

### Requirement: Notification Controls Persist
Notification enablement and sound preferences SHALL be configurable and persisted across sessions.

#### Scenario: Notifications are disabled
- **WHEN** the user disables lobby discovery notifications
- **THEN** subsequent matching lobbies SHALL NOT create game-found notifications until notifications are re-enabled

#### Scenario: Sound preference is enabled
- **WHEN** a game-found notification is shown while sound is enabled
- **THEN** the userscript SHALL play the configured notification sound

### Requirement: Upcoming Match Notification Parity And Gating
When upcoming notifications are enabled, a match on an upcoming game SHALL alert using the same notification treatment (visual highlight and sound) as a live match. When upcoming notifications are disabled, upcoming matches SHALL NOT produce notifications, while upcoming games MAY still be displayed.

#### Scenario: Upcoming notifications enabled
- **WHEN** an upcoming game matches criteria and the upcoming-notification setting is enabled
- **THEN** the userscript SHALL alert with the same highlight and sound used for a live match

#### Scenario: Upcoming notifications disabled
- **WHEN** an upcoming game matches criteria and the upcoming-notification setting is disabled
- **THEN** the userscript SHALL NOT produce a notification or sound for that upcoming match
