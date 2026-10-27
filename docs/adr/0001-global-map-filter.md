# One global Map Filter, not one per Criterion

A Criterion holds its own Modifier filters, but the Map Filter applies to every Criterion at once. A player likes or dislikes a map whatever the game mode. Editing about 135 maps inside each Criterion would also make the panel heavy.

## Consequences

- A player cannot say "Team on Alps, FFA on any map". Each Criterion sees the same allowed maps.
- A Map Filter per Criterion later needs a settings migration that copies the global filter into each saved Criterion.
