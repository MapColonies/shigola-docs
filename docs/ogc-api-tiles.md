---
id: ogc-api-tiles
title: "OGC API - Tiles"
sidebar_label: "OGC API - Tiles"
sidebar_position: 6
description: "A standards-compliant tile API alongside the native routes"
---

Shigola serves [OGC API - Tiles](https://ogcapi.ogc.org/tiles/) for vector (Mapbox Vector Tile)
data, alongside its native [`/maps/...` routes](./http-endpoints.md). A tile fetched either way is
the same bytes from the same cache entry.

## Two things to know before deploying

### The service root is the landing page

OGC API - Tiles requires a landing page at the service root, so `/` returns JSON and the embedded
viewer is served from `/viewer`. `/viewer` redirects to `/viewer/` — the viewer's assets are
referenced relatively and only resolve from a URL ending in a slash. Point bookmarks, reverse-proxy
rules and health checks accordingly. An unknown path returns 404.

### Cache keys begin with the tiling scheme

```
{tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}
```

Without the scheme, tiles cut in two schemes collide: WorldCRS84Quad's matrix is twice as wide as
WebMercatorQuad's, so the same `z/x/y` names different ground in each, and one scheme's tiles would
be served for the other's.

If a map's `tile_matrix_sets` changes, its existing entries become unreachable — nothing reads the
old keys. Purge and re-seed:

```sh
shigola cache purge --config=config.toml --bounds=-180,-85.0511,180,85.0511 --max-zoom=…
shigola cache seed  --config=config.toml --bounds=-180,-85.0511,180,85.0511 --max-zoom=…
```

For a file or S3 cache, deleting the old directory tree is faster than purging tile by tile.

## Endpoints

| Path | Resource |
|:---|:---|
| `/` | Landing page |
| `/api` | This service's OpenAPI 3.0 definition |
| `/conformance` | The conformance classes implemented |
| `/collections` | Every collection |
| `/collections/{collectionId}` | One collection |
| `/collections/{collectionId}/tiles` | The collection's tilesets, one per scheme |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}` | Tileset metadata (`?f=tilejson` for TileJSON 3.0) |
| `/collections/{collectionId}/tiles/{tileMatrixSetId}/{tileMatrix}/{tileRow}/{tileCol}` | A vector tile |
| `/tileMatrixSets` | The [tiling schemes](./tile-matrix-sets.md) served |
| `/tileMatrixSets/{tileMatrixSetId}` | One scheme's definition |

Behind a reverse proxy, `uri_prefix` applies to these routes as it does to the native ones, and every
link and URI template the service emits carries the prefix it was reached on.

## Collections

Every map is a collection, and so is every layer of every map:

```
parks           the whole map — tiles carry all its layers
parks:trees     one layer — tiles carry only that layer
```

The map-collection is always published, even for a single-layer map, so a map name is always a usable
collection id.

The separator is `:` rather than `/`, `.` or `_`: a slash would make the id look like two path
segments, and a dot or underscore can occur in a Shigola map or layer name, which would make the split
ambiguous.

## Tile paths are z/y/x

OGC orders a tile path `{tileMatrix}/{tileRow}/{tileCol}` — zoom, **row**, then **column**. This is
transposed from Shigola's native `/maps/{map}/{z}/{x}/{y}`, which is zoom, column, row.

```
/maps/parks/3/5/2                                  z=3 x=5 y=2
/collections/parks/tiles/WebMercatorQuad/3/2/5     z=3 y=2 x=5   — the same tile
```

Rows and columns are validated separately, so a transposed request is rejected rather than served as
a different tile — in WorldCRS84Quad at z1 there are four columns but only two rows.

## Content negotiation

`?f=` selects a representation and overrides `Accept`. An unrecognised `f` is a **400**, not a
fallback, so a typo does not quietly return something else. An `Accept` header naming only types this
service cannot produce gets the default representation, which is what a browser receives.

| Resource | Accepted `f` |
|:---|:---|
| a tile | `mvt`, or `pbf` for the same thing |
| tileset metadata | `json` (default), `tilejson` |
| everything else | `json` |

`mvt` is canonical: it is what every link and template this service emits says, and it is the name in
the OGC conformance class. `pbf` is accepted because that is what the same tile is called by Shigola's
native routes, which serve it at a `.pbf` extension, and by the `format` member of the TileJSON —
being refused for using Shigola's own word for it would be surprising. Matching ignores case. The
alias resolves to MVT before a resource's own formats are consulted, so `?f=pbf` on a JSON-only
resource is still a 400.

## Caching

OGC tile requests use the same cache keys as the native routes, so a tile seeded through
`shigola cache seed` is served by both and neither generates it twice. The key is
`{tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}` — it does not include the query string, so every
spelling of `?f=` shares one entry rather than storing the same bytes twice.

A tile request carrying any **other** query parameter is served **uncached**: the key cannot describe
it, and a Shigola map can declare query parameters that change what a tile contains. The native routes
take the same position more bluntly, skipping the cache for any query string at all.

## Conformance

`/conformance` declares:

```
http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core
http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/landingPage
http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections
http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/json
http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/oas30
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/core
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/tileset
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/tilesets-list
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/mvt
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/geodata-tilesets
http://www.opengis.net/spec/ogcapi-tiles-1/1.0/conf/oas30
```

**Verified against the OGC CITE suite** (`ets-ogcapi-tiles10` 1.2, via TeamEngine), serving the
Athens OSM GeoPackage from the repository's own test data:

```
15 passed · 0 failed · 1 skipped     WebMercatorQuad
15 passed · 0 failed · 1 skipped     WorldCRS84Quad
```

The skip is `.../conf/dataset-tilesets`, which this service does not implement and does not declare —
tilesets are per collection, not for the dataset as a whole.

Responses are also validated against the OGC schemas the standard points at, which CITE does not
check exhaustively: tileset metadata against
[`tms/2.0/json/tileSet.json`](https://schemas.opengis.net/tms/2.0/json/tileSet.json), and the tilesets
list against the schema embedded in Requirement 10 C. Both validate with no errors.

### Running CITE yourself

CI runs the suite on both schemes — weekly and on demand, since the suite is versioned separately
from the server and a passing implementation can start failing without a commit. To reproduce a run
locally, from the repository root:

```sh
go build -o /tmp/shigola ./cmd/shigola      # CGO_ENABLED=1: the fixture data is a GeoPackage
/tmp/shigola serve --config .github/cite/config.toml --port ":8081" &
.github/cite/run.sh WebMercatorQuad 14 6324 9271
```

Two things about this suite are worth knowing before you blame the server:

1. **Six of its arguments are test inputs it does not discover for itself** —
   `tilematrixsetdefinitionuri`, `urltemplatefortiles`, `tilematrix`, and the row and column bounds.
   Omit them and three `MandatoryCore` tests fail with *"A tile matrix set definition uri was not
   found in the test inputs"*, which reads like a defect in the service and is not one.
2. **The EARL report it returns has no summary line.** A run that reached nothing at all looks
   identical to a clean pass unless you count the `earl:outcome` values. The bundled runner enforces a
   minimum pass count for exactly this reason.

Pick a row and column inside the tileset's own `tileMatrixSetLimits`, so the run exercises the
content checks against a tile that actually holds data.

The manual equivalent, with TeamEngine and the server as containers on one Docker network:

```sh
docker network create cite-net

# 1. the tile server, serving a map with data
docker run -d --name cite-shigola --network cite-net \
  -v "$PWD/citedata:/data" -w /data --entrypoint /data/shigola \
  shigola-dev:latest serve --config /data/config.toml

# 2. TeamEngine with the OGC API - Tiles suite
docker run -d --name cite-te --network cite-net -p 8888:8080 ogccite/ets-ogcapi-tiles10

# 3. run the suite. Credentials are ogctest/ogctest.
curl -u ogctest:ogctest -G \
  --data-urlencode "iut=http://cite-shigola:8080/" \
  --data-urlencode "noofcollections=-1" \
  --data-urlencode "tilematrixsetdefinitionuri=http://www.opengis.net/def/tilematrixset/OGC/1.0/WebMercatorQuad" \
  --data-urlencode "urltemplatefortiles=http://cite-shigola:8080/collections/athens/tiles/WebMercatorQuad/{tileMatrix}/{tileRow}/{tileCol}" \
  --data-urlencode "tilematrix=14" \
  --data-urlencode "mintilerow=6324" --data-urlencode "maxtilerow=6324" \
  --data-urlencode "mintilecol=9271" --data-urlencode "maxtilecol=9271" \
  http://localhost:8888/teamengine/rest/suites/ogcapi-tiles-1.0/run
```

## Credit

OGC API - Tiles is a standard of the [Open Geospatial Consortium](https://www.ogc.org/), and
conformance is verified with OGC's own [CITE](https://cite.opengeospatial.org/) executable test
suite.
