## Why

OpenFront encodes a team lobby's `playerTeams` two different ways: as a **number** (the team count, e.g. `6` → "6 teams") or as a **named format string** `"Duos"`/`"Trios"`/`"Quads"` (a fixed players-per-team of 2/3/4, with the team count derived from capacity). The discovery engine compares a numeric NUMBER OF TEAMS criterion *directly* against this raw value, so a `"Quads"` lobby that the UI renders as "6 teams of 4" never matches the user's `6` selection (`6 !== "Quads"`). The result: every Duos/Trios/Quads lobby with fewer than 8 teams is silently invisible to NUMBER OF TEAMS filtering, even though the card visibly invites the user to select that team count.

## What Changes

- Fix `LobbyDiscoveryEngine.matchesCriteria` so a numeric team-count criterion is compared against the lobby's **effective** team count, resolving named formats (`Duos`/`Trios`/`Quads`) to `floor(capacity / playersPerTeam)` — the same derivation the existing `'8+'` branch already performs. A `"Quads"` + 24-capacity lobby then matches a `6` criterion.
- Keep `Humans Vs Nations` matched by format identity only (unchanged), and keep the players-per-team range check unchanged.
- Document in `CLAUDE.md` that `playerTeams` is polymorphic — sometimes the number of teams, sometimes a named players-per-team format — so future work treats the two forms explicitly.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `notification-based-lobby-discovery`: the Team format filtering requirement is tightened so numeric team-count criteria match named-format lobbies by their derived team count, not by literal string equality.

## Impact

- Code: `src/modules/lobby-discovery/LobbyDiscoveryEngine.ts` (team-count comparison logic). No change to `LobbyDiscoveryHelpers.ts` parsing or the criteria UI.
- Tests: `tests/modules/lobby-discovery/` — add coverage for named-format lobbies matching numeric team-count criteria.
- Docs: `CLAUDE.md` gains a note on the polymorphic `playerTeams` field.
- Behavior: previously-hidden Duos/Trios/Quads lobbies now correctly match NUMBER OF TEAMS filters. No storage-format or API change; no breaking change.
- Release: patch version bump (`2.11.0` → `2.11.1`) plus a `build:prod` rebuild so the distributed bundle carries the fix.
