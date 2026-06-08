## MODIFIED Requirements

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
