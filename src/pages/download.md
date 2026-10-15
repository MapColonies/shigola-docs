---
title: Download
description: Get a build of Shigola
---

# Download

## Releases

Prebuilt binaries: **[MapColonies/shigola releases](https://github.com/MapColonies/shigola/releases)**.

## From source

```sh
git clone https://github.com/MapColonies/shigola.git
cd shigola
go build ./cmd/shigola
```

The build downloads its Go modules and verifies each against `go.sum`, so it needs network access to
the Go module proxy. To build offline, see "Dependencies" in the repository's `CONTRIBUTING.md`.

## Docker

```sh
docker build -t shigola .
docker run -v /path/to/config:/opt/shigola_config -p 8080:8080 shigola serve
```

## Next steps

Once you have a binary, read the [Getting Started guide](/documentation/getting-started), then
[About Shigola](/documentation/about) for the three behaviours worth knowing before a first
deployment.
