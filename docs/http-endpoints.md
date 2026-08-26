---
id: http-endpoints
title: "HTTP Endpoints"
sidebar_label: "HTTP Endpoints"
sidebar_position: 7
description: "Shigola API endpoints"
---

Shigola serves two tile APIs side by side: the **native** routes below, and an
**[OGC API - Tiles](./ogc-api-tiles.md)** surface documented separately.

> **The service root is the OGC landing page.** `/` returns JSON. An unknown path returns 404.

## Native routes

### `GET` /maps/:map/:z/:x/:y

Will return a vector tile from the provided `:map` at the provided `:z`, `:x` and `:y` values.

**URL parameters**

- `:map`: The name of the map as defined in the Shigola [config](./configuration.md#maps) file.
- `:z`: The tile zoom.
- `:x`: The tile column.
- `:y`: The tile row.

The tile is cut in the map's **default tile matrix set** — the first entry of its
[`tile_matrix_sets`](./tile-matrix-sets.md), or `WebMercatorQuad` if the key
is omitted. These routes have nowhere to name a scheme; use the OGC tile route to request another one.

### `GET` /maps/:map/:layer/:z/:x/:y

Will return a vector tile with a single `:layer` from the provided `:map` at the provided `:z`, `:x`
and `:y` values.

**URL parameters**

- `:map`: The name of the map as defined in the Shigola [config](./configuration.md#maps) file.
- `:layer`: The name of the maps layer, as defined in the Shigola [config](./configuration.md#map-layers) file.
- `:z`: The tile zoom.
- `:x`: The tile column.
- `:y`: The tile row.

:::note

The non-standard `/capabilities` and `/capabilities/:map.json` endpoints have been removed. Service
discovery is the [landing page](./ogc-api-tiles.md), `/conformance` and `/collections`; a map's
TileJSON is `/collections/{collectionId}/tiles/{tileMatrixSetId}?f=tilejson`, which serves TileJSON
3.0 per tiling scheme.

:::

### `GET` /maps/:map/style.json

Returns an automatically generated [Mapbox GL style](https://docs.mapbox.com/style-spec/) for the
map, for a client to load directly.

### `GET` /metrics

Prometheus metrics, when a Prometheus observer is configured. Cache metrics are listed under
[Layered cache](./layered-cache.md#metrics).

## OGC API - Tiles routes

Full documentation on [OGC API - Tiles](./ogc-api-tiles.md).

| Path | Resource |
|:---|:---|
| `/` | Landing page |
| `/api` | This service's OpenAPI 3.0 definition |
| `/conformance` | The conformance classes implemented |
| `/collections` | Every collection — one per map, plus one per layer |
| `/collections/{collectionId}` | One collection |
| `/collections/{collectionId}/tiles` | The collection's tilesets, one per scheme |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}` | Tileset metadata (`?f=tilejson` for TileJSON 3.0) |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}/{tileMatrix}/{tileRow}/{tileCol}` | A vector tile |
| `/tileMatrixSets` | The [tiling schemes](./tile-matrix-sets.md) served |
| `/tileMatrixSets/{tileMatrixSetId}` | One scheme's definition |

**OGC tile paths are z/y/x**, transposed from the native routes' z/x/y:

```
/maps/parks/3/5/2                                  z=3 x=5 y=2
/collections/parks/tiles/WebMercatorQuad/3/2/5     z=3 y=2 x=5   — the same tile
```
