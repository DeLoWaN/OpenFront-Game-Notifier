## 1. Failing tests (red)

- [x] 1.1 Add a test asserting a `playerTeams: "Quads"` lobby with capacity 24 matches a `teamCount: 6` criterion (players-per-team range satisfied)
- [x] 1.2 Add a test asserting a `playerTeams: "Trios"` lobby with capacity 9 matches a `teamCount: 3` criterion
- [x] 1.3 Add a test asserting a named-format lobby whose derived team count differs from the criterion does NOT match (e.g. `"Quads"` cap 24 ⇒ 6 teams vs `teamCount: 5`)
- [x] 1.4 Confirm these new tests fail against the current engine

## 2. Engine fix (green)

- [x] 2.1 In `LobbyDiscoveryEngine.matchesCriteria`, derive the lobby's effective numeric team count from `lobbyTeamConfig` + capacity (number → itself; `Duos`/`Trios`/`Quads` → `floor(capacity / getPlayersPerTeam(...))`; `Humans Vs Nations` → none)
- [x] 2.2 Route the `'8+'` branch through the shared derivation (`>= 8`)
- [x] 2.3 Replace the numeric-equality branch so it compares `criteria.teamCount` against the derived team count instead of the raw `lobbyTeamConfig`
- [x] 2.4 Treat a `null` derived count (missing/zero capacity) as a non-match (continue), preserving current safety behavior
- [x] 2.5 Verify the new tests pass and the existing `'8+'`, `Humans Vs Nations`, and players-per-team tests stay green

## 3. Regression coverage

- [x] 3.1 Add/confirm a test that numeric-encoded lobbies (`playerTeams: 6`) still match `teamCount: 6`
- [x] 3.2 Confirm `Humans Vs Nations` still matches by format identity and skips the players-per-team range

## 4. Documentation

- [x] 4.1 Update `CLAUDE.md` to note that `gameConfig.playerTeams` is polymorphic — a number means the team count, while `Duos`/`Trios`/`Quads` means players-per-team (team count derived from capacity), and `Humans Vs Nations` is a distinct format
- [x] 4.2 Add a row to the "Live Integration Testing → What to watch for" table for the named-format symptom (e.g. `matched: false` for a Duos/Trios/Quads lobby → numeric team-count criterion compared against the raw named format instead of the derived team count)

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run type-check`
- [x] 5.2 Run `openspec validate fix-named-team-format-matching`

## 6. Release

- [x] 6.1 Bump version with `npm version patch` (2.11.0 → 2.11.1)
- [x] 6.2 Rebuild the production bundle with `npm run build:prod`
- [x] 6.3 Verify version consistency between `package.json` and `dist/bundle.user.js` (`@version`)
