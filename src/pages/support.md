---
title: Support
description: Where to ask for help with Shigola
---

# Support

## Issues

Bug reports and feature requests go to
**[MapColonies/shigola](https://github.com/MapColonies/shigola/issues)**.

A good report includes the Shigola version (`shigola version`), the relevant part of your config
file, and — for a rendering problem — the data and the tile coordinates that show it.

Issues with **these docs** go to
[MapColonies/shigola-docs](https://github.com/MapColonies/shigola-docs/issues).

## Before opening one

Most problems fall into a handful of shapes the docs already cover:

- **A tile is empty or the wrong shape.** Check the layer's `min_zoom`/`max_zoom`, and turn on
  [SQL debugging](/documentation/debugging) to see the query that actually ran.
- **The cache is not being read.** See
  [Cache is not being read](/documentation/debugging#cache-is-not-being-read) — a key format change
  and a failing tier both present as a cache that never hits.
- **`/` returns JSON.** That is the [OGC landing page](/documentation/ogc-api-tiles). To see the
  tiles on a map, point a client at them, as the [tutorials](/tutorials) do.
- **A config key seems to be ignored.** Unknown keys are not rejected, so a typo is silent — check
  the spelling against [Configuration](/documentation/configuration).

## No support commitment

Shigola is provided as-is under the MIT licence. There is no commercial support offering and no
service-level commitment attached to it.
