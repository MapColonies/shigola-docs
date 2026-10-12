---
id: cache-admin-api
title: "Cache Admin API"
sidebar_label: "Cache Admin API"
sidebar_position: 10
description: "Purging the tile cache over HTTP, on a port of its own"
---

The Cache Admin API purges tiles from the cache over HTTP. A purge through it does the same as
[`shigola cache purge`](./cache-seeding-and-purging.md#cache-purge), so a service that knows which
part of the map changed, such as retiler after an OSM update, can clear the stale tiles without
running the CLI.

It runs on **its own port**, separate from the tile port, and is **off by default**. Keep that port
off any gateway or ingress that is open to clients: it is meant for in-cluster callers only.

## Enabling it

```toml
[webserver]
port = ":8080"

  [webserver.admin]
  port = ":9090"
  token = "${SHIGOLA_ADMIN_TOKEN}"
```

| Param | Required | Default | Description |
|:------|:---------|:--------|:------------|
| port  | No       |         | The port the API listens on. Setting it turns the API on. It must differ from the tile port. |
| token | No       |         | A secret that requests to `/cache/*` must send as `Authorization: Bearer <token>`. |
| max_tiles_per_request | No | 10000 | The most cache keys one request may touch. See [Limits](#limits). |
| max_concurrent_requests | No | 4 | The most requests worked on at once. |
| request_timeout_ms | No | 60000 | How long a request may run before its remaining work is cancelled. |

### The admin token

When `token` is set, a request without `Authorization: Bearer <token>`, or with a different token,
gets `401` and touches nothing. Take the token from the environment, as above, rather than writing
it into the config file.

The token is optional, because the port should be unreachable from outside anyway. Without one,
Shigola logs a loud `WARN` at startup naming the port, so an unprotected API does not go unnoticed.

## Exploring it

The admin port serves its own description:

- `GET /docs`: Swagger UI, for reading the API and trying requests. Use **Authorize** to enter the
  token. It is served from the binary, so it works without internet access.
- `GET /openapi.json`: the OpenAPI 3 document behind it.

Neither needs the token. Only the `/cache/*` routes do.

## `POST /cache/purge`

Purges the tiles covering an area at a range of zooms, from every tile matrix set each targeted map
serves.

```shell
curl -X POST http://localhost:9090/cache/purge \
  -H "Authorization: Bearer $SHIGOLA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "bounds": [34.75, 32.05, 34.80, 32.10],
        "zoomRange": { "min": 10, "max": 14 },
        "targets": [ { "map": "osm" } ]
      }'
```

| Field | Required | Description |
|:------|:---------|:------------|
| `bounds` | One of `bounds` or `tiles` | The area as `[west, south, east, north]` in lng/lat. A box with west greater than east crosses the antimeridian. |
| `tiles` | One of `bounds` or `tiles` | The area as a list of `z/x/y` tile names in `sourceTileMatrixSet`. Each tile stands for the ground it covers. |
| `sourceTileMatrixSet` | With `tiles` | The tile matrix set the `tiles` names belong to, by id. |
| `zoomRange` | Yes | `{ "min": …, "max": … }`, inclusive. |
| `targets` | Yes | The maps to purge, each `{ "map": "…", "layers": [ … ] }`. A request without targets gets `400`. |

**Every tile matrix set a map serves is purged.** The area is tiled in each of the map's tile matrix
sets at the same zoom numbers, so a map served in both WebMercatorQuad and WorldCRS84Quad loses the
covering tiles from both. Tiles that only touch the area's edge are not included. Latitudes outside a
set's extent are clipped, so WebMercatorQuad covers up to ±85.05°.

**Layers.** With no `layers`, a target clears its whole-map tile and every layer's tile. Naming
`layers` clears those layers' tiles and the whole-map tile, which contains them too. Other layers are
left alone. This is the same rule as [`--layers`](./cache-seeding-and-purging.md#cache-purge).

A purge clears every tier of a [layered cache](./layered-cache.md) reachable from the pod that
handles it.

### Limits

The API runs on the same pods that serve tiles, so it refuses work that could tie them up:

- **Size.** A request may touch at most `max_tiles_per_request` cache keys, counted across every
  tile matrix set, zoom and layer it covers. A purge of a map with two layers counts three keys per
  tile: the whole-map tile and each layer's. A larger request gets `422` and touches nothing.
  Narrow it, or run [`shigola cache purge`](./cache-seeding-and-purging.md#cache-purge), which has no
  such limit.
- **Concurrency.** At most `max_concurrent_requests` run at once. Another request gets `429` with a
  `Retry-After` header and touches nothing.
- **Duration.** A request still running after `request_timeout_ms` has its remaining work
  cancelled and gets `503` with the counts so far. A client that disconnects cancels its request
  the same way. Repeat the purge to finish it: purging a tile twice is harmless.

### Response

The request runs to completion before the response is sent.

```json
{ "purged": 42, "skipped": 0, "failed": 0, "durationMs": 18 }
```

Counts are per map tile: one tile purged from two maps counts twice.

| Status | Meaning |
|:-------|:--------|
| `200` | Every tile was purged. |
| `400` | The request was malformed or its body was over 1 MiB, or named a map, layer, tile or tile matrix set that does not exist. `error` says which. Nothing was purged. |
| `401` | A token is configured and the request did not send it. Nothing was purged. |
| `422` | The request covers more than `max_tiles_per_request`. Nothing was purged. |
| `429` | `max_concurrent_requests` are already running. Retry after `Retry-After` seconds. Nothing was purged. |
| `500` | Some tiles could not be purged, usually because a cache backend failed. Every tile was still attempted: `failed` counts the ones that failed and `error` gives the first failure. Purging the same area again is safe. |
| `503` | The request timed out. The body holds the counts so far. Purging the same area again is safe. |
