---
id: layered-cache
title: "Layered Cache"
sidebar_label: "Layered Cache"
sidebar_position: 8
description: "An ordered chain of cache backends, with promotion and non-blocking writes"
---

`type = "multi"` puts an ordered chain of cache backends behind the single `[cache]` table. Reads
walk the tiers in declaration order and a hit in a later tier is promoted into the earlier ones;
writes fan out to every tier; purges run in reverse.

The motivating deployment is Redis in front of S3 — a small, fast, evicting tier over a large,
durable one — but the mechanism is generic. Any registered cache type can occupy any position, in any
number, and a tier may itself be a chain.

```toml
[cache]
type           = "multi"
promote_on_hit = true          # default; false gives a read-only fan-out

  [[cache.layers]]
  type       = "redis"
  ttl        = 3600            # seconds — an existing redis key
  timeout_ms = 35              # abandon this tier's read after 35ms
  name       = "hot"           # optional; pins the metric label and the
                               # --cache-tiers value against reordering

  [[cache.layers]]
  type   = "s3"
  bucket = "tiles"
  # timeout_ms omitted: the durable tier is allowed to be slow.
```

**Declaration order is read order.** There is no `priority` key — a TOML list is already ordered, and
a second ordering mechanism would be a second source of truth.

Note that `[[cache.layers]]` headers are *siblings* however deeply they are indented; TOML
indentation is cosmetic. Real nesting needs the key to nest: `[[cache.layers.layers]]`.

## Tier names

A tier's name is what appears in the `tier` metric label and in `cache seed --cache-tiers`, which
means it ends up in dashboards, alerts and cron jobs.

- Set `name` explicitly to pin it. Renaming a tier, or reordering layers, silently breaks anything
  referring to the old name.
- Omitted, the name is the cache **type** — `redis`, `s3`. A second tier of the same type gets an
  index suffix: `redis`, `redis#2`, `redis#3`.
- A tier inside a nested chain is addressed by path: `nested/inner`.

## `timeout_ms`

An optional per-cache read deadline, in **integer milliseconds**. It carries its unit where the
adjacent `ttl` takes bare **seconds** — deliberately, because a bare `timeout` next to `ttl = 3600`
reads as seconds.

It is not a chain key: it applies to any cache at any nesting depth, including a plain non-chained
`[cache]` table, and on the chain itself it acts as a whole-chain read budget. `Get` only.

| Backend | `timeout_ms` on `Get` | |
|:---|:---|:---|
| `redis`, `s3`, `azblob`, `gcs` | **enforced** | all four attach the context to the request |
| `file` | **advisory** | `os.Open`/`Stat` block before its one cancellation check. This matters on an NFS/EFS mount, where a `file` tier really is a network cache — use mount-level `soft` and `timeo=` instead. Not fixable: Go cannot cancel a blocking filesystem syscall. |
| `memory` | n/a | a map; it returns before any deadline could fire |

Deadlines compose additively down the chain: `redis 35ms` plus `s3 2000ms` is a 2.035 s worst case
before the chain concludes "miss" and generation even begins. A `timeout_ms` on the top-level
`[cache]` caps that, and is not the default.

**A read failure is a miss, never an error.** A tier that fails is logged, counted and skipped, and a
chain in which every tier failed still returns a miss. That is what keeps tiles being written back to
a healthy tier while another one is down — but it also means a broken tier produces no error, no
status-code change and no latency change. The per-tier error counter is the only evidence. See
[Operating a layered cache](#operating-a-layered-cache).

## Writes do not block the response

**Every** cache — chain or not — now hands its writes to a bounded pool and returns; the response is
flushed first. A write that cannot claim a slot is dropped and counted rather than queued.

**This is a behaviour change for single-backend deployments too**, not just for `type = "multi"`.

Dropping is safe: a discarded write only means the tile is regenerated or re-read from the durable
tier later. Dropping *silently* is not, which is why the counters below exist.

The CLI seed/purge worker and the AWS Lambda entrypoint write inline instead. Both would otherwise
lose writes at process exit or execution freeze.

## Operational switches

These three live in `SHIGOLA_OPTIONS` rather than in `[cache]`, because they are process resourcing and
lifecycle rather than cache configuration — and each has to be changeable during the incident that
reveals the need for it.

```
SHIGOLA_OPTIONS=DetachedWriteSlots=1024        # pool capacity;    default 256
SHIGOLA_OPTIONS=DetachedWriteTimeoutMs=10000   # bound on writes;  default 10000, 0 disables
SHIGOLA_OPTIONS=DetachedWriteDrainMs=5000      # shutdown drain;   default 5000,  0 disables
```

`DetachedWriteSlots` is the one knob that can exhaust process memory: worst-case live write buffers
are `slots × tiers × average tile size`, so the 256 default is roughly 100 MB with two tiers and
200 KB tiles, and 1024 is roughly 400 MB.

`DetachedWriteTimeoutMs` bounds **slot occupancy**, not a request — the user's request finished long
before. It is on by default because nothing else bounds an S3 write, and a wedged write holds its slot
forever: enough of them over a process lifetime empty the pool, after which every write is dropped
until the process restarts.

Values are integers, and the parser does not accept duration strings — write
`DetachedWriteTimeoutMs=10000`, not `10s`.

## Seeding a layered cache

```
shigola cache seed --map=osm                          # writes the LAST tier only
shigola cache seed --map=osm --cache-tiers=all        # pre-warm: write every tier
shigola cache seed --map=osm --cache-tiers=hot,s3     # an explicit list
shigola cache seed --map=osm --overwrite              # write, then purge the rest
```

**`seed` writes only the last tier by default.** Seeding every tier would flood the hot tier with cold
tiles in seed order, evicting the live working set — the exact harm the chain exists to avoid. The
last tier in read order is the durable one by construction, so no heuristic and no extra config key
is needed.

Two consequences worth knowing:

- **Adding a tier to an existing chain changes what `seed` writes.** A single-backend cache is
  unaffected: one cache is also the last cache.
- **This assumes tiers are ordered hot → durable, and nothing enforces it.** A chain of `s3` then
  `redis` is legal, and makes `seed` write the hot tier and skip the durable one.

`--cache-tiers` takes tier names, validated at startup; an unknown name is an error rather than a
silent no-op. When set, it bounds promotion as well as writes, so `--cache-tiers=s3` cannot reach the
hot tier by either route.

**`--overwrite` purges the tiers it does not write, after writing them.** Without that, a re-seed with
the durable-only default would leave the hot tier serving pre-update tiles until TTL expiry — so the
command documented as the invalidation mechanism would not invalidate what users are served. Ordering
matters: writing first closes the window in which a concurrent read could promote the old tile back.

Invalidation is re-seeding. There is no TTL refresh on read, so in a Redis→S3 chain the Redis TTL
bounds Redis memory rather than staleness: an expired tile is re-read from S3 and promoted, unchanged.
That churn — one durable-tier GET and one promotion per hot tile per TTL period — is the cost of a
short TTL, and a rising durable-tier hit rate is the signal it is set too short.

See [Cache Seeding and Purging](./cache-seeding-and-purging.md).

## Metrics

With an observer configured there are **two families, and they must not be summed together**.

| Family | Scope | `tier` label |
|:---|:---|:---|
| `shigola_cache_*` | the whole cache — one hit means "served from somewhere" | no |
| `shigola_cache_tier_*` | one tier — several lookups per request | yes |

`sum(shigola_cache_tier_hits_total)` is **not** the chain hit count; use `shigola_cache_hits_total`.

The pool and the chain publish their own counters:

| Metric | Means |
|:---|:---|
| `shigola_cache_write_slots_in_flight` / `_write_slots_capacity` | pool saturation — the leading indicator |
| `shigola_cache_writes_dropped_total` | the pool was full at admission; nothing was attempted |
| `shigola_cache_writes_abandoned_total` | still running when the shutdown drain expired |
| `shigola_cache_writes_timed_out_total` | killed by `DetachedWriteTimeoutMs`; also counted in `_writes_failed_total` |
| `shigola_cache_writes_failed_total`, `_writes_completed_total`, `_write_duration_seconds_total` | attempted writes |
| `shigola_cache_promotions_total`, `_promotions_dropped_total` | read-through promotion |
| `shigola_cache_tier_read_timeouts_total` | reads abandoned by their `timeout_ms`; also counted in `_errors_total` |

> **Renamed metric.** The cache error counter was registered as the unprefixed `errors`. It is now
> `shigola_cache_errors_total` (and `shigola_cache_tier_errors_total` per tier). Dashboards and alerts
> referring to `errors` need updating.

### Tier latency, and why it used to look identical everywhere

`shigola_cache_tier_duration_seconds` buckets at **1-2-5 per decade from 100µs to 5 seconds**, and
`shigola_cache_tier_response_size_bytes` at **1KB to 5MB**.

Those boundaries are the point. A memory tier answers in roughly a microsecond, redis or a file tier
in 0.1–2ms, an object store in 20–200ms — three to five orders of magnitude apart. Until this was
fixed both histograms used the HTTP handler's buckets, whose smallest boundary is 250ms for duration
and 500KB for size, so **every tier landed in the first bucket**. A quantile over a
single-populated-bucket histogram interpolates on the observation count alone, which meant
`histogram_quantile` returned the same latency for the hot tier and the durable one — around 237ms
for a p95, an artifact of the bucket width rather than a measurement.

If a tier latency panel has ever shown your tiers sitting on top of each other at a suspiciously
round number, that was this.

:::warning
**This changes the shape of existing panels.** The bucket boundaries are part of a histogram's
identity, so `le` series from before the change do not line up with the ones after. A panel spanning
the upgrade shows a discontinuity, and any alert threshold tuned against the old artifact values
needs re-deriving against real ones.
:::

## Operating a layered cache

This design degrades silently by construction, so these are part of the feature rather than
decoration.

**The write path escalates in a fixed order — alert in that order.**

| # | Signal | Means | Do |
|:---|:---|:---|:---|
| 1 | `rate(shigola_cache_writes_timed_out_total) > 0` | writes are hitting the bound; the durable tier is degrading | investigate now — this is the earliest warning |
| 2 | `in_flight / capacity > 0.7` for 5m | the pool is filling | raise `DetachedWriteSlots`, or fix what is slowing writes |
| 3 | `rate(shigola_cache_writes_dropped_total) > 0` | the pool is exhausted and writes are being lost | both of the above, urgently |

**The read path has one alert that is not optional.**
`rate(shigola_cache_tier_errors_total) > 0` should page, at least for the durable tier. Read failures
degrade to a miss, so a broken tier produces no error, no status-code change and no latency change —
tiles keep serving, regenerated from the database. This counter is the only evidence.

Do not alert on whole-cache `Set` latency: it measures slot acquisition, which is near zero and always
succeeds. And do not alert on chain hit rate alone — a healthy cache with a genuinely cold working set
looks identical to a broken one. Pair it with the tier error rate.

**One risk this does not address.** A total cache outage means every request regenerates its tile from
the database. Nothing at the cache seam can prevent that — single-flight, circuit breaking and
stale-while-revalidate all need work above the cache — and it is no worse than a single-backend cache
outage today.
