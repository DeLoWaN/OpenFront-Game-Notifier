# Team Count 8+ Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "8+" chip to the NUMBER OF TEAMS selector that matches any lobby with 8 or more teams, closing the gap left when Duos/Trios/Quads were removed.

**Architecture:** Add `'8+'` as a new `TeamCount` literal; update parsing, sanitization, engine matching (range check instead of exact equality), and UI (new chip + constant entry). The players-per-team slider is unaffected — it uses the actual lobby team count, not the criteria value.

**Tech Stack:** TypeScript 5.3+, esbuild, Vitest

---

## File Map

| File | Change |
|------|--------|
| `src/modules/lobby-discovery/LobbyDiscoveryTypes.ts` | Add `'8+'` to `TeamCount` union |
| `src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts` | `parseTeamCount`: recognise `'8+'`; `sanitizeCriteriaTeamCount`: let `'8+'` pass |
| `src/modules/lobby-discovery/LobbyDiscoveryEngine.ts` | Range check when `criteria.teamCount === '8+'` |
| `src/modules/lobby-discovery/LobbyDiscoveryUI.ts` | Add chip to `TEAM_COUNT_IDS`, `ALL_TEAM_IDS`, HTML template, `getAllTeamCountValues`, `setTeamCountSelections` |
| `tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts` | Tests for `parseTeamCount('8+')` and `sanitizeCriteria` round-trip |
| `tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts` | Tests for engine matching with `'8+'` criteria |

---

### Task 1: Type + parsing + sanitization (with tests)

**Files:**
- Modify: `src/modules/lobby-discovery/LobbyDiscoveryTypes.ts`
- Modify: `src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts`
- Modify: `tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts`, inside the existing `describe` block (after the last `it` block before the closing `}`):

```typescript
  describe('parseTeamCount — 8+', () => {
    it('returns "8+" for the string literal "8+"', () => {
      expect(parseTeamCount('8+')).toBe('8+');
    });

    it('does not return "8+" for the number 8', () => {
      expect(parseTeamCount(8)).toBe(8);
    });
  });

  describe('sanitizeCriteria — 8+ team count', () => {
    it('preserves teamCount: "8+"', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 62 },
      ]);
      expect(result[0]!.teamCount).toBe('8+');
    });

    it('round-trips "8+" through normalizeSettings', () => {
      const settings = normalizeSettings({
        criteria: [{ gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 62 }],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      });
      expect(settings.criteria[0]!.teamCount).toBe('8+');
    });
  });
```

Check that `parseTeamCount` and `normalizeSettings` are already imported at the top of the test file. They are — the file already imports them. No new imports needed.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test -- --reporter=verbose tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts 2>&1 | tail -30
```

Expected: FAIL — `parseTeamCount('8+')` returns `null`, not `'8+'`.

- [ ] **Step 3: Add `'8+'` to the `TeamCount` type**

In `src/modules/lobby-discovery/LobbyDiscoveryTypes.ts`, replace line 7:

```typescript
export type TeamCount = 'Duos' | 'Trios' | 'Quads' | 'Humans Vs Nations' | number;
```

with:

```typescript
export type TeamCount = 'Duos' | 'Trios' | 'Quads' | 'Humans Vs Nations' | '8+' | number;
```

- [ ] **Step 4: Update `parseTeamCount` to recognise `'8+'`**

In `src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts`, replace the `parseTeamCount` function (lines 52–76):

```typescript
export function parseTeamCount(
  value: string | number | null | undefined
): TeamCount | null {
  if (
    value === 'Duos' ||
    value === 'Trios' ||
    value === 'Quads' ||
    value === 'Humans Vs Nations' ||
    value === '8+'
  ) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}
```

`sanitizeCriteriaTeamCount` (lines 373–381) only blocks `Duos/Trios/Quads`. `'8+'` is not in that list, so it already passes through — no change needed there.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test -- --reporter=verbose tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts 2>&1 | tail -30
```

Expected: all tests in the file PASS, including the new `8+` describe blocks.

- [ ] **Step 6: Type-check**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm run type-check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && git add src/modules/lobby-discovery/LobbyDiscoveryTypes.ts src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts tests/modules/lobby-discovery/LobbyDiscoveryHelpers.test.ts && git commit -m "feat(team-count): add 8+ as valid TeamCount literal with parse/sanitize support"
```

---

### Task 2: Engine matching (with tests)

**Files:**
- Modify: `src/modules/lobby-discovery/LobbyDiscoveryEngine.ts`
- Modify: `tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts`, inside the top-level `describe('LobbyDiscoveryEngine', ...)` block:

```typescript
  describe('8+ team count matching', () => {
    const make8PlusCriteria = (minPPT: number, maxPPT: number) => [
      { gameMode: 'Team', teamCount: '8+', minPlayers: minPPT, maxPlayers: maxPPT },
    ] as any;

    it('matches a lobby with exactly 8 teams', () => {
      const lobby = {
        gameID: '8teams-1',
        publicGameType: 'team',
        numClients: 16,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 8,
          maxClients: 16,
        },
        maxClients: 16,
      } as any;
      // 8 teams, 16/8 = 2 players per team — within [2, 10]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(true);
    });

    it('matches a lobby with 10 teams', () => {
      const lobby = {
        gameID: '10teams-1',
        publicGameType: 'team',
        numClients: 14,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 10,
          maxClients: 20,
        },
        maxClients: 20,
      } as any;
      // 10 teams, 20/10 = 2 players per team — within [2, 10]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(true);
    });

    it('does not match a lobby with 7 teams', () => {
      const lobby = {
        gameID: '7teams-1',
        publicGameType: 'team',
        numClients: 14,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 7,
          maxClients: 14,
        },
        maxClients: 14,
      } as any;
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(false);
    });

    it('respects players-per-team bounds for 8+ lobbies', () => {
      const lobby = {
        gameID: '10teams-big',
        publicGameType: 'team',
        numClients: 30,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 10,
          maxClients: 100,
        },
        maxClients: 100,
      } as any;
      // 10 teams, 100/10 = 10 players per team — outside [2, 5]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 5))).toBe(false);
    });

    it('does not match Humans Vs Nations with 8+ criteria', () => {
      const lobby = {
        gameID: 'hvn-1',
        publicGameType: 'special',
        numClients: 6,
        gameConfig: {
          gameMode: 'Team',
          playerTeams: 'Humans Vs Nations',
          maxClients: 60,
        },
        maxClients: 60,
      } as any;
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 62))).toBe(false);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test -- --reporter=verbose tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts 2>&1 | tail -30
```

Expected: FAIL — the `8+` criteria hits the exact-match check and skips all 8+ lobbies.

- [ ] **Step 3: Update the engine matching logic**

In `src/modules/lobby-discovery/LobbyDiscoveryEngine.ts`, replace the team count check block (lines 58–65):

```typescript
      if (gameMode === 'Team') {
        if (
          criteria.teamCount !== null &&
          criteria.teamCount !== undefined &&
          criteria.teamCount !== lobbyTeamConfig
        ) {
          continue;
        }

        if (teamComparisonCapacity === null) {
          continue;
        }
      }
```

with:

```typescript
      if (gameMode === 'Team') {
        if (criteria.teamCount !== null && criteria.teamCount !== undefined) {
          if (criteria.teamCount === '8+') {
            if (typeof lobbyTeamConfig !== 'number' || lobbyTeamConfig < 8) {
              continue;
            }
          } else if (criteria.teamCount !== lobbyTeamConfig) {
            continue;
          }
        }

        if (teamComparisonCapacity === null) {
          continue;
        }
      }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test -- --reporter=verbose tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts 2>&1 | tail -30
```

Expected: all tests in the file PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 6: Type-check**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm run type-check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && git add src/modules/lobby-discovery/LobbyDiscoveryEngine.ts tests/modules/lobby-discovery/LobbyDiscoveryEngine.test.ts && git commit -m "feat(engine): match 8+ team count as range ≥ 8"
```

---

### Task 3: UI — add the "8+" chip

**Files:**
- Modify: `src/modules/lobby-discovery/LobbyDiscoveryUI.ts`

No unit tests for DOM wiring — verified manually in the browser.

- [ ] **Step 1: Add `'8+'` to `TEAM_COUNT_IDS`**

In `src/modules/lobby-discovery/LobbyDiscoveryUI.ts`, replace lines 49–56:

```typescript
const TEAM_COUNT_IDS: Array<[string, string]> = [
  ['discovery-team-2', '2'],
  ['discovery-team-3', '3'],
  ['discovery-team-4', '4'],
  ['discovery-team-5', '5'],
  ['discovery-team-6', '6'],
  ['discovery-team-7', '7'],
];
```

with:

```typescript
const TEAM_COUNT_IDS: Array<[string, string]> = [
  ['discovery-team-2', '2'],
  ['discovery-team-3', '3'],
  ['discovery-team-4', '4'],
  ['discovery-team-5', '5'],
  ['discovery-team-6', '6'],
  ['discovery-team-7', '7'],
  ['discovery-team-8plus', '8+'],
];
```

`ALL_TEAM_IDS` is built from `TEAM_COUNT_IDS` at line 58–61 — it picks up `discovery-team-8plus` automatically.

- [ ] **Step 2: Handle `'8+'` in `getAllTeamCountValues`**

In `src/modules/lobby-discovery/LobbyDiscoveryUI.ts`, replace the `getAllTeamCountValues` method (lines 512–526):

```typescript
  private getAllTeamCountValues(): TeamCount[] {
    const values: TeamCount[] = [];
    for (const id of ALL_TEAM_IDS) {
      const checkbox = document.getElementById(id) as HTMLInputElement | null;
      if (!checkbox?.checked) continue;
      const value = checkbox.value;
      if (value === 'Humans Vs Nations' || value === '8+') {
        values.push(value);
      } else {
        const numeric = parseInt(value, 10);
        if (!Number.isNaN(numeric)) values.push(numeric);
      }
    }
    return values;
  }
```

- [ ] **Step 3: Handle `'8+'` in `setTeamCountSelections`**

In `src/modules/lobby-discovery/LobbyDiscoveryUI.ts`, replace the `setTeamCountSelections` method (lines 703–713):

```typescript
  private setTeamCountSelections(values: Array<TeamCount | null | undefined>): void {
    for (const teamCount of values) {
      let checkbox: HTMLInputElement | null = null;
      if (teamCount === 'Humans Vs Nations') checkbox = document.getElementById('discovery-team-hvn') as HTMLInputElement;
      else if (teamCount === '8+') checkbox = document.getElementById('discovery-team-8plus') as HTMLInputElement;
      else if (typeof teamCount === 'number') checkbox = document.getElementById(`discovery-team-${teamCount}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        this.syncChipState(checkbox.id);
      }
    }
  }
```

- [ ] **Step 4: Add the chip to the HTML template**

In `src/modules/lobby-discovery/LobbyDiscoveryUI.ts`, replace lines 958–965:

```typescript
              <div class="ld-formats" style="margin-bottom: 14px;">
                ${this.renderChip('discovery-team-2', '2', '2')}
                ${this.renderChip('discovery-team-3', '3', '3')}
                ${this.renderChip('discovery-team-4', '4', '4')}
                ${this.renderChip('discovery-team-5', '5', '5')}
                ${this.renderChip('discovery-team-6', '6', '6')}
                ${this.renderChip('discovery-team-7', '7', '7')}
              </div>
```

with:

```typescript
              <div class="ld-formats" style="margin-bottom: 14px;">
                ${this.renderChip('discovery-team-2', '2', '2')}
                ${this.renderChip('discovery-team-3', '3', '3')}
                ${this.renderChip('discovery-team-4', '4', '4')}
                ${this.renderChip('discovery-team-5', '5', '5')}
                ${this.renderChip('discovery-team-6', '6', '6')}
                ${this.renderChip('discovery-team-7', '7', '7')}
                ${this.renderChip('discovery-team-8plus', '8+', '8+')}
              </div>
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm run type-check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 6: Full test suite**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm test 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 7: Build and verify**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm run build:prod 2>&1 | tail -10
```

Expected: build succeeds; check `dist/bundle.user.js` contains `discovery-team-8plus` and `8+`.

```bash
grep "discovery-team-8plus\|teamCount.*8" /Users/damien/git_perso/openfront-game-notifier/dist/bundle.user.js | head -5
```

- [ ] **Step 8: Commit**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && git add src/modules/lobby-discovery/LobbyDiscoveryUI.ts dist/bundle.user.js && git commit -m "feat(ui): add 8+ team count chip to number-of-teams selector"
```

---

### Task 4: Version bump

- [ ] **Step 1: Bump patch version**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm version patch
```

- [ ] **Step 2: Rebuild**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && npm run build:prod 2>&1 | tail -10
```

- [ ] **Step 3: Verify version consistency**

```bash
grep '"version"' /Users/damien/git_perso/openfront-game-notifier/package.json && grep '@version' /Users/damien/git_perso/openfront-game-notifier/dist/bundle.user.js | head -2
```

Expected: both lines show the same version number.

- [ ] **Step 4: Commit**

```bash
cd /Users/damien/git_perso/openfront-game-notifier && git add package.json package-lock.json dist/bundle.user.js && git commit -m "chore(release): bump version for 8+ team count filter"
```
