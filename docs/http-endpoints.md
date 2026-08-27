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

Row before column, which is the OGC order — worth checking against a client that assumes `z/x/y`.
Every tile request names a scheme; there is no route that serves a map's default implicitly.

A tile holding no data at the requested zoom is an empty tile, not a 404.

## Shigola serves no style document

Styling is a separate specification — OGC API - Styles — which Shigola does not implement. A client
brings its own style and points a vector source at a tileset's TileJSON:

```json
"sources": {
  "parks": {
    "type": "vector",
    "url": "http://localhost:8080/collections/parks/tiles/WebMercatorQuad?f=tilejson"
  }
}
```
