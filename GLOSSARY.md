# OpenFront Game Notifier

A userscript that watches OpenFront.io public lobbies and tells the player when one matches what they want. It never joins a lobby on its own.

## Lobbies

**Queue**:
One of the lists of lobbies that OpenFront advertises: FFA, Team, Special or Hosted.
_Avoid_: Source, slot, bucket, public game type

**Live Lobby**:
The first lobby of an FFA, Team or Special Queue: the one that counts down on the OpenFront home page.
_Avoid_: Current lobby, featured lobby

**Upcoming Lobby**:
Any advertised lobby that is not a Live Lobby: the later lobbies of each Queue and every Hosted Lobby.
_Avoid_: Next game, queued lobby

**Hosted Lobby**:
A private game that a subscriber lists in the Hosted Queue, with a configuration they chose.
_Avoid_: Listed lobby, subscriber lobby

**Custom Lobby**:
A private game that a host paid to place in the Special Queue, with a configuration they chose.
_Avoid_: Paid lobby

**See All View**:
The OpenFront page that lists every lobby of every Queue, opened from the "See all" button on the home page.
_Avoid_: Detailed view, lobby browser

## Matching

**Criterion**:
One description of a wanted game: game mode, team format, player range and Modifier filters. A lobby matches when it satisfies at least one Criterion.
_Avoid_: Rule, filter set

**Modifier**:
A game rule that OpenFront turns on for one lobby, such as Random Spawn, Doomsday Clock or Trusted.
_Avoid_: Option, setting

**Map Filter**:
The single list of required and blocked maps that applies to every Criterion.
_Avoid_: Map criterion
