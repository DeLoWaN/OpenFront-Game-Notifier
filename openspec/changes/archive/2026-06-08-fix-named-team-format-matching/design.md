## Context

OpenFront's lobby feed reports a team game's structure in `gameConfig.playerTeams`, but the representation is **polymorphic**:

- A **number** `N` means "N teams" (players-per-team derived as `floor(capacity / N)`).
- A **named string** `"Duos"`/`"Trios"`/`"Quads"` means a fixed **players-per-team** of 2/3/4, with the team count derived as `floor(capacity / playersPerTeam)`.
- `"Humans Vs Nations"` is a distinct format with no per-team structure.

Live feed confirms both forms coexist (e.g. `South America → "Trios"`, a numeric `Four Islands → 4`). The display helper `getLobbyModeText` already normalizes both into "N teams of M", which is why a `"Quads"` + capacity-24 lobby renders identically to a numeric `6` lobby ("6 teams of 4").

`LobbyDiscoveryEngine.matchesCriteria` does not normalize. For a numeric criterion it runs `criteria.teamCount !== lobbyTeamConfig`, comparing a number against the raw `playerTeams`. When the lobby is a named format the comparison is number-vs-string and always fails. The `'8+'` branch in the same method *does* derive the team count from named formats — so the normalization logic already exists but is applied only to that one branch.

The criteria sanitizer (`sanitizeCriteriaTeamCount`) strips `Duos`/`Trios`/`Quads` from saved criteria, so the user cannot select a named format directly either. The only selectable team-count criteria are numbers and `'8+'`. Net effect: a Duos/Trios/Quads lobby with `< 8` derived teams matches no team-count criterion at all.

## Goals / Non-Goals

**Goals:**
- A numeric NUMBER OF TEAMS criterion matches a named-format lobby by its **derived** team count (`"Quads"` + cap 24 ⇒ 6 teams ⇒ matches `6`).
- Keep the `'8+'` and `Humans Vs Nations` behavior intact.
- Document the polymorphic `playerTeams` field so future code treats both forms explicitly.

**Non-Goals:**
- No change to the criteria UI or which team-count values are selectable.
- No change to `sanitizeCriteriaTeamCount` (named formats stay stripped from saved criteria).
- No change to the players-per-team range check or modifier matching.

## Decisions

**Decision: Resolve the lobby's effective team count once, then compare.**
Introduce a single derivation that converts `lobbyTeamConfig` into a numeric team count, reusing the existing rule (`number → itself`; `Duos/Trios/Quads → floor(capacity / playersPerTeam)`; `Humans Vs Nations → not a numeric team count`). Use this resolved value for both the `'8+'` branch (`>= 8`) and the numeric-equality branch (`=== criteria.teamCount`).

*Alternative considered — expand criteria to include named formats:* reverse `sanitizeCriteriaTeamCount` so a `6` selection also stores `Quads`. Rejected: brittle (the mapping number↔format depends on capacity), changes saved-settings shape, and leaks display concerns into criteria. Deriving at match time is capacity-correct and localized.

**Decision: Keep `getPlayersPerTeam` as the single source for the players-per-team values.**
The derivation computes `floor(capacity / getPlayersPerTeam(named, capacity))`, mirroring the current `'8+'` branch so there is one definition of how named formats expand. No new constant table.

**Decision: Document `playerTeams` polymorphism in `CLAUDE.md`.**
Add a short note under the lobby-data section stating the field is a number (team count) or a named string (players-per-team), so the two forms are not conflated again.

## Risks / Trade-offs

- [A named format whose derived team count collides with a different numeric lobby's count is treated as the same team-count match] → Intended: from the user's perspective "6 teams" is "6 teams" regardless of encoding; this is the fix's whole point.
- [Capacity missing/zero would make the derivation undefined] → `getPlayersPerTeam` already returns `null` without a positive capacity; the branch treats a `null` derived count as "no numeric match" and continues, matching current safety behavior.
- [Regression in the existing `'8+'` path] → Mitigated by routing both branches through the same derivation and keeping the `'8+'` tests green.
