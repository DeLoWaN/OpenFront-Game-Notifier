## ADDED Requirements

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
