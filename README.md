# shigola docs

Documentation for [Shigola](https://github.com/MapColonies/shigola), a vector tile server serving
Mapbox Vector Tiles over native routes and an OGC API - Tiles surface, with multiple tile matrix
sets and a layered cache.

Published at <https://mapcolonies.github.io/shigola-docs/>.

Licensing and the origin of this content are recorded in [LICENSE.md](LICENSE.md).

Built with [Docusaurus](https://docusaurus.io/) 3. Requires Node 18+.

## Running locally

```bash
npm ci
npm start          # dev server with hot reload, at http://localhost:3000/shigola-docs/
npm run build      # production build into build/
npm run serve      # serve the production build
```

`npm run build` is the real check: `onBrokenLinks`, `onBrokenAnchors` and `onBrokenMarkdownLinks` are
all set to `throw`, so a link or heading anchor that does not resolve fails the build rather than
shipping.

> **After deleting a page, clear both caches.** A stale build cache surfaces as
> `Cannot destructure property 'title' of 'metadata'` on pages you did not touch, which reads like a
> content bug and is not one. `npm run clear` alone is not enough:
>
> ```bash
> npm run clear && rm -rf build node_modules/.cache && npm run build
> ```
>
> CI is unaffected — `npm ci` starts from a clean `node_modules`.

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

One consequence: **admonitions cannot carry a custom title in a `.md` file.** Neither
`:::warning Title` nor `:::warning[Title]` works — the title is emitted as an `<mdxadmonitiontitle>`
element that the theme never lifts into the heading, so it renders as a stray first line and the
heading stays the generic "warning". This fails silently, with no build error. Use a plain
`:::warning` and lead the body with a bold sentence instead.

**There are no live maps on this site.** An earlier version had a `/demo` page and a map behind the
homepage hero, driven by standalone documents in `static/` with vendored 2017-era copies of
OpenLayers and Mapbox GL, pointing at third-party demo tile servers. They are gone. If you want a
demo, point one at your own Shigola deployment rather than restoring these.

## Deploying

Deployment is automatic: **[`.github/workflows/gh-pages.yml`](.github/workflows/gh-pages.yml)** builds
the site and publishes it to GitHub Pages on every push to `master`, and on demand from the Actions
tab. The published site is <https://mapcolonies.github.io/shigola-docs/>.

**One-time setup:** in the repository's *Settings → Pages*, set **Source** to **GitHub Actions**. The
workflow deploys the build artifact directly — there is no `gh-pages` branch and nothing built is
committed.

`url` and `baseUrl` live in `docusaurus.config.js` rather than being injected by the workflow, so a
local `npm run build` produces exactly what gets deployed. Moving the site to another host means
changing them there.

> **Note:** there is no `static/CNAME`. If you move this site to a custom domain, add one with that
> hostname, set it in *Settings → Pages*, and update `url`/`baseUrl` in the config.

## Keeping in sync with the fork

The pages describing fork-specific behaviour are derived from documentation kept in the code repo,
which is the source of truth:

| Docs page | Source in `MapColonies/shigola` (branch `feat/ogc-tiles`) |
|:---|:---|
| `docs/ogc-api-tiles.md` | `docs/ogc-api-tiles.md` |
| `docs/tile-matrix-sets.md` | `docs/ogc-api-tiles.md`, `tms/doc.go`, `tms/registry.go` |
| `docs/layered-cache.md` | `README.md` § "Layered cache" |
| `docs/configuration.md` § Redis | `cache/redis/README.md` |
