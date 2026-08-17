---
author: "NivGreenstein"
date: 2026-08-17
linktitle: Tile Matrix Sets
title: Tile Matrix Sets
weight: 5
subtitle: Serving more than one tiling scheme
menu:
  main:
    parent: Documentation
---

> Added by [this fork]({{< ref "/documentation/about-this-fork" >}}). Upstream Tegola serves one
> tiling scheme, WebMercatorQuad, and has no way to name it or ask for another.

## What a tile matrix set is

A **tile matrix set** — OGC's name for a tiling scheme — defines, for every zoom level, the
coordinate reference system, how many columns and rows the world is cut into, and where the origin
sits. Two servers agree on what `10/511/340` means only if they agree on the scheme.

Upstream Tegola has one scheme baked in, with the Web Mercator grid hardcoded in the tile pipeline.
This fork carries the OGC register of tile matrix sets as data, resolves grids through a registry, and
lets each map declare which schemes it may be requested in.

## The schemes this build serves

Three, and they are the three whose tile ↔ coordinate conversions are closed-form arithmetic over
WGS 84 — no PROJ backend, no cgo:

| tileMatrixSetId | CRS | Axis order | Matrix at zoom z | Zooms |
|:---|:---|:---|:---|:---|
| `WebMercatorQuad` | EPSG:3857 | easting, northing | 2^z × 2^z | 0–24 |
| `WorldCRS84Quad` | OGC:CRS84 | longitude, latitude | 2·2^z × 2^z | 0–23 |
| `WGS1984Quad` | EPSG:4326 | latitude, longitude | 2·2^z × 2^z | 0–23 |

`WebMercatorQuad` is the familiar one: square matrix, square tiles, the scheme every web map slippy
URL assumes. It is the default.

`WorldCRS84Quad` and `WGS1984Quad` are geographic. Their matrix is **twice as wide as it is tall** —
at zoom 0 there are two tiles, not one — because 360° of longitude is covered at the same tile size
as 180° of latitude. The two differ only in the CRS they declare and therefore in axis order:
`WorldCRS84Quad` uses OGC:CRS84, which is explicitly longitude/latitude; `WGS1984Quad` uses
EPSG:4326, whose authoritative axis order is latitude/longitude. Both index the same ground with the
same matrix shape.

**A `z/x/y` in one scheme is different ground in another.** This is not a subtlety you can ignore —
it is why the [cache key changed]({{< ref "/documentation/layered-cache" >}}) and why the tile row
and column are validated separately.

### Schemes that ship but are not served

The build bundles all thirteen tile matrix sets from the OGC register, and `/tileMatrixSets` lists
only the ones it can actually serve. The other ten are registered and report precisely why they are
unavailable rather than silently going missing:

| Scheme | Why it is not served |
|:---|:---|
| `WorldMercatorWGS84Quad`, `CanadianNAD83_LCC`, `EuropeanETRS89_LAEAQuad`, `NZTM2000Quad`, `UTM31WGS84Quad`, `UPSArcticWGS84Quad`, `UPSAntarcticWGS84Quad`, `LINZAntarticaMapTilegrid` | Needs a coordinate transformation backend this build does not wire up. |
| `GNOSISGlobalGrid`, `CDB1GlobalGrid` | Variable-width tile matrices — these grids coalesce columns near the poles, and the tile pipeline assumes one column index maps to one matrix column. |

Naming an unavailable scheme in a config is a startup error that lists what is available, not a
silent fallback.

## Configuring a map's schemes

`tile_matrix_sets` is set **per map**, not per layer or per provider. It is optional: a config that
never mentions it behaves exactly as it did on upstream Tegola.

```toml
[[maps]]
name = "parks"
# The tiling schemes this map may be requested in.
# The FIRST entry is the map's default — the scheme its native /maps/... routes serve.
# Omit the key entirely to offer every scheme this build serves.
tile_matrix_sets = ["WebMercatorQuad", "WorldCRS84Quad"]
```

- Omitted → every scheme the build serves.
- The first entry is the default, and is what `/maps/{map}/{z}/{x}/{y}` returns.
- A map's layer-collections offer exactly the schemes their map does.

### Why a scheme id and not an SRID

A tiling scheme is named by its `tileMatrixSetId`, not by the SRID of its CRS, because an SRID cannot
identify one: `WorldCRS84Quad` and `WGS1984Quad` are both EPSG:4326, so "4326" names two schemes. The
id is what OGC uses, and it is what appears in tile URLs, cache keys and `/tileMatrixSets`.

Where an SRID still has to be interpreted — an internal caller that only knows a projection — 3857
resolves to `WebMercatorQuad` and 4326 to `WorldCRS84Quad`.

**Changing a map's schemes changes its cache keys.** Purge and re-seed the affected maps; see
[Cache Seeding and Purging]({{< ref "/documentation/cache-seeding-and-purging" >}}).

## Where schemes show up

- **`/tileMatrixSets`** lists every servable scheme; `/tileMatrixSets/{id}` returns its full OGC
  definition, verbatim from the bundled register. See
  [OGC API - Tiles]({{< ref "/documentation/ogc-api-tiles" >}}).
- **Tile URLs** carry the scheme on OGC routes:
  `/collections/{collectionId}/tiles/{tileMatrixSetId}/{tileMatrix}/{tileRow}/{tileCol}`. The native
  `/maps/...` routes have nowhere to put it and serve the map's default.
- **Cache keys** begin with it: `{tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}`.
- **`cache seed` / `cache purge`** take `--tile-matrix-set`; one run covers one scheme.

## Credit

The `tms` package is a faithful Go port of
[developmentseed/morecantile](https://github.com/developmentseed/morecantile) 7.0.3 (MIT © Development
Seed) — its document model, tile algorithms, the thirteen bundled grid definitions, and its test
suite, which serves as the port's correctness oracle. See
[About this fork]({{< ref "/documentation/about-this-fork" >}}).
