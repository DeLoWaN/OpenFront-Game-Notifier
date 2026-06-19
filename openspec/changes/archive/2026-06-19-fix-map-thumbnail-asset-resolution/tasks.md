## 1. Failing tests (red)

- [x] 1.1 Add a test asserting `getLobbyMapThumbnailUrl` returns the CDN-prefixed fingerprinted URL when given a manifest entry + cdnBase (e.g. `maps/europe/thumbnail.webp` → `<cdnBase>/_assets/maps/europe/thumbnail.<hash>.webp`) — pre-existing helper test + new UI-level test reading the rendered card `<img>` through `getAssetContext`
- [x] 1.2 Add a test asserting the relative `"/maps/<map>/thumbnail.webp"` fallback is returned when manifest/cdnBase are `null` (degradation path stays intact) — pre-existing helper test + new UI-level degradation test
- [x] 1.3 Add a test asserting a parenthesized map name (e.g. `"Faroe Islands (Test)"`) normalizes to a parens-stripped manifest key matching V32's `/[\s.()]+/g`
- [x] 1.4 Confirm 1.3 fails against the current `/[\s.]+/g` normalization (received `/maps/faroeislands(test)/thumbnail.webp`); the two new UI globals tests also fail red (fell back to relative path)

## 2. Globals fix (green) — commit 1

- [x] 2.1 In `LobbyDiscoveryUI.getAssetContext`, replace the `ASSET_MANIFEST`/`CDN_BASE` reads with `BOOTSTRAP_CONFIG.assetManifest` / `BOOTSTRAP_CONFIG.cdnBase`, falling back to `globalThis.__ASSET_MANIFEST__` / `globalThis.__CDN_BASE__`, then `null`
- [x] 2.2 Update the local `AssetGlobals` type to the `BOOTSTRAP_CONFIG` shape (`{ assetManifest?: Record<string,string>; cdnBase?: string }`) plus the `__ASSET_MANIFEST__`/`__CDN_BASE__` fallbacks; keep the `unsafeWindow` → `window` resolution unchanged
- [x] 2.3 Verify thumbnail URLs resolve to the CDN against live data (manifest + cdnBase both present) — covered live in task 5.3

## 3. Normalization parity (green) — commit 2

- [x] 3.1 In `LobbyDiscoveryHelpers.getLobbyMapThumbnailUrl`, change the normalization regex from `/[\s.]+/g` to `/[\s.()]+/g` to match V32's `GamePreviewBuilder`/`JoinLobbyModal`
- [x] 3.2 Confirm the 1.3 parenthesized-map test now passes and existing non-parens tests stay green

## 4. Documentation

- [x] 4.1 Update `CLAUDE.md` Live Integration Testing notes to reference `window.BOOTSTRAP_CONFIG.assetManifest` / `.cdnBase` (with `__ASSET_MANIFEST__`/`__CDN_BASE__` fallbacks) instead of `ASSET_MANIFEST`/`CDN_BASE` — done via the watch-for row (no prior asset prose existed; CLAUDE.md is a symlink to AGENTS.md)
- [x] 4.2 Add/refresh a "what to watch for" row: black Up Next thumbnails → asset globals not found (OpenFront renamed them); re-mirror `getAssetManifest`/`getCdnBase`

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run type-check` — 162 tests pass, tsc clean
- [x] 5.2 Run `openspec validate fix-map-thumbnail-asset-resolution` — valid
- [x] 5.3 Live-verify via Playwright that Up Next cards render non-empty CDN thumbnails — fixed logic resolves all live maps to fingerprinted CDN URLs; 4 probes returned HTTP 200 `image/webp`

## 6. Release

- [x] 6.1 Bump version with `npm version patch` (2.11.1 → 2.11.2) — used `--no-git-tag-version`; commit/tag left to the user
- [x] 6.2 Rebuild the production bundle with `npm run build:prod` — `dist/bundle.user.js` 86.4kb
- [x] 6.3 Verify version consistency between `package.json` and `dist/bundle.user.js` (`@version`) — both `2.11.2`; bundle contains the `BOOTSTRAP_CONFIG` read + parens regex, old globals absent
