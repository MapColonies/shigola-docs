---
title: Download
description: Get a build of this fork, or of upstream Tegola
---

# Download

## This fork

Builds of [NivGreenstein/tegola](https://github.com/NivGreenstein/tegola) — Tegola plus
[OGC API - Tiles](/documentation/ogc-api-tiles), [tile matrix
sets](/documentation/tile-matrix-sets) and a [layered cache](/documentation/layered-cache):

- **[Releases](https://github.com/NivGreenstein/tegola/releases)**

Or build from source. The GeoPackage provider needs CGO; everything else builds without it:

```sh
git clone https://github.com/NivGreenstein/tegola.git
cd tegola
go build -mod vendor ./cmd/tegola
```

Dependencies are vendored, so `-mod vendor` builds offline and pins exactly what CI used.

## Upstream Tegola

If you do not need what this fork adds, take upstream — it is the maintained project, and these docs
only differ from [tegola.io](https://tegola.io) where the fork does:

- **[Releases](https://github.com/go-spatial/tegola/releases)**, including prebuilt CGO binaries
- **Docker:** `docker pull gospatial/tegola` —
  [details on Docker Hub](https://hub.docker.com/r/gospatial/tegola/)

## Next steps

Once you have a binary, read the [Getting Started guide](/documentation/getting-started), then
[About this fork](/documentation/about-this-fork) for the two ways this build's behaviour differs
from upstream.
