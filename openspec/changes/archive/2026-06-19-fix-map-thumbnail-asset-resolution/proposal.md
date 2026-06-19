## Why

OpenFront V32 moved the page globals the userscript reads to resolve map-thumbnail URLs. `getAssetContext()` still reads `window.ASSET_MANIFEST` and `window.CDN_BASE`, but in V32 both are `undefined` — the data now lives at `window.BOOTSTRAP_CONFIG.assetManifest` and `window.BOOTSTRAP_CONFIG.cdnBase` (with `globalThis.__ASSET_MANIFEST__` / `globalThis.__CDN_BASE__` as OpenFront's own fallbacks).

With the manifest resolving to `null`, `getLobbyMapThumbnailUrl` falls through to the relative path `"/maps/<map>/thumbnail.webp"`. That path does not exist on the origin — the real asset is fingerprinted and CDN-hosted (e.g. `https://cdn.ofedge.io/game_assets/_assets/maps/europe/thumbnail.5ffe4eb83aa5.webp`). The `<img>` 404s and degrades to the dimmed card background, so every "Up Next" card renders with black/empty art. Native lobby cards are unaffected because they call OpenFront's own `assetUrl()`, which reads `BOOTSTRAP_CONFIG`.

Verified live on openfront.io: `window.ASSET_MANIFEST` and `window.CDN_BASE` are `undefined`; `BOOTSTRAP_CONFIG.assetManifest` holds `maps/<map>/thumbnail.webp` keys and `BOOTSTRAP_CONFIG.cdnBase` is `"https://cdn.ofedge.io/game_assets"`. The manifest **key** format (`maps/<normalized>/thumbnail.webp`) is unchanged — only the lookup source moved.

## What Changes

- Fix `getAssetContext()` in `LobbyDiscoveryUI.ts` to read the manifest and CDN base from OpenFront's current source of truth, mirroring V32's `getAssetManifest()` / `getCdnBase()` precedence:
  - manifest: `window.BOOTSTRAP_CONFIG?.assetManifest` → `globalThis.__ASSET_MANIFEST__` → `null`
  - cdnBase: `window.BOOTSTRAP_CONFIG?.cdnBase` → `globalThis.__CDN_BASE__` → `null`
  Reading both the `BOOTSTRAP_CONFIG` location and the `__X__` fallbacks (OpenFront's own backup path) hardens the mirror against the next rename.
- Bring `getLobbyMapThumbnailUrl`'s map-name normalization into parity with V32, which now strips parentheses too (`/[\s.()]+/g` vs our `/[\s.]+/g`). This is a separate latent bug: any map whose name contains `()` would miss its manifest key even after the globals fix. Shipped as its own atomic commit.
- **Decision (faithful mirror, not DOM-scrape):** we keep re-mirroring OpenFront's documented resolution rather than scraping a native card's `<img src>`. The mirror is a few lines and decoupled from OpenFront's DOM; a one-line re-mirror per release is acceptable maintenance for a userscript.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `upcoming-games-display`: a new requirement pins down how an upcoming card resolves its map-thumbnail asset URL against OpenFront's current asset-manifest/CDN globals, with graceful degradation when they are unavailable — so a future global rename is a known, spec-covered failure mode rather than a silent regression.

## Impact

- Code: `src/modules/lobby-discovery/LobbyDiscoveryUI.ts` (`getAssetContext` source globals) and `src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts` (normalization regex). No change to the upcoming-card data model, matching engine, or settings storage.
- Types: add a minimal `BOOTSTRAP_CONFIG` shape to the asset-globals type used by `getAssetContext` (the existing `ASSET_MANIFEST`/`CDN_BASE` typing is replaced).
- Tests: `tests/modules/lobby-discovery/` — cover (a) manifest resolved from `BOOTSTRAP_CONFIG`, (b) fallback to `__ASSET_MANIFEST__`/`__CDN_BASE__`, (c) relative-path degradation when nothing is present, (d) a parenthesized map name normalizing to the correct manifest key.
- Docs: `CLAUDE.md` Live Integration Testing section — update the asset-resolution note and the "what to watch for" table to reference `BOOTSTRAP_CONFIG` instead of the old globals.
- Behavior: Up Next cards render the correct CDN thumbnails again. No storage-format or API change; no breaking change.
- Release: patch bump (`2.11.1` → `2.11.2`) plus `build:prod` rebuild so the distributed bundle carries the fix.
