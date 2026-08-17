---
id: http-endpoints
title: "HTTP Endpoints"
sidebar_label: "HTTP Endpoints"
sidebar_position: 7
description: "Tegola API endpoints"
---

This fork serves two tile APIs side by side. The **native** routes below are upstream Tegola's and
are unchanged. The **OGC API - Tiles** routes are added by
[this fork](./about-this-fork.md) and documented separately on
[OGC API - Tiles](./ogc-api-tiles.md).

> **The service root changed.** `/` is now the OGC landing page; the embedded viewer moved to
> `/viewer`. An unknown path returns 404, where upstream the viewer's catch-all answered everything.
> See [Upgrading](./ogc-api-tiles.md#upgrading--two-breaking-changes).

## Native routes

### `GET` /maps/:map/:z/:x/:y

Will return a vector tile from the provided `:map` at the provided `:z`, `:x` and `:y` values.

**URL parameters**

- `:map`: The name of the map as defined in the Tegola [config](./configuration.md#maps) file.
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

- `:map`: The name of the map as defined in the Tegola [config](./configuration.md#maps) file.
- `:layer`: The name of the maps layer, as defined in the Tegola [config](./configuration.md#map-layers) file.
- `:z`: The tile zoom.
- `:x`: The tile column.
- `:y`: The tile row.

### `GET` /capabilities

The `/capabilities` endpoint returns JSON with details about the running Tegola instance.

**Example response**

```json
{
  "version": "v0.6.1",
  "maps": [{
    "name": "bonn_osm",
    "uri": "/maps/bonn_osm",
    "layers": [{
        "name": "building",
        "uri": "/maps/bonn_osm/building",
        "minZoom": 14,
        "maxZoom": 20
      },{
        "name": "road",
        "uri": "/maps/bonn_osm/road",
        "minZoom": 10,
        "maxZoom": 20
      }]
  }]
}
```

### `GET` /capabilities/:map.json

Returns information about a map matching the [TileJSON 2.1 specification](https://github.com/mapbox/tilejson-spec/tree/master/2.1.0).

For the OGC equivalent — TileJSON 3.0, per collection and per tiling scheme — request
`/collections/{collectionId}/tiles/{tileMatrixSetId}?f=tilejson`.

**URL parameters**

- `:map`: The name of the map as defined in the Tegola [config](./configuration.md#maps) file.

**Example response**

```json
{
  "attribution": "Open Street Map",
  "bounds": [-180, -85.0511, 180, 85.0511],
  "center": [-76.275329586789, 39.153492567373, 8],
  "format": "pbf",
  "minzoom": 0,
  "maxzoom": 20,
  "name": "osm",
  "description": null,
  "scheme": "xyz",
  "tilejson": "2.1.0",
  "tiles": ["https://tegola-osm-demo.go-spatial.org/v1/maps/osm/{z}/{x}/{y}.pbf"],
  "grids": [],
  "data": [],
  "version": "1.0.0",
  "template": null,
  "legend": null,
  "vector_layers": [{
    "version": 2,
    "extent": 4096,
    "id": "populated_places",
    "name": "populated_places",
    "geometry_type": "point",
    "minzoom": 0,
    "maxzoom": 20,
    "tiles": ["https://tegola-osm-demo.go-spatial.org/v1/maps/osm/populated_places/{z}/{x}/{y}.pbf"]
  }, {
    "version": 2,
    "extent": 4096,
    "id": "country_lines",
    "name": "country_lines",
    "geometry_type": "line",
    "minzoom": 0,
    "maxzoom": 10,
    "tiles": ["https://tegola-osm-demo.go-spatial.org/v1/maps/osm/country_lines/{z}/{x}/{y}.pbf"]
  }]
}
```

### `GET` /maps/:map/style.json

Returns an automatically generated [Mapbox GL style](https://docs.mapbox.com/style-spec/) for the
map, used by the embedded viewer.

### `GET` /metrics

Prometheus metrics, when a Prometheus observer is configured. The cache metrics this fork adds are
listed under [Layered cache](./layered-cache.md#metrics).

### `GET` /viewer/

The embedded viewer. **Moved from `/` by this fork.** `/viewer` redirects to `/viewer/` — the
viewer's assets are referenced relatively and only resolve from a URL ending in a slash.

Excluded from the build with `-tags noViewer`.

## OGC API - Tiles routes

Added by this fork. Full documentation on
[OGC API - Tiles](./ogc-api-tiles.md).

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
