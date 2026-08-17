# tegola docs — fork

This repo hosts the docs for a **fork** of [Tegola](https://github.com/go-spatial/tegola), the open
source vector tile server created and maintained by the [Go Spatial](https://github.com/go-spatial)
team. The fork lives at [NivGreenstein/tegola](https://github.com/NivGreenstein/tegola) and adds
OGC API - Tiles, multiple tile matrix sets, and a layered cache.

**This is not the official Tegola documentation.** That is at [tegola.io](https://tegola.io), built
from [go-spatial/tegola-docs](https://github.com/go-spatial/tegola-docs), which this repo is forked
from. Tegola and these docs are MIT licensed; all credit for Tegola belongs upstream.

To build the docs you will need [Hugo](https://gohugo.io/) version v0.80.0 or newer.

### Serving the docs locally

Navigate to the repository and then run `hugo server`.

### Deploying the docs

Deployment is automatic: **[`.github/workflows/gh-pages.yml`](.github/workflows/gh-pages.yml)** builds
the site and publishes it to GitHub Pages on every push to `master`, and on demand from the Actions
tab. The published site is <https://nivgreenstein.github.io/tegola-docs/>.

**One-time setup:** in the repository's *Settings → Pages*, set **Source** to **GitHub Actions**. The
workflow deploys the build artifact directly — there is no `gh-pages` branch and nothing built is
committed.

The workflow pins Hugo to the version this site is verified against (`0.101.0`, extended). Bumping it
past 0.146 requires config changes first — `paginate` was removed in favour of
`pagination.pagerSize`.

`--baseURL` is supplied by the workflow from the Pages URL, so the site works under the
`/tegola-docs/` subpath without the value being hard-coded here. To reproduce a deploy build locally:

```bash
hugo --minify --baseURL "https://nivgreenstein.github.io/tegola-docs/"
```

Plain `hugo` writes to `docs/`, which is ignored by .gitignore.

> **Note:** `static/CNAME` was removed from this fork. Upstream it contained `tegola.io`; a fork must
> not deploy to the official domain. If you move this site to your own domain, add a `static/CNAME`
> with that hostname and set it in *Settings → Pages*.

### Keeping in sync with the fork

The pages describing fork-specific behaviour are derived from documentation kept in the code repo,
which is the source of truth:

| Docs page | Source in `NivGreenstein/tegola` (branch `feat/ogc-tiles`) |
|:---|:---|
| `documentation/ogc-api-tiles.md` | `docs/ogc-api-tiles.md` |
| `documentation/tile-matrix-sets.md` | `docs/ogc-api-tiles.md`, `tms/doc.go`, `tms/registry.go` |
| `documentation/layered-cache.md` | `README.md` § "Layered cache" |
| `documentation/configuration.md` § Redis | `cache/redis/README.md` |
