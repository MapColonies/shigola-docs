---
id: configuration
title: "Shigola Configuration"
sidebar_label: "Configuration"
sidebar_position: 4
description: "Configure Tegola to process your geospatial data"
---

## Overview

The Tegola config file uses [TOML](https://github.com/toml-lang/toml) syntax with additional support for [environment variables](#env-var). It is comprised of five primary sections:

- [Global](#global): global options
- [Webserver](#webserver): webserver configuration.
- [Providers](#providers): data provider configuration (i.e. PostGIS).
- [Maps](#maps): map configuration including map names, layers and zoom levels.
- [Cache](#cache): cache configurations.

> **Fork additions.** [This fork](./about-this-fork.md) adds two things to
> this file, both optional — a config written for upstream Tegola works unchanged:
>
> - A map may name the tiling schemes it serves with [`tile_matrix_sets`](#tile-matrix-sets).
> - `[cache]` gains `type = "multi"` for a [layered cache](#layered-cache), and `timeout_ms` on any
>   cache.

## Global

Unlike the other sections, global config options do not have `[[]]` heading.

| Param            | Requered     | Default      | Description                                           |
|------------------|:-------------|:-------------|:------------------------------------------------------|
| tile_buffer      | No           | 64           | The number of pixels to extend a tile's clipping area |

## Webserver

The webserver part of the config has the following parameters:

| Param                 | Required |  Default                    | Description                                                                    |
|-----------------------|:---------|:----------------------------|:-------------------------------------------------------------------------------|
| port                  | No       | :8080                       | A string with the value for port.                                              |
| hostname              | No       | HTTP Hostname in request    | Set the hostname used to generate URLs for JSON based responses.               |
| uri_prefix            | No       |                             | A prefix to add to all API routes. This is useful when tegola is behind a proxy (i.e. example.com/tegola). The prefix will be added to all URLs included in the capabilities endpoint responses.|


### Headers

Allows tegola to respond to tile request with user defined headers. Default [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers values:

| Header                       | Default        |
|------------------------------|:---------------|
| Access-Control-Allow-Origin  | "*"            |
| Access-Control-Allow-Methods | "GET, OPTIONS" |


**Example Webserver config**

```toml
[webserver]
port = ":8080"
hostname = "tiles.example.com"

  [webserver.headers]
  # redefine default cors origin
  Access-Control-Allow-Origin = "http://map.example.com"

  # define CDN max age
  Cache-Control = "s-maxage=300"
```

## Providers

The providers configuration tells Tegola where your data lives. Data providers each have their own specific configuration, but all are required to have the following two config params:

| Param    | Description                                                                                |
|:---------|:-------------------------------------------------------------------------------------------|
| name     | User defined data provider name. This is used by map layers to reference the data provider.|
| type     | The type of data provider. (i.e. "postgis", "mvt_postgis")                                                |


### PostGIS & MVT_PostGIS

:::warning

**`postgis` distorts polygons — known bug.** The native `postgis` provider returns distorted
polygon and multipolygon geometries:
[go-spatial/tegola#1104](https://github.com/go-spatial/tegola/issues/1104#issuecomment-4671741621).
Serving the same table through `mvt_postgis` renders it correctly, so the fault is in the native
provider's geometry path, not in your data.

**If your layers include polygons, use [`mvt_postgis`](#mvt_postgis).** It is the workaround, and it
is what the [full config example](#full-config-example) below uses.

:::

Load data from a Postgres/PostGIS database. In addition to the required `name` and `type` parameters, a PostGIS data provider supports the following parameters:

| Param               | Required |  Default | Description                                        |
|:--------------------|:---------|:---------|:---------------------------------------------------|
| uri                 | Yes      |          | The database connection string.                    |
| srid                | No       | 3857     | The default SRID for this data provider            |

**Example**

```
# {protocol}://{user}:{password}@{host}:{port}/{database}?{options}=

postgres://tegola:supersecret@localhost:5432/tegola?sslmode=prefer&pool_max_conns=10
```

**Options**

- `sslmode`: [Optional] PostGIS SSL mode. Default: "prefer"
- `pool_max_conns`: [Optional] The max connections to maintain in the connection pool. Defaults to 100. 0 means no max.
- `pool_min_conns`: [Optional] The min connections to maintain in the connection pool. Defaults to 0. 0 mean there are no open connections in the pool if not needed.
- `pool_max_conn_idle_time`: [Optional] The maximum time an idle connection is kept alive. Defaults to "30m".
- `pool_max_conn_lifetime` [Optional] The maximum time a connection lives before it is terminated and recreated. Defaults to "1h".
- `pool_health_check_period` [Optional] Time in between health checks. Defaults to "1m".

**Example PostGIS Provider config**

```toml
[[providers]]
name = "test_postgis"       # provider name is referenced from map layers (required)
type = "postgis"            # the type of data provider must be "postgis" for this data provider (required)

uri = "postgres://tegola:supersecret@localhost:5432/tegola?sslmode=prefer" # PostGIS connection string (required)
srid = 3857             # The default srid for this provider. If not provided it will be WebMercator (3857)
```

### GeoPackage

Load data from a [GeoPackage](http://www.geopackage.org) database. The GeoPackage provider requires that Tegola is built with CGO. You can [find prebuilt CGO binaries on GitHub](https://github.com/go-spatial/tegola/releases).

In addition to the required `name` and `type` parameters, a GeoPackage data provider has the following
additional params:

| Param    | Required |  Default | Description                                                         |
|:---------|:---------|:---------|:--------------------------------------------------------------------|
| filepath | Yes      |          | The system file path to the GeoPackage you wish to connect to.      |

**Example GeoPackage Provider config**

```toml
[[providers]]
name = "sample_gpkg"
type = "gpkg"
filepath = "/path/to/my/sample_gpkg.gpkg"
```


## Provider Layers

Provider Layers are referenced by [Map Layers](#map-layers) using the dot syntax `provder_name.provider_layer_name` (i.e. `my_postgis.rivers`). Provider Layers are required to have a `name` and will typically have additional parameters which are specific to that Provider. A Provider Layer has the following top level configuration parameters:

| Param              | Required | Description                                       |
|:-------------------|:---------|:--------------------------------------------------|
| name               | Yes      | The name that will be referenced from a map layer.|


### PostGIS

PostGIS Provider Layers define how Tegola will fetch data for a layer from a [PostGIS](#postgis) Provider. The configuration requires either `tablename` or `sql` to be defined, but not both. The PostGIS Provider Layer has the following configuration parameters:

| Param              | Required |  Default | Description                                                      |
|:-------------------|:---------|:---------|:-----------------------------------------------------------------|
| **tablename**      | Yes*     |          | The name of the database table to query                          |
| **sql**            | Yes*     |          | Custom SQL. Requires a `!BBOX!` token                            |
| geometry_fieldname | No       | geom     | The name of the geometry field in the table                      |
| id_fieldname       | No       | gid      | The name of the feature ID field in the table. Only positive integer IDs are supported. |
| srid               | No       | 3857     | The SRID for the table. Can be 3857 or 4326.                     |
| fields             | No       |          | Fields to include as tag values. Useful when using **tablename** |
| geometry_type      | No       |          | The layer geometry type. If not set, the table will be inspected at startup to try and infer the geometry type. Valid values are: `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, `GeometryCollection`. |


&#42; Either `tablename` or `sql` is required, but not both.


#### Supported SQL Tokens

The `sql` configuration supports the following tokens

| Token               | Required | Description                                                      |
|:--------------------|:---------|:-----------------------------------------------------------------|
| !BBOX!              | Yes      | Will be replaced with the bounding box of the tile before the query is sent to the database. !bbox! and !BOX! are supported as well for compatibility with queries from Mapnik and MapServer styles. |
| !ZOOM!              | No       | Will be replaced with the "Z" (zoom) value of the requested tile.|
| !SCALE_DENOMINATOR! | No       | Scale denominator, assuming 90.7 DPI (i.e. 0.28mm pixel size)    |
| !PIXEL_WIDTH!       | No       | The pixel width in meters, assuming 256x256 tiles.               |
| !PIXEL_HEIGHT!      | No       | The pixel height in meters, assuming 256x256 tiles.              |
| !ID_FIELD!          | No       | The id field name.                                               |
| !GEOM_FIELD!        | No       | The geom field name.                                             |
| !GEOM_TYPE!         | No       | The geom type if defined otherwise.              |


**Example minimum Provider Layer config with `tablename` defined**

```toml
[[providers.layers]]
name = "landuse"
# this table uses 'geom' for the geometry_fieldname and 'gid' for the id_fieldname (the defaults)
tablename = "gis.zoning_base_3857"
```

**Example minimum Provider Layer config with `sql` defined**

```toml
[[providers.layers]]
name = "landuse"
# note that the geometry field is wrapped in ST_AsBinary() and the use of the required !BBOX! token
sql = "SELECT gid, ST_AsBinary(geom) AS geom FROM gis.rivers WHERE geom && !BBOX!"
```

### MVT_PostGIS

The PostGIS MVT provider (`mvt_postgis`) manages querying for tile requests against a Postgres database (version 12+) with the [PostGIS](http://postgis.net/)(version 3.0+) extension installed and leverages [ST_AsMVT](https://postgis.net/docs/ST_AsMVT.html) to handle the MVT encoding at the database.

When using the PostGIS MVT Provider the `ST_AsMVTGeom()` MUST be used. The MVT provider otherwise shares connection options, SQL tokens and layer configuration with the PostGIS Provider.

**Example mvt_postgis and map config**

```toml
[[providers.layers]]
name = "landuse"
# MVT data provider must use SQL statements
# this table uses "geom" for the geometry_fieldname and "gid" for the id_fieldname so they don't need to be configured
# Wrapping the geom with ST_AsMVTGeom is required. 
sql = "SELECT ST_AsMVTGeom(geom,!BBOX!) AS geom, gid FROM gis.landuse WHERE geom && !BBOX!"
```

### GeoPackage

| Param              | Required |  Default | Description                                                                        |
|:-------------------|:---------|:---------|:-----------------------------------------------------------------------------------|
| **tablename**      | Yes*     |          | The name of the database table to query against.                                   |
| **sql**            | Yes*     |          | Custom SQL to use. Requires a `!BBOX!` token.                                      |
| id_fieldname       | No       | `fid`    | The name of the feature id field. Only positive integer IDs are supported         |
| fields             | No       |          | A list of fields (column names) to include as feature tags when using **tablename**.|

&#42; Either `tablename` or `sql` is required, but not both.

When using the **sql** param with GeoPackage:

- You must join your feature table to the spatial index table: i.e. `JOIN feature_table ft rtree_feature_table_geom si ON ft.fid = rt.si`
- Include the following fields in your SELECT clause: `si.minx, si.miny, si.maxx, si.maxy`
- Note that the id field for your feature table may be something other than `fid`

**Example GeoPackage Provider Layer with `sql`**

```toml
[[providers.layers]]
name = "a_points"
sql = """
    SELECT
        fid, geom, amenity, religion, tourism, shop, si.minx, si.miny, si.maxx, si.maxy
    FROM
        land_polygons lp
    JOIN
        rtree_land_polygons_geom si ON lp.fid = si.id
    WHERE
        !BBOX!
"""
```


## Maps

Tegola is responsible for serving vector map tiles, which are made up of numerous [Map Layers](#map-layers). The name of the Map is used in the URL of all map tile requests (i.e. /maps/:map_name/:z/:x/:y). Maps have the following configuration parameters:


| Param              | Required | Description                                                                                                                      |
|:-------------------|:---------|:---------------------------------------------------------------------------------------------------------------------------------|
| name               | Yes      | The map that will be referenced in the URL (i.e. /maps/:map_name.                                                                |
| attribution        | No       | Attribution string to be included in the TileJSON.                                                                               |
| bounds             | No       | The bounds in latitude and longitude values, in the order left, bottom, right, top. Default: `[-180.0, -85.0511, 180.0, 85.0511]`|
| center             | No       | The center of the map to be displayed in the preview. (`[lon, lat, zoom]`).                                                      |
| tile_buffer        | No       | The number of pixels to extend a tile's clipping area, defaults to `64` or the [global](#global) value                           |
| tile_matrix_sets   | No       | **Fork only.** The [tiling schemes](#tile-matrix-sets) this map may be requested in. Omitted, every scheme the build serves.     |


```toml
[[maps]]
name = "zoning"		# used in the URL to reference this map (/maps/:map_name)
attribution = "Natural Earth v4"
center = [-76.275329586789, 39.153492567373, 5.0]
```

### Tile matrix sets

> **Added by [this fork](./about-this-fork.md).** Optional — omit it and the
> map behaves as it does on upstream Tegola.

`tile_matrix_sets` names the tiling schemes a map may be requested in. It is configured per map, not
per layer or per provider.

```toml
[[maps]]
name = "parks"
# Omit for every scheme this build serves. The first entry is the map's
# default: the scheme its native /maps/... routes serve.
tile_matrix_sets = ["WebMercatorQuad", "WorldCRS84Quad"]
```

This build serves the schemes that need no coordinate transformation backend:

| tileMatrixSetId | CRS | Matrix at zoom z |
|:---|:---|:---|
| `WebMercatorQuad` | EPSG:3857 | 2^z × 2^z |
| `WorldCRS84Quad` | OGC:CRS84 | 2·2^z × 2^z |
| `WGS1984Quad` | EPSG:4326 | 2·2^z × 2^z |

Naming a scheme this build cannot serve is a startup error that lists the available ones. The other
schemes in the OGC register ship with the build but are not servable; `/tileMatrixSets` lists only
what can be served.

**Changing a map's schemes changes its cache keys** — purge and re-seed that map.

Full detail: [Tile Matrix Sets](./tile-matrix-sets.md).

### Map Layers

Map Layers define which [Provider Layers](#provider-layers) to render at what zoom levels. Map Layers have the following configuration parameters:

| Param              | Required | Description                                                                                                                              |
|:-------------------|:---------|:-----------------------------------------------------------------------------------------------------------------------------------------|
| provider_layer     | Yes      | The name of the provider and provider layer using dot syntax. (i.e. my_postgis.rivers).                                                  |
| name               | No       | Overrides the `provider_layer` name. Can also be used to group multiple `provider_layers` under the same namespace.                      |
| min_zoom           | No       | The minimum zoom to render this layer at.                                                                                                |
| max_zoom           | No       | The maximum zoom to render this layer at.                                                                                                |
| default_tags       | No       | Default tags to be added to features on this layer.                                                                                      |
| dont_simplify      | No       | Boolean to prevent feature simplification from being applied.                                                                            |


**Example Map Layer**

```toml
[[maps.layers]]
provider_layer = "test_postgis.landuse" # must match a data provider layer
min_zoom = 12                       	# minimum zoom level to include this layer
max_zoom = 16                       	# maximum zoom level to include this layer
```

#### Default Tags

Map Layer Default Tags provide a convenient way to encode additional tags that are not supplied by a data provider. If a Default Tag is defined and the same tag is returned by the Provider, the Provider defined tag will take precedence.

Default Tags are `key = value` pairs.

**Example Map Layer Default Tags**

```toml
[maps.layers.default_tags]
class = "park"			# a default tag to encode into the feature
```


## Cache

This section configures caches for generated tiles. There is exactly **one** `[cache]` table for the
whole process — per-map cache selection is not a feature. All cache configs have the following
parameters:

| Param      | Required | Description                                                                                   |
|:-----------|:---------|:----------------------------------------------------------------------------------------------|
| type       | Yes      | The type of cache to use (`file`, `redis`, `s3`, `azblob`, `gcs`, or `multi`)                 |
| max_zoom   | No       | The max zoom which should be cached.                                                           |
| timeout_ms | No       | **Fork only.** A read deadline for this cache, in integer milliseconds. See [below](#timeout-ms). |

> **Fork behaviour change.** Cache **writes no longer block the response** — every cache, chained or
> not, hands its write to a bounded pool after the response is flushed. This affects single-backend
> deployments too. See [Layered cache](./layered-cache.md#writes-do-not-block-the-response).
>
> Cache **keys** also gained a leading `{tileMatrixSetId}`, so caches carried over from upstream
> Tegola must be purged and re-seeded.

### `timeout_ms` {#timeout-ms}

> **Added by [this fork](./about-this-fork.md).**

An optional per-cache read deadline, in **integer milliseconds**. It carries its unit where the
adjacent `ttl` takes bare seconds. It applies to any cache at any nesting depth, including a plain
non-chained `[cache]` table, and affects `Get` only.

It is **enforced** by `redis`, `s3`, `azblob` and `gcs`, and only **advisory** for `file`, whose
`os.Open`/`Stat` calls block before any cancellation check — on an NFS/EFS mount use the mount's own
`soft` and `timeo=` options instead.

A read that times out is a **miss, not an error**.

### Layered cache

> **Added by [this fork](./about-this-fork.md).**

`type = "multi"` puts an ordered chain of cache backends behind the single `[cache]` table. Reads walk
the tiers in declaration order and promote a hit into the earlier ones; writes fan out; purges run in
reverse.

| Param          | Required | Default | Description                                                            |
|:---------------|:---------|:--------|:------------------------------------------------------------------------|
| layers         | Yes      |         | The ordered list of tiers, as `[[cache.layers]]` tables. Declaration order is read order. |
| promote_on_hit | No       | `true`  | Promote a later-tier hit into the earlier tiers. `false` gives a read-only fan-out. |

Each `[[cache.layers]]` entry takes its backend's own parameters, plus `timeout_ms` and an optional
`name` that pins the tier's metric label and `--cache-tiers` value.

```toml
[cache]
type           = "multi"
promote_on_hit = true

  [[cache.layers]]
  type       = "redis"
  ttl        = 3600
  timeout_ms = 35
  name       = "hot"

  [[cache.layers]]
  type   = "s3"
  bucket = "tiles"
```

Note that `[[cache.layers]]` headers are *siblings* however deeply they are indented — TOML
indentation is cosmetic. Real nesting needs `[[cache.layers.layers]]`.

Full detail, including metrics and operations: [Layered cache](./layered-cache.md).

### File

Cache tiles in a directory on the local filesystem.

| Param    | Required | Default | Description                                                  |
|:---------|:---------|:--------|:-------------------------------------------------------------|
| basepath | Yes      |         | A directory on the file system to write the cached tiles to. |
| ttl      | No       | 0       | Seconds after which a cached tile is treated as expired. 0 means no expiry. |

### Redis

Cache tiles in [Redis](https://redis.io/).

When no parameters are supplied, this cache will try and connect to a local Redis
instance with default configuration.

| Param      | Required | Default        | Description                                                  |
|:-----------|:---------|:---------------|:-------------------------------------------------------------|
| uri        | No       |                | `redis://` or `rediss://` followed by `<user>:<password>@<host>:<port>/<database>`. The preferred form. |
| network    | No       | `tcp`          | *Deprecated.* The type of connection (`tcp` or `unix`)       |
| address    | No       | 127.0.0.1:6379 | *Deprecated.* The address of Redis in the form `ip:port`.    |
| password   | No       |                | Password to use when connecting. **Takes precedence over a password in `uri`.** |
| db         | No       |                | *Deprecated.* Database to use (int).                         |
| ttl        | No       | 0              | Key TTL in seconds. 0 means the key has no expiration.       |
| key_prefix | No       |                | **Fork only.** A string prepended to every cache key, so one Redis instance can be shared. |
| ssl        | No       | false          | *Deprecated.* Encrypt connection to the Redis server.        |

Connecting via `uri` is the default from v0.22.0 onwards; `network`, `address`, `db` and `ssl` are
deprecated in its favour. `password` is **not** deprecated — when both are given the `password` key
wins over the credential in the uri, including when it is present and empty, which asks for no
password rather than falling back to the uri's.

`key_prefix` is concatenated verbatim, so **supply your own separator**: `key_prefix = "tegola:"`
gives keys like `tegola:WebMercatorQuad/mymap/mylayer/10/511/340`, whereas `key_prefix = "tegola"`
gives `tegolaWebMercatorQuad/...`.

#### Passwords with special characters

A `uri` is parsed as a URL, so a password inside one must be percent-encoded. Unencoded, the outcome
depends on the character:

| In the uri | Result |
|:---|:---|
| `^` `[` `]` `{` `}` `\|` `<` `>` `\` `"` space | startup fails with `net/url: invalid userinfo` |
| `%` | startup fails with `invalid URL escape` |
| `/` `?` | startup fails — the authority ends there |
| `#` | **truncates the uri at that point.** Usually a startup error, but when what remains still parses it silently yields the wrong password |
| `$` `@` `&` `!` `*` `(` `)` `+` `=` `:` `~` `,` `;` `'` | works unencoded |

Percent-encode, or use the separate `password` key, which is not subject to URL rules:

```toml
[cache]
type     = "redis"
uri      = "redis://user@localhost:6379/0"
password = "${SECRET_REDIS_PASSWORD}"
```

### S3

Cache tiles in Amazon S3, or any S3-compatible store via `endpoint`.

| Param    | Required | Default        | Description                                                         |
|:---------|:---------|:---------------|:--------------------------------------------------------------------|
| bucket   | Yes      |                | The name of the S3 bucket to use.                                   |
| basepath | No       |                | A path prefix added to all cache operations inside the S3 bucket |
| region   | No       | us-east-1      | The region the bucket is in.                                        |
| endpoint | No       |                | A non-AWS S3-compatible endpoint.                                   |
| aws_access_key_id | No |             | The AWS access key id to use.                                       |
| aws_secret_access_key | No |         | The AWS secret access key to use.                                   |
| access_control_list | No |           | The canned ACL to apply to written objects.                         |
| cache_control | No |                  | The `Cache-Control` header to store with written objects.           |
| content_type | No | application/vnd.mapbox-vector-tile | The `Content-Type` to store with written objects.      |

If the `aws_access_key_id` and `aws_secret_access_key` are not set, then the
[credential provider chain](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html)
will be used. The provider chain supports multiple methods for passing credentials, one of which is
through environment variables. For example:

```bash
$ export AWS_REGION=us-west-2
$ export AWS_ACCESS_KEY_ID=YOUR_AKID
$ export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
```

### Azure Blob Storage

Cache tiles in an Azure Blob Storage container.

| Param           | Required | Default | Description                                              |
|:----------------|:---------|:--------|:----------------------------------------------------------|
| container_url   | Yes      |         | The URL of the blob container to write to.               |
| az_account_name | No       |         | The storage account name.                                |
| az_shared_key   | No       |         | The storage account shared key.                          |
| basepath        | No       |         | A path prefix added to all cache operations.             |
| read_only       | No       | false   | Serve from the container without writing to it.          |

### Google Cloud Storage

Cache tiles in a GCS bucket.

| Param    | Required | Default | Description                                  |
|:---------|:---------|:--------|:----------------------------------------------|
| bucket   | Yes      |         | The name of the GCS bucket to use.           |
| basepath | No       |         | A path prefix added to all cache operations. |

## Env Var

Environmental variables can be used in any configuration option. However, they must be written within quotes as a string:

```toml
tile_buffer = "${SHIGOLA_TILE_BUFFER}"     # note that tile buffer expects an integer, tegola will handle the conversion

[cache]
type = "redis"
password = "${SECRET_REDIS_PASSWORD}"
```

## Full Config Example

:::warning

**Prefer `mvt_postgis` over `postgis` for polygon data.** The native `postgis` provider produces
distorted polygon and multipolygon geometries —
[go-spatial/tegola#1104](https://github.com/go-spatial/tegola/issues/1104#issuecomment-4671741621).
The same table served through `mvt_postgis` renders correctly, which places the fault in the native
provider's geometry handling rather than in the source data.

The example below therefore uses `mvt_postgis`, where PostGIS does the MVT encoding via
[`ST_AsMVT`](https://postgis.net/docs/ST_AsMVT.html). If you are serving polygons with
`type = "postgis"`, switching is the workaround.

:::

The following config demonstrates the various concepts discussed above:

```toml
tile_buffer = 64

[webserver]
port = ":9090"

[cache]
type="file"             # cache type
basepath="/tmp/shigola"  # cache specific config

# register data providers
[[providers]]
name = "test_postgis"   # provider name is referenced from map layers
type = "mvt_postgis"    # PostGIS does the MVT encoding, via ST_AsMVT
uri = "postgres://tegola:supersecret@localhost:5432/tegola?sslmode=prefer" # PostGIS connection string (required)
srid = 3857             # The default srid for this provider. If not provided it will be WebMercator (3857)

    # `sql` is required on this provider, and the geometry must be wrapped in
    # ST_AsMVTGeom — which tegola cannot generate from a `tablename`. The key is
    # parsed rather than rejected, so a layer using it fails by serving wrong
    # geometry rather than by refusing to start.
    [[providers.layers]]
    name = "landuse"                       # will be encoded as the layer name in the tile
    geometry_fieldname = "geom"             # geom field. default is geom
    id_fieldname = "gid"                    # geom id field. default is gid
    sql = "SELECT ST_AsMVTGeom(geom, !BBOX!) AS geom, gid FROM gis.zoning_base_3857 WHERE geom && !BBOX!"

    [[providers.layers]]
    name = "roads"                          # will be encoded as the layer name in the tile
    geometry_fieldname = "geom"             # geom field. default is geom
    id_fieldname = "gid"                    # geom id field. default is gid
    # Extra columns in the SELECT become feature tags — the equivalent of the
    # `fields` option on the native provider.
    sql = "SELECT ST_AsMVTGeom(geom, !BBOX!) AS geom, gid, class, name FROM gis.zoning_base_3857 WHERE geom && !BBOX!"

    [[providers.layers]]
    name = "rivers"                         # will be encoded as the layer name in the tile
    sql = "SELECT ST_AsMVTGeom(geom, !BBOX!) AS geom, gid FROM gis.rivers WHERE geom && !BBOX!"

# maps are made up of layers
[[maps]]
name = "zoning"                             # used in the URL to reference this map (/maps/:map_name)
tile_buffer = 0                             # number of pixels to extend a tile's clipping area
tile_matrix_sets = ["WebMercatorQuad"]      # tiling schemes this map may be requested in.
                                            # the first is the default. omit for all servable schemes.

    # A map using an MVT provider may use ONLY that provider — every layer here
    # has to come from test_postgis. Mixing in a second provider, MVT or not, is
    # a startup error.
    [[maps.layers]]
    provider_layer = "test_postgis.landuse" # must match a data provider layer
    min_zoom = 12                           # minimum zoom level to include this layer
    max_zoom = 16                           # maximum zoom level to include this layer

    [[maps.layers]]
    provider_layer = "test_postgis.rivers"  # must match a data provider layer
    min_zoom = 10                           # minimum zoom level to include this layer
    max_zoom = 18                           # maximum zoom level to include this layer
```

Two things behave differently from the native `postgis` provider, and neither reports an error:

- **`default_tags` is ignored.** Tegola adds default tags while encoding a tile, and an MVT provider
  returns a tile that is already encoded, so there is nothing to add them to. Put the value in the
  `SELECT` instead — `'park'::text AS class`.
- **A map may contain exactly one MVT provider and nothing else.** This is enforced at startup, so a
  map that mixes `mvt_postgis` with a `postgis` or `gpkg` layer fails to load rather than serving a
  partial tile.

## Layered Cache Example

A Redis hot tier in front of an S3 durable tier, serving two tiling schemes — both
[fork-only](./about-this-fork.md) features:

```toml
tile_buffer = 64

[webserver]
port = ":8080"

# Exactly one [cache] table for the process. `multi` makes it a chain.
[cache]
type           = "multi"
promote_on_hit = true       # default: a hit in s3 is written back into redis

  # Tier 0 — read first, promoted into. Fast, evicting, bounded.
  [[cache.layers]]
  type       = "redis"
  name       = "hot"        # pins the metric label and --cache-tiers value
  uri        = "redis://localhost:6379/0"
  password   = "${SECRET_REDIS_PASSWORD}"
  key_prefix = "tegola:"    # supply your own separator
  ttl        = 3600         # seconds; bounds redis memory, not staleness
  timeout_ms = 35           # abandon this tier's read after 35ms; a timeout is a miss

  # Tier 1 — the durable one, and what `cache seed` writes by default.
  [[cache.layers]]
  type     = "s3"
  bucket   = "${S3_BUCKET}"
  region   = "us-east-2"
  basepath = "tiles"
  # timeout_ms omitted: the durable tier is allowed to be slow.

[[providers]]
name = "osm"
type = "mvt_postgis"        # see the polygon bug in `postgis`, above
uri  = "postgres://tegola:supersecret@localhost:5432/tegola?sslmode=prefer"

  [[providers.layers]]
  name = "landuse"
  sql  = "SELECT ST_AsMVTGeom(geom, !BBOX!) AS geom, gid FROM gis.landuse WHERE geom && !BBOX!"

[[maps]]
name = "osm"
# First entry is the default — what /maps/osm/{z}/{x}/{y} serves.
tile_matrix_sets = ["WebMercatorQuad", "WorldCRS84Quad"]

  [[maps.layers]]
  provider_layer = "osm.landuse"
  min_zoom = 10
  max_zoom = 16
```
