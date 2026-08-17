---
title: Download
description: Get a build of Shigola
---

# Download

## Releases

Prebuilt binaries: **[MapColonies/shigola releases](https://github.com/MapColonies/shigola/releases)**.

## From source

The GeoPackage provider needs CGO; everything else builds without it.

```sh
git clone https://github.com/MapColonies/shigola.git
cd shigola
go build -mod vendor ./cmd/shigola
```

Dependencies are vendored, so `-mod vendor` builds offline and pins exactly what CI used.

To build with the embedded viewer regenerated, run `go generate ./...` first — it shells out to
`npm` to build the viewer, and no-ops without it.

## Docker

```sh
docker build -t shigola .
docker run -v /path/to/config:/opt/shigola_config -p 8080:8080 shigola serve
```

## Next steps

Once you have a binary, read the [Getting Started guide](/documentation/getting-started), then
[About Shigola](/documentation/about) for the three behaviours worth knowing before a first
deployment.
