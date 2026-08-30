---
id: about
title: "About Shigola"
sidebar_label: "About Shigola"
sidebar_position: 2
description: "What Shigola is and what it serves"
---

Shigola is a vector tile server written in Go. It reads geospatial data from PostGIS and serves it
as [Mapbox Vector Tiles](https://github.com/mapbox/vector-tile-spec), over a standards-compliant
[OGC API - Tiles](./ogc-api-tiles.md) surface.

Source: **[MapColonies/shigola](https://github.com/MapColonies/shigola)**.

## What it serves

### OGC API - Tiles

An [OGC API - Tiles](https://ogcapi.ogc.org/tiles/) surface — landing page, conformance declaration,
collections, tilesets, tiles and tiling-scheme definitions. Verified against the official OGC CITE
executable test suite.

See [OGC API - Tiles](./ogc-api-tiles.md).

### Multiple tile matrix sets

Shigola carries the OGC register of tile matrix sets as data and serves three of them —
`WebMercatorQuad`, `WorldCRS84Quad` and `WGS1984Quad` — selectable per map with `tile_matrix_sets`.

See [Tile matrix sets](./tile-matrix-sets.md).

### Layered cache

`type = "multi"` puts an ordered chain of cache backends behind the single `[cache]` table: reads
walk the tiers and promote a hit, writes fan out, and no user response waits on a cache write.

See [Layered cache](./layered-cache.md).

## What it does not serve

Shigola is a fork of Tegola, but not a superset of it. It removes more than it adds, and what it
removes was removed on purpose — this is a server aimed at one job, not a general-purpose Tegola.
If you are arriving from [tegola.io](https://tegola.io), these are gone:

| Removed | Instead |
|:---|:---|
| The built-in map viewer | Nothing. Point your own client at the tile endpoints. |
| The native `/maps/...` tile routes | [OGC API - Tiles](./ogc-api-tiles.md) is the only tile surface, and `/` is its landing page. |
| The GeoPackage and SAP HANA providers | PostGIS. A config naming `gpkg` or `hana` is rejected at startup. |
| The `postgis` provider type | `mvt_postgis`, which encodes the tile in the database with `ST_AsMVT`. A config naming `postgis` is rejected at startup with a message saying so. |

Everything Shigola kept behaves as Tegola's does unless this site says otherwise, and the [official
Tegola docs](https://tegola.io) remain the reference for it.

## Behaviour worth knowing

Three things commonly surprise people setting Shigola up for the first time:

| | |
|:---|:---|
| **The service root is the OGC landing page.** | `/` returns JSON. An unknown path returns 404. |
| **Cache keys begin with the tiling scheme.** | The key is `{tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}`. Without the scheme, tiles cut in two different schemes would collide at the same `z/x/y`. |
| **Cache writes do not block the response.** | Every cache, chained or not, hands its write to a bounded pool after the response is flushed. See [Layered cache](./layered-cache.md#writes-do-not-block-the-response). |

## Credits

- **Tegola** — Shigola is a fork of
  [go-spatial/tegola](https://github.com/go-spatial/tegola), an open source vector tile server
  created and maintained by the **[Go Spatial](https://github.com/go-spatial) team** and documented
  at [tegola.io](https://tegola.io). Effectively all of this codebase is their work: the providers,
  the geometry processing, the MVT encoder and the tile pipeline all originate there.
  Tegola is MIT licensed, Shigola keeps that licence and retains its copyright notice, and all
  credit for what Shigola inherited belongs upstream.
- **morecantile** — Shigola's `tms` package is a faithful Go port of
  [developmentseed/morecantile](https://github.com/developmentseed/morecantile) 7.0.3, MIT licensed
  © Development Seed. Its document model, tile algorithms, bundled grid definitions and test suite
  were all translated, and morecantile's golden values act as the port's correctness oracle. The
  license is reproduced in the source tree at `tms/LICENSE-morecantile`.
- **OGC API - Tiles** is a standard of the [Open Geospatial Consortium](https://www.ogc.org/).
  Conformance is verified with OGC's own [CITE](https://cite.opengeospatial.org/) test suite.
