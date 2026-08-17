---
title: Support
description: Where to ask for help with Tegola and with this fork
---

# Support

## Which project is your question about?

This site documents a [fork of Tegola](/documentation/about-this-fork). The fork is additive, so most
behaviour is upstream Tegola's and most questions belong upstream.

**Ask upstream** — [go-spatial/tegola issues](https://github.com/go-spatial/tegola/issues) — about
anything this fork did not change: providers, layer SQL, geometry processing, the native
`/maps/...` routes, the viewer, TileJSON, Lambda, observability, build flags.

**Ask here** — [NivGreenstein/tegola issues](https://github.com/NivGreenstein/tegola/issues) — about
the three things the fork adds:

- [OGC API - Tiles](/documentation/ogc-api-tiles) — the `/collections`, `/tiles` and
  `/tileMatrixSets` surface, conformance, content negotiation
- [Tile matrix sets](/documentation/tile-matrix-sets) — `tile_matrix_sets`, WorldCRS84Quad,
  WGS1984Quad
- [Layered cache](/documentation/layered-cache) — `type = "multi"`, `timeout_ms`, detached writes,
  the `--cache-tiers` and `--tile-matrix-set` flags

If you are not sure, upstream is the better first guess — and if it turns out to be a fork
regression, that is useful information to arrive with.

Issues with **these docs** go to
[NivGreenstein/tegola-docs](https://github.com/NivGreenstein/tegola-docs/issues).

## Community

Tegola has an active community that answers questions:

- [gophers#go-spatial on Slack](https://app.slack.com/client/T029RQSE6/C029RQSEE/)
- [go-spatial/tegola discussions and issues](https://github.com/go-spatial/tegola/issues)

## Commercial support

Commercial support is offered for **Tegola**, by the Go Spatial team and their partners — not by
this fork, which is not a commercial product and comes with no support commitment. See the
[official support page](https://tegola.io/support/) for what is covered and who to contact.

## Contributing

Where a change in this fork is generally useful, it belongs upstream rather than here. Upstream pull
requests are based on the release-candidate branch named for the next version, not `master`. See
[CONTRIBUTING.md](https://github.com/go-spatial/tegola/blob/master/CONTRIBUTING.md).
