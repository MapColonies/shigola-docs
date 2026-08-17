# tegola docs — fork

This repo hosts the docs for a **fork** of [Tegola](https://github.com/go-spatial/tegola), the open
source vector tile server created and maintained by the [Go Spatial](https://github.com/go-spatial)
team. The fork lives at [NivGreenstein/tegola](https://github.com/NivGreenstein/tegola) and adds
OGC API - Tiles, multiple tile matrix sets, and a layered cache.

**This is not the official Tegola documentation.** That is at [tegola.io](https://tegola.io), built
from [go-spatial/tegola-docs](https://github.com/go-spatial/tegola-docs), which this repo is forked
from. Tegola and these docs are MIT licensed; all credit for Tegola belongs upstream.

Built with [Docusaurus](https://docusaurus.io/) 3. Requires Node 18+.

## Running locally

```bash
npm ci
npm start          # dev server with hot reload, at http://localhost:3000/tegola-docs/
npm run build      # production build into build/
npm run serve      # serve the production build
```

`npm run build` is the real check: `onBrokenLinks`, `onBrokenAnchors` and `onBrokenMarkdownLinks` are
all set to `throw`, so a link or heading anchor that does not resolve fails the build rather than
shipping.

## Layout

| Path | What |
|:---|:---|
| `docs/` | The documentation section, served at `/documentation/` |
| `tutorials/` | The tutorials section, a second docs plugin instance |
| `src/pages/` | Standalone pages: home, demo, support, download |
| `static/` | Passed through verbatim — images, styles, and the two standalone map pages the home and demo pages embed |
| `sidebars.js`, `sidebarsTutorials.js` | Sidebar order, written explicitly |

### Two things worth knowing before editing

**`markdown.format` is `detect`, so `.md` files are CommonMark, not MDX.** These docs are full of
`{z}/{x}/{y}` and `{tileMatrixSetId}`; under MDX every one of those is a JSX expression referencing
an undefined identifier, and the build fails. If you need MDX in a page, name it `.mdx`.

**The home and demo pages embed `static/homeMap.html` and `static/map.html` in an iframe.** Those are
standalone documents carried over from the Hugo site, with their own copies of OpenLayers and
Mapbox GL under `static/libs/`. They reference their assets relatively, so they work under the
`/tegola-docs/` base path — but they point at **upstream's** demo tile servers (`demo.tegola.io`,
`tegola-osm-demo.go-spatial.org`) via `static/config.json` and `static/homeConfig.json`. Point those
at your own tegola if you want the maps to reflect this fork.

## Deploying

Deployment is automatic: **[`.github/workflows/gh-pages.yml`](.github/workflows/gh-pages.yml)** builds
the site and publishes it to GitHub Pages on every push to `master`, and on demand from the Actions
tab. The published site is <https://nivgreenstein.github.io/tegola-docs/>.

**One-time setup:** in the repository's *Settings → Pages*, set **Source** to **GitHub Actions**. The
workflow deploys the build artifact directly — there is no `gh-pages` branch and nothing built is
committed.

`url` and `baseUrl` live in `docusaurus.config.js` rather than being injected by the workflow, so a
local `npm run build` produces exactly what gets deployed. Moving the site to another host means
changing them there.

> **Note:** `static/CNAME` was removed from this fork. Upstream it contained `tegola.io`; a fork must
> not deploy to the official domain. If you move this site to your own domain, add a `static/CNAME`
> with that hostname, set it in *Settings → Pages*, and update `url`/`baseUrl` in the config.

## Keeping in sync with the fork

The pages describing fork-specific behaviour are derived from documentation kept in the code repo,
which is the source of truth:

| Docs page | Source in `NivGreenstein/tegola` (branch `feat/ogc-tiles`) |
|:---|:---|
| `docs/ogc-api-tiles.md` | `docs/ogc-api-tiles.md` |
| `docs/tile-matrix-sets.md` | `docs/ogc-api-tiles.md`, `tms/doc.go`, `tms/registry.go` |
| `docs/layered-cache.md` | `README.md` § "Layered cache" |
| `docs/configuration.md` § Redis | `cache/redis/README.md` |
