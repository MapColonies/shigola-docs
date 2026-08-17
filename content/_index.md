---
author: "Jpalms"
date: 2017-11-29
linktitle: Home
title: Tegola
subtitle: An open source vector tile server written in Go, Tegola takes geospatial data and slices it into vector tiles that can be efficiently delivered to any client. This site documents a fork that adds OGC API - Tiles, multiple tile matrix sets and a layered cache.
---

## A fork of Tegola

[Tegola](https://github.com/go-spatial/tegola) is created and maintained by the
[Go Spatial](https://github.com/go-spatial) team and documented at [tegola.io](https://tegola.io).
This site documents [a fork of it](https://github.com/NivGreenstein/tegola) — everything upstream
Tegola does, plus three additions. See [About this fork](/documentation/about-this-fork/).

## Features

- Simple to set up. All you need is the Tegola binary and a config file.
- Extensible. Tegola is designed to support multiple data providers. Currently, supports PostGIS and GeoPackage.
- Open source. Tegola is open source and hosted on GitHub.
- Parallelized. Tegola uses all available CPUs.
- Written in Go. Go allows Tegola to be highly concurrent, lightweight and easy to deploy.
- MIT Licensed. Tegola comes with the very liberal MIT license.

## Added by this fork

- **[OGC API - Tiles](/documentation/ogc-api-tiles/).** A standards-compliant tile API alongside the
  native routes, verified against the OGC CITE test suite.
- **[Tile matrix sets](/documentation/tile-matrix-sets/).** Three OGC tiling schemes —
  WebMercatorQuad, WorldCRS84Quad and WGS1984Quad — selectable per map.
- **[Layered cache](/documentation/layered-cache/).** An ordered chain of cache backends with
  read-through promotion, per-tier read deadlines and non-blocking writes.
