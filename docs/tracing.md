---
id: tracing
title: "Tracing in Shigola"
sidebar_label: "Tracing"
sidebar_position: 12
description: "Export OpenTelemetry traces from Shigola over OTLP to Grafana Tempo"
---

Shigola can export [OpenTelemetry](https://opentelemetry.io/) traces over OTLP,
to [Grafana Tempo](https://grafana.com/oss/tempo/) or any collector that speaks
it. It is **off by default** and configured in its own `[tracing]` section.

Tracing runs *alongside* the [Prometheus observer](#relationship-to-metrics)
rather than replacing it, and puts its trace ids on
[log records](#relationship-to-logs) and on the
[duration histograms](#trace-exemplars).

## What tracing answers that metrics cannot

A histogram can tell you a tile took 300ms. It cannot tell you whether that was
the provider's SQL, one slow cache tier, or the gzip — and with a
[layered cache](layered-cache.md) it cannot tell you *which* tier. A span tree
can, because it describes one request rather than an aggregate:

```
GET /collections/{collectionId}/tiles/{tileMatrixSetId}/{tileMatrix}/{tileRow}/{tileCol}
├── cache.Get                       the chain as a whole
│   ├── cache.tier.Get  tier=hot        miss
│   └── cache.tier.Get  tier=durable    miss
├── atlas.Encode                    map, scheme and tile on the span
│   └── provider.MVTForLayers       the SQL assembly and the query
│       └── postgis.query           the round trip: statement, server, duration
└── cache.tier.Set      tier=durable    the write, off the response path
```

## Configuration

```toml
[tracing]
enabled = true
exporter = "otlp_grpc"                 # or "otlp_http"
endpoint = "tempo.observability:4317"
insecure = true
sample_ratio = 0.01
service_name = "shigola"
timeout_ms = 10000

  [tracing.headers]
  x-scope-orgid = "tenant-a"
```

| Param          | Required | Default         | Description                                                                                                   |
|:---------------|:---------|:----------------|:--------------------------------------------------------------------------------------------------------------|
| `enabled`      | No       | `false`         | Absent or false installs the no-op backend and dials nothing.                                                 |
| `exporter`     | No       | `otlp_grpc`     | OTLP transport: `otlp_grpc` or `otlp_http`. Tempo listens for gRPC on 4317 and HTTP on 4318.                   |
| `endpoint`     | No       | *(SDK default)* | Collector address, as either `host:port` or a full URL — see [Endpoint shapes](#endpoint-shapes). Empty defers to the OTEL SDK, which reads `OTEL_EXPORTER_OTLP_ENDPOINT`. |
| `insecure`     | No       | `false`         | Export without TLS. Normal for a collector reached over the pod network, wrong across anything else. Ignored when `endpoint` is a URL, whose scheme has already said. |
| `sample_ratio` | No       | `0.01`          | Fraction of traces Shigola *starts* to record. See [Sampling](#sampling).                                      |
| `service_name` | No       | `shigola`       | `service.name` on every span. Set it per deployment if several Shigolas report to one Tempo.                    |
| `timeout_ms`   | No       | `10000`         | Bounds one export attempt.                                                                                     |
| `[tracing.headers]` | No  |                 | Headers sent with each export request — an auth header, a Tempo tenant id.                                      |

## Endpoint shapes

Both of these work:

```toml
endpoint = "tempo.observability:4317"                   # host and port
endpoint = "https://collector.example.io/v1/traces"     # a full URL
```

They are not interchangeable underneath — the OTLP exporters accept them through
different options — and Shigola picks the right one from whether a scheme is
present. Anything that cannot work is refused at **startup**, naming the key:

- a path with no scheme, such as `tempo:4318/v1/traces`
- a scheme that is not `http` or `https`
- a non-numeric port
- an `https` endpoint together with `insecure = true`, which ask for opposite
  things

:::warning
**If traces stop arriving, check for `ERROR` lines prefixed `tracing:`.**
A dead or unreachable collector is reported there. Earlier versions reported it
at `INFO`, where a service running at `--log-level WARN` never saw it.
:::

`endpoint` is the one place Shigola does not use its own `SHIGOLA_*`
[environment variable](configuration.md#env-var) convention. The OTLP exporters
read the standard `OTEL_EXPORTER_OTLP_*` variables themselves, and a sidecar
collector is normally configured that way for every service in a cluster at
once.

An unusable `[tracing]` section is a startup error, and it is validated whether
or not tracing is enabled — so a typo waiting in a switched-off section is found
now rather than on the day someone switches it on.

## Sampling

:::warning
**Do not run a production tile server at `sample_ratio = 1.0`.** Each tile
request produces a span per cache tier plus the provider query and the encode,
so full sampling multiplies request rate by the span tree's width before
anything reaches the exporter, the network or Tempo.
:::

`sample_ratio` defaults to `0.01` — 1% — deliberately.

A tile server answers thousands of requests a second. With a two-tier cache,
each request produces roughly five spans, so a service at 2 000 req/s emits on
the order of 10 000 spans/s: tens of megabytes a minute on the wire, with an
ingester memory footprint and a storage bill to match. Spans are built on the
request path, so at full sampling the attribute building and export queueing
become part of tile latency rather than a background cost.

1% keeps that bounded while still yielding hundreds of complete traces a
minute, which is ample to characterise a latency problem. Raise it temporarily
while chasing something specific. `1.0` is reasonable in staging, or in a
deployment serving single-digit requests per second, and almost never in
production.

The sampler is **parent-based**: an upstream sampling decision is always
followed, and `sample_ratio` applies only to traces Shigola roots itself.
Without that, a gateway that chose to sample a request would hand it to a
Shigola that dropped its half of the trace 99 times out of 100 — leaving a hole
exactly where the tile was served.

This is also why `sample_ratio = 0` is a meaningful setting rather than a
synonym for `enabled = false`: record nothing this service starts, but keep
every trace something upstream already decided to keep.

## Propagation

Incoming W3C `traceparent`, `tracestate` and `baggage` headers are extracted per
request, so a request arriving from an upstream service continues that trace
rather than rooting a sibling one. The context is threaded from the handler
through the encode, the provider and every cache tier, which is what puts them
all in one trace.

On startup Shigola publishes its tracer provider and text-map propagator as
OpenTelemetry's process-wide ones, so an instrumented client library injects
this service's trace context into outgoing calls without further wiring.

**What actually carries it.** Publishing the global propagator is enough for any
client library that reads it, and Shigola's outgoing calls divide on whether
theirs does:

| Outgoing call | Carries trace context? |
|:---|:---|
| GCS cache tier | **Yes.** Its transport is wrapped in `otelhttp`, which reads the global propagator, so reads and writes inject `traceparent` and appear as HTTP client spans. |
| PostGIS queries | No. pgx is configured with a statement-logging tracer, not an OpenTelemetry one. Shigola does emit a `postgis.query` client span around the call, so the query is visible and timed — what does not happen is the trace continuing into the database. |
| S3 cache tier | No. The AWS SDK v1 client has no OpenTelemetry hook. |
| Azure Blob cache tier | No. The Azure SDK has its own tracing abstraction rather than OpenTelemetry's. |

For the three that do not, the call's latency is still visible as the duration of
the `provider.MVTForLayers` or `cache.tier.*` span containing it — but the trace
stops there rather than continuing into the database or the object store.

Two details about the GCS case. Its spans are the HTTP transport's, at request
level — the Google Cloud Storage client's own operation spans are gated behind
an experimental `GO_STORAGE_DEV_OTEL_TRACING` flag that Shigola does not set. And
the transport is built before tracing is installed, so it works only because
OpenTelemetry's global propagator delegates rather than being captured at
construction.

The GCS client also reads the global *meter* provider, which Shigola leaves as a
no-op, so none of this adds metrics.

## Relationship to logs

Every log record written while serving a traced request carries `trace_id` and
`span_id` as top-level fields, which is what makes a trace in Tempo reach the
log lines it produced and a log line reach its trace. The fields, the Grafana
datasource wiring for both directions, and the sampling caveat are on the
[Logging](./logging.md#trace-correlation) page.

## Relationship to metrics

Tracing and metrics are switched on independently — `[tracing]` and `[observer]`
are separate sections and neither implies the other. Metrics stay the Prometheus
observer's job: nothing in the tracing path registers a Prometheus collector or
installs an OpenTelemetry meter provider, so a build with tracing enabled
publishes exactly the metric families it published before, which Shigola's own
test suite asserts rather than assuming.

With both enabled, though, the two signals are joined in one direction: the
duration histograms carry the active trace as a **Prometheus exemplar**.

Use both. Metrics tell you *that* something is slow across the whole fleet;
traces tell you *where*, for one request. Exemplars are what get you from the
first to the second without a search.

### Trace exemplars

Each duration observation made inside a **sampled** trace carries that trace and
span, so a bucket in a Grafana histogram panel shows a dot you can click:

| Family | The exemplar names |
|:---|:---|
| `shigola_cache_duration_seconds` | the cache operation as a whole |
| `shigola_cache_tier_duration_seconds` | that tier's own read, write or purge |
| `shigola_api_duration_seconds` | the request |

The labels are `trace_id` and `span_id` — the same names the
[log records](./logging.md#trace-correlation) carry.

`span_id` names the operation measured rather than the request, which is the
point on the per-tier family: a slow bucket there lands on the tier read that
was slow, on the one histogram whose
[whole purpose](./layered-cache.md#tier-latency-and-why-it-used-to-look-identical-everywhere)
is telling tiers apart.

Nothing is attached to an observation made outside a trace, or inside an
unsampled one. The observation is recorded exactly as it would have been, with
no empty label — so a panel looks the same as before, minus the dots.

### Wiring it up in Grafana

Three things have to be true, and each fails quietly on its own.

**The scraper must ask for OpenMetrics.** It is the only exposition format that
encodes exemplars; the classic Prometheus text format has no syntax for them and
drops them without a word. Prometheus asks for it by default, and Shigola's
`/metrics` answers in it — so this is normally already true, and worth checking
first if the dots never appear.

**The server must store them.** Prometheus needs
`--enable-feature=exemplar-storage`; Mimir has its own equivalent. Without it
the exemplars are scraped and discarded.

**The Prometheus datasource needs the link.** In its *Exemplars* section, add
one with the label name `trace_id` and the Tempo datasource as its target:

```yaml
exemplarTraceIdDestinations:
  - name: trace_id
    datasourceUid: <your Tempo datasource uid>
```

Without it the exemplars still render as dots on the panel, with nothing behind
them.

:::warning
**An exemplar is only ever a link, so unsampled traces are deliberately left
out.** Prometheus keeps one exemplar per bucket and overwrites it with the next
observation to land there, so the stored one is almost always the most recent —
and at the default `sample_ratio = 0.01` the most recent observation is almost
never sampled. Attaching them regardless would make clicking a bucket open
nothing roughly 99 times out of 100. This is the opposite of what
[log records](./logging.md#trace-correlation) do with the same trace, and for
the opposite reason: a log line's trace id still groups that request's lines
whether or not Tempo kept the trace.
:::

### Two limits

**`le` label values changed.** Under OpenMetrics a boundary that renders as a
whole number is written with a trailing `.0`, and a label value is part of a
series' identity — so `le="1"` is now `le="1.0"`, which Prometheus sees as a
different series.

| Family | Respelled boundaries |
|:---|:---|
| `shigola_cache_duration_seconds`, `shigola_cache_tier_duration_seconds` | `1`, `5` |
| `shigola_api_duration_seconds` | `1`, `5`, `10` |
| `shigola_cache_response_size_bytes`, `shigola_cache_tier_response_size_bytes` | `1024`, `5120`, `25600`, `102400`, `256000`, `512000` |
| `shigola_api_response_size_bytes` | `512000` |

Two things about that table are worth reading twice. `2.5` is **not** in it — it
already contains a `.` — and nor are the megabyte boundaries, which render as
`1.048576e+06` and `5.24288e+06`. And the **response-size** families are in it
even though they carry no exemplars: the format is negotiated once per scrape,
not per family.

Anything matching an exact `le` — a recording rule, a panel pinned to one
bucket — needs checking against the new spelling. It was the price of exemplars
being scrapeable at all.

**Pushed metrics carry no exemplars.** A deployment using the observer's
`push_url` pushes through the classic text format to a Pushgateway, which has no
notion of them. Everything above applies to scraped deployments only.

## Spans

| Span                                                     | Where it starts                                                                                   |
|:---------------------------------------------------------|:--------------------------------------------------------------------------------------------------|
| `GET <route>`                                            | per request, named for the route pattern rather than the path — a tile server's paths are unbounded |
| `cache.Get` / `cache.Set` / `cache.Purge`                | the cache as a whole                                                                              |
| `cache.tier.Get` / `cache.tier.Set` / `cache.tier.Purge` | one tier of a chain, carrying `shigola.cache.tier`                                                |
| `atlas.Encode`                                           | the encode, carrying the map, scheme and tile coordinates                                          |
| `provider.MVTForLayers`                                  | the provider query, carrying `shigola.provider` and `shigola.layer_count`                          |
| `postgis.query`                                          | the `ST_AsMVT` round trip — see [The query span](#the-query-span)                                   |

Attributes live in Shigola's own `shigola.*` namespace, because the OpenTelemetry
semantic conventions have nothing for a tile or a cache tier.

### The query span

`postgis.query` is the exception: it uses the OpenTelemetry **database**
conventions, which do exist and which Grafana and Tempo render specially.

| Attribute                       | What                                            |
|:--------------------------------|:------------------------------------------------|
| `db.query.text`                 | the statement, parameterised                    |
| `db.system.name`                | `postgresql`                                    |
| `db.namespace`                  | the database name                               |
| `server.address`, `server.port` | the server the query went to                    |
| `shigola.db.query_truncated`    | present when the statement hit the size cap     |

Its **duration is the database's own time**, where the enclosing
`provider.MVTForLayers` also covers assembling the SQL. That is the split worth
having: a tile that took 300ms because the query took 295ms is a database
problem, and one where the query took 5ms is not.

Three things about `db.query.text`:

- **No parameter values.** Configured query parameters are passed to the driver
  as arguments, so the statement holds `$1` placeholders — which is what the
  conventions ask for, and what keeps client-supplied values out of traces.
- **No credentials.** The server attributes come from three fields of the
  connection config — host, port, database — and not from the user or password
  it also holds.
- **Capped at 8KiB**, cut on a UTF-8 boundary, with
  `shigola.db.query_truncated` set when it cuts. A tile query is one statement
  per layer, unioned, with the tile's tokens substituted, so a wide map
  produces a large one.

The statement is built only for a span that is being recorded, so tracing off
or a sampling miss costs no string work, and
`shigola_mvt_provider_query_seconds` is unaffected.

A failed operation records its error on the span. The span's *status* is set to
error only when the failure is Shigola's own: a read that failed because the
client disconnected is recorded but not marked failed, which is the same line
`shigola_cache_tier_errors_total` draws.

A cache read failure is still a **miss, not an error**, to the caller. A dead
tier is logged, counted, spanned and skipped, and a chain where every tier
failed returns a miss. Tracing does not change that.

## Overhead when disabled

None. A disabled config returns the no-op backend before an exporter is dialled
or a batch processor started, and that backend's instrumentation hooks return
what they were given — so a process with tracing off carries no tracing
decorator at all, rather than one starting a discarded span per cache read.

## Shutdown

Spans are exported in batches, so up to a batch interval's worth are held in
memory at any moment — and the traces most worth having are usually the ones
from just before a shutdown. `shigola serve` and
[`shigola cache seed|purge`](cache-seeding-and-purging.md) flush on the way out,
after the cache write pool has drained so that the drain's own spans are
included.

The flush is bounded at two seconds. A collector that has gone away does not
fail fast, and an unbounded flush would turn a missing trace into a failed
rolling deploy.
