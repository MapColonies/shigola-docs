---
id: debugging
title: "Debugging Shigola"
sidebar_label: "Debugging"
sidebar_position: 10
description: "Fixing problems in Tegola"
---

## Environment Variables

The following environment variables can be used for debugging the tegola server:

`SHIGOLA_SQL_DEBUG`: specify the type of SQL debug information to output. Supports the following values:

- `LAYER_SQL`: print layer SQL as they're parsed from the config file.
- `EXECUTE_SQL`: print SQL that is executed for each tile request and the number of items it returns or an error.
- `LAYER_SQL:EXECUTE_SQL`: print `LAYER_SQL` and `EXECUTE_SQL`.

**Example**

```bash
$ SHIGOLA_SQL_DEBUG=LAYER_SQL tegola --config=/path/to/conf.toml
```

`SHIGOLA_HTTP_PPROF_BIND`: bind a [pprof](https://pkg.go.dev/net/http/pprof) endpoint, e.g.
`localhost:6060`. Requires a binary built with `-tags pprof`.

`SHIGOLA_OPTIONS`: a comma-separated list of `Key=Value` entries and bare flags.

| Option | Default | Effect |
|:---|:---|:---|
| `DontSimplifyGeo` | off | Disable geometry simplification. |
| `SimplifyMaxZoom=N` | 10 | The zoom above which simplification stops. |
| `DetachedWriteSlots=N` | 256 | **Fork only.** Cache write-pool capacity. |
| `DetachedWriteTimeoutMs=N` | 10000 | **Fork only.** Bound on a detached cache write. 0 disables. |
| `DetachedWriteDrainMs=N` | 5000 | **Fork only.** How long shutdown waits for in-flight writes. 0 disables. |

Values are integers; the parser does **not** accept duration strings — write
`DetachedWriteTimeoutMs=10000`, not `10s`. An unparseable value logs an error and falls back to the
default rather than failing startup.

The three `DetachedWrite*` options are added by
[this fork](./about-this-fork.md) and are documented in full, with the metrics
that tell you when to change them, under
[Layered cache](./layered-cache.md#operational-switches). They live here
rather than in `[cache]` because each has to be changeable during the incident that reveals the need
for it.

## Cache is not being read

[This fork](./about-this-fork.md) changed the cache key format to include the
tiling scheme:

```
before   {map}/{layer}/{z}/{x}/{y}
after    {tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}
```

A cache populated by upstream Tegola, or before a map's `tile_matrix_sets` changed, is not corrupt —
it is unreachable, because nothing reads the old keys. Purge and re-seed.

With a [layered cache](./layered-cache.md), a **failing tier is invisible in
the response**: a read failure degrades to a miss, so there is no error, no status-code change and no
latency change. Check `shigola_cache_tier_errors_total`.

## Client side

When debugging client side, it's often helpful to see an outline of a tile along with it's Z/X/Y values. To encode a debug layer into every tile add the query string variable debug=true to the URL template being used to request tiles. For example:

```
http://localhost:8080/maps/mymap/{z}/{x}/{y}.vector.pbf?debug=true
```

The requested tile will be encoded with an additional layer with the name value set to debug and include two features:

- `debug_outline`: a line feature that traces the border of the tile
- `debug_text`: a point feature in the middle of the tile with the following tags:
- `zxy`: a string with the Z, X and Y values formatted as: Z:0, X:0, Y:0