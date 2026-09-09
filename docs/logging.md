---
id: logging
title: "Logging in Shigola"
sidebar_label: "Logging"
sidebar_position: 11
description: "Managing logging output in Shigola"
---

Shigola logs structured JSON to standard error, one object per line.

```json
{"time":"2026-09-09T11:16:33.181Z","level":"INFO","msg":"starting shigola server (1.4.0) on port :8080","shigola":{"version":"1.4.0","pid":1,"rev":"9f3c1ab"}}
```

Every record carries `time`, `level`, `msg`, and a `shigola` object naming the
build and process that wrote it. Records at `ERROR` and above also carry a
top-level `stack` field — which was `shigola.stack` before trace correlation
was added, so anything parsing that path needs updating. Records written while
serving a [traced](./tracing.md) request carry two more fields — see
[Trace correlation](#trace-correlation).

## Log Levels

In decreasing order of severity. Logs below the set level are ignored.

- `error` - prevents a valid execution, i.e. can't connect to a database
- `warn` - unusual but does not prevent a valid execution, i.e. deprecation warnings
- `info` - (default) least severe level a sysadmin would want, i.e. request logs
- `debug` - high level detail for developers, verbose
- `silent` - emit nothing at all

### Set Log Levels

Log levels can be set on start up. The value is case-insensitive, and anything
unrecognised falls back to `info` rather than failing to start.

```bash
/opt/shigola serve --log-level info
```

## Trace correlation

When [tracing](./tracing.md) is enabled, the records written while serving a
request carry that request's trace and span ids as top-level fields:

```json
{"time":"2026-09-09T11:16:33.181Z","level":"ERROR","msg":"cache/multi: tier (redis) get: dial tcp: connection refused","shigola":{"version":"1.4.0","pid":1,"rev":"9f3c1ab"},"trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","span_id":"00f067aa0ba902b7"}
```

| Field      | What it names                                                     |
|:-----------|:------------------------------------------------------------------|
| `trace_id` | The whole request, including any upstream service that started it |
| `span_id`  | The innermost operation active where the line was written         |

`span_id` is the operation, not just the request: a cache tier failure names the
cache read, a PostGIS statement warning names the query. In Tempo the line lands
on the span that produced it rather than on the request as a whole.

### Wiring it up in Grafana

Both directions are datasource configuration; Shigola only emits the fields.

**Logs to trace** — add a derived field to the Loki datasource, matching
`"trace_id":"(\w+)"` and pointing at the Tempo datasource. A regex on the raw
line matches whether or not a JSON parser stage runs.

**Trace to logs** — in the Tempo datasource's *Trace to logs* section, query
Loki with the trace id off the span:

```logql
{app="shigola"} | json | trace_id=`${__trace.traceId}`
```

Both keys are flat, so `| json` yields the labels `trace_id` and `span_id`
without a prefix.

### What is correlated, and what is not

**Correlated:** cache tier read and promotion failures, PostGIS statement
warnings and errors, the PostGIS SQL debug output, GCS cache operations, and the
OGC handlers' response and cache failures. Detached cache writes are correlated
too — a write completes after the response is sent, but still names the request
that caused it.

**Not correlated, because there is no request to name:** startup, configuration
and shutdown lines, and the cache write pool's saturation warning, which is a
property of the pool rather than of one request.

**Not correlated, though written during a request:** three tile-grid errors —
`tile grid ... has no EPSG code`, `Unsupported tile SRID` and `Could not
generate valid extent for tile`. They are raised from signatures that take no
context, and each reports a misconfigured tile matrix set, which fails
identically for every request to that map rather than telling you anything
about one. So an uncorrelated `ERROR` in the middle of a request is possible —
if you see one of those three, the trace it belongs to is not recoverable from
the line, and the fault is in the map's configuration rather than in that
request.

No empty fields are added in any of these cases; the keys are simply absent.

:::warning
**A trace id on a log line does not mean Tempo holds that trace.** The ids are
logged for every request, but only sampled traces are exported, so at the
default `sample_ratio = 0.01` roughly 99% of log lines name a trace that was
never sent. The ids are still the reliable way to group one request's lines
together; a "view trace" link resolves only for the sampled 1%. Raise
`sample_ratio` while chasing something specific — with the cost described under
[Sampling](./tracing.md#sampling).
:::


