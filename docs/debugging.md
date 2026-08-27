---
id: debugging
title: "Debugging Shigola"
sidebar_label: "Debugging"
sidebar_position: 10
description: "Fixing problems in Shigola"
---

## Environment Variables

The following environment variables can be used for debugging the shigola server:

`SHIGOLA_SQL_DEBUG`: specify the type of SQL debug information to output. Supports the following values:

- `LAYER_SQL`: print layer SQL as they're parsed from the config file.
- `EXECUTE_SQL`: print SQL that is executed for each tile request and the number of items it returns or an error.
- `LAYER_SQL:EXECUTE_SQL`: print `LAYER_SQL` and `EXECUTE_SQL`.

**Example**

```bash
$ SHIGOLA_SQL_DEBUG=LAYER_SQL shigola --config=/path/to/conf.toml
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

The three `DetachedWrite*` options are documented in full, with the metrics that tell you when to
change them, under
[Layered cache](./layered-cache.md#operational-switches). They live here
rather than in `[cache]` because each has to be changeable during the incident that reveals the need
for it.

## Cache is not being read

Cache keys include the tiling scheme:

```
before   {map}/{layer}/{z}/{x}/{y}
after    {tileMatrixSetId}/{map}/{layer}/{z}/{x}/{y}
```

A cache populated before a map's `tile_matrix_sets` changed is not corrupt — it is unreachable,
because nothing reads the old keys. Purge and re-seed.

With a [layered cache](./layered-cache.md), a **failing tier is invisible in
the response**: a read failure degrades to a miss, so there is no error, no status-code change and no
latency change. Check `shigola_cache_tier_errors_total`.

## Client side

When debugging client side, it's often helpful to see an outline of a tile along with its Z/X/Y values.

There is no query parameter for this: a debug layer is not part of any tileset the service
advertises, so a tile carrying one would not match the tileset metadata describing it. Configure the
`debug` provider's layers explicitly instead, on a map kept for debugging:

```toml
[[providers]]
name = "debug"
type = "debug"

[[maps]]
name = "mymap_debug"
  [[maps.layers]]
  provider_layer = "debug.debug-tile-outline"
  [[maps.layers]]
  provider_layer = "debug.debug-tile-center"
```

Request it like any other collection —
`/collections/mymap_debug/tiles/WebMercatorQuad/{z}/{y}/{x}` — and the tile carries two features:

- `debug_outline`: a line feature that traces the border of the tile
- `debug_text`: a point feature in the middle of the tile with the following tags:
- `zxy`: a string with the Z, X and Y values formatted as: Z:0, X:0, Y:0