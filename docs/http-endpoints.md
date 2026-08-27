---
id: http-endpoints
title: "HTTP Endpoints"
sidebar_label: "HTTP Endpoints"
sidebar_position: 7
description: "Shigola API endpoints"
---

Shigola serves one tile API: **[OGC API - Tiles](./ogc-api-tiles.md)**. Every route below belongs to
it, apart from `/metrics`.

> **The service root is the OGC landing page.** `/` returns JSON. An unknown path returns 404.

## Routes

| Path | Resource |
|:---|:---|
| `/` | Landing page — includes `shigolaVersion`, the build serving the request |
| `/api` | This service's OpenAPI 3.0 definition |
| `/conformance` | The conformance classes implemented |
| `/collections` | Every collection — one per map, plus one per layer |
| `/collections/{collectionId}` | One collection |
| `/collections/{collectionId}/tiles` | The collection's tilesets, one per scheme |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}` | Tileset metadata (`?f=tilejson` for TileJSON 3.0) |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}/{tileMatrix}/{tileRow}/{tileCol}` | A vector tile |
| `/tileMatrixSets` | The [tiling schemes](./tile-matrix-sets.md) served |
| `/tileMatrixSets/{tileMatrixSetId}` | One scheme's definition |
| `/metrics` | Prometheus metrics, when a Prometheus observer is configured. Cache metrics are listed under [Layered cache](./layered-cache.md#metrics). |

Full documentation on [OGC API - Tiles](./ogc-api-tiles.md), including content negotiation, caching
and the conformance classes declared.

### `GET` /collections/:collectionId/tiles/:tileMatrixSetId/:tileMatrix/:tileRow/:tileCol

Returns a vector tile.

**URL parameters**

- `:collectionId`: a map name from the Shigola [config](./configuration.md#maps) file, or
  `map:layer` for a single [layer](./configuration.md#map-layers) of that map.
- `:tileMatrixSetId`: the [tiling scheme](./tile-matrix-sets.md), e.g. `WebMercatorQuad`. A
  collection offers the schemes its map's [`tile_matrix_sets`](./tile-matrix-sets.md) names, or
  `WebMercatorQuad` if the key is omitted.
- `:tileMatrix`: the tile zoom.
- `:tileRow`: the tile **row**.
- `:tileCol`: the tile **column**.

Row before column, which is the OGC order. A tile holding no data at the requested zoom is an empty
tile, not a 404.

## Routes that no longer exist

:::warning

**The native `/maps/...` routes have been removed.** They are not deprecated — they are gone, and
return 404.

:::

| Was | Now |
|:---|:---|
| `/maps/:map/:z/:x/:y` | `/collections/:map/tiles/WebMercatorQuad/:z/:y/:x` |
| `/maps/:map/:layer/:z/:x/:y` | `/collections/:map:layer/tiles/WebMercatorQuad/:z/:y/:x` |
| `/maps/:map/style.json` | nothing — see below |
| `/capabilities`, `/capabilities/:map.json` | `/`, `/conformance`, `/collections`, and `?f=tilejson` on a tileset |

Two things to get right when moving a client across:

**Tile paths are z/y/x**, transposed from the native routes' z/x/y:

```
was    /maps/parks/3/5/2                                  z=3 x=5 y=2
now    /collections/parks/tiles/WebMercatorQuad/3/2/5     z=3 y=2 x=5   — the same tile
```

**Name the scheme.** The native routes served the map's default scheme and had nowhere to name
another. The OGC path always names one, so a client that relied on the default must say
`WebMercatorQuad`, or whichever scheme is first in the map's `tile_matrix_sets`.

### Shigola serves no style document

There is no replacement for `/maps/:map/style.json`, by decision rather than by omission. Styling is
a separate specification — OGC API - Styles — which Shigola does not implement, and the document it
used to generate guessed layer colours by hashing layer names.

A client brings its own style and points a vector source at a tileset's TileJSON:

```json
"sources": {
  "parks": {
    "type": "vector",
    "url": "http://localhost:8080/collections/parks/tiles/WebMercatorQuad?f=tilejson"
  }
}
```

### There is no `debug=true`

The query parameter that added tile-outline and tile-centre layers to any tile was honoured by the
native tile route only. See [Debugging](./debugging.md) for how to get the same layers now.
