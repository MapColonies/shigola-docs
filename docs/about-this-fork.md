---
id: about-this-fork
title: "About Shigola"
sidebar_label: "About Shigola"
sidebar_position: 2
description: "What this is, what it adds, and who made Tegola"
---

## This is a fork of Tegola

[Tegola](https://github.com/go-spatial/tegola) is an open source vector tile server written in Go,
created and maintained by the **[Go Spatial](https://github.com/go-spatial) team**. It is MIT
licensed, its documentation lives at [tegola.io](https://tegola.io), and everything good about the
software described on this site comes from that project.

**These docs are not the official Tegola documentation.** They describe
[MapColonies/shigola](https://github.com/MapColonies/shigola), a fork that adds three things
upstream Tegola does not have. For anything not listed on this page, upstream behaviour and
[the official docs](https://tegola.io) apply — this fork is additive by design, and the native
`/maps/...` routes serve the same tiles they always did.

If you are looking for Tegola itself, go to **[tegola.io](https://tegola.io)**.

## What the fork adds

### 1. OGC API - Tiles

An [OGC API - Tiles](https://ogcapi.ogc.org/tiles/) surface — landing page, conformance declaration,
collections, tilesets, tiles and tiling-scheme definitions — served alongside the native routes.
Verified against the official OGC CITE executable test suite.

See [OGC API - Tiles](./ogc-api-tiles.md).

### 2. Multiple tile matrix sets

Upstream Tegola serves one implicit tiling scheme: WebMercatorQuad. This fork carries the full OGC
register of tile matrix sets and serves three of them — `WebMercatorQuad`, `WorldCRS84Quad` and
`WGS1984Quad` — selectable per map.

See [Tile matrix sets](./tile-matrix-sets.md).

### 3. Layered cache

`type = "multi"` puts an ordered chain of cache backends behind the single `[cache]` table: reads
walk the tiers and promote a hit, writes fan out, and no user response waits on a cache write.

See [Layered cache](./layered-cache.md).

## Breaking changes from upstream

Two. Each is here because there was no additive way to do it.

| Change | What breaks |
|:---|:---|
| The embedded viewer moved from `/` to `/viewer` | OGC API - Tiles requires a landing page at the service root. Bookmarks, reverse-proxy rules and health checks pointing at `/` now get JSON. An unknown path now returns 404, where the viewer's catch-all used to answer everything. |
| Cache keys gained a leading `{tileMatrixSetId}` | Existing cache entries are unreachable. **Purge and re-seed.** |

Everything else is additive. `tile_matrix_sets` is a **new optional key**, not a replacement for
anything you have: an upstream config that never set it keeps serving WebMercatorQuad exactly as
before.

There is also one behaviour change that breaks nothing but is worth knowing: cache writes no longer
block the response, in single-backend deployments as well as chained ones. See
[Layered cache](./layered-cache.md#writes-do-not-block-the-response).

Details are on the pages linked above.

## Attribution and licensing

- **Tegola** — © the [Go Spatial](https://github.com/go-spatial) team, [MIT
  licensed](https://github.com/go-spatial/tegola/blob/master/LICENSE.md). This fork keeps that
  license, keeps upstream's copyright notices, and is a derivative work of it. Bug reports about
  behaviour this fork did not change belong
  [upstream](https://github.com/go-spatial/tegola/issues).
- **morecantile** — the fork's `tms` package is a faithful Go port of
  [developmentseed/morecantile](https://github.com/developmentseed/morecantile) 7.0.3, MIT licensed
  © Development Seed. Its document model, tile algorithms, bundled grid definitions and test suite
  were all translated, and morecantile's golden values act as the port's correctness oracle. The
  license is reproduced in the fork at `tms/LICENSE-morecantile`.
- **OGC API - Tiles** is a standard of the [Open Geospatial Consortium](https://www.ogc.org/).
  Conformance is verified with OGC's own [CITE](https://cite.opengeospatial.org/) test suite.

## Contributing upstream

Where a change in this fork is generally useful, it belongs upstream. Upstream pull requests are
based on the **release-candidate branch** named for the next version, not `master`; `master` tracks
the last stable release. See
[CONTRIBUTING.md](https://github.com/go-spatial/tegola/blob/master/CONTRIBUTING.md).
