---
id: cache-seeding-and-purging
title: "Cache Seeding and Purging"
sidebar_label: "Cache Seeding and Purging"
sidebar_position: 9
description: "Using the cache command to seed and purge the cache"
---

# Overview
The cache command manually manipulates Tegola's cache

> **Fork differences.** [This fork](./about-this-fork.md) adds two flags and
> changes one behaviour:
>
> - [`--tile-matrix-set`](#tile-matrix-set) — one run covers one
>   [tiling scheme](./tile-matrix-sets.md).
> - [`--cache-tiers`](#cache-tiers) — which tiers of a
>   [layered cache](./layered-cache.md) a run may write.
> - [`--overwrite`](#cache-tiers) now also **purges the tiers it does not write**.
>
> Also: cache keys gained a leading `{tileMatrixSetId}`, so a cache carried over from upstream Tegola
> must be purged and re-seeded before it will be read again. And `--bounds` landing exactly on a tile
> edge no longer includes the tile on the far side.

**Examples**

- [Simple seed](#seed1)
- [Simple purge](#purge1)
- [tile_name](#seed_tile_name)
- [Simple tile list](#tile-list1)
- [Tile name format](#tile-name-format1)

**Note:** The `tile-list` methods of fetching tiles is inefficient and will regenerate lower zoom tiles repeatedly.

### Global Flags

Global Flags are valid for all subcommands

Running `./shigola cache -h` will give a lost of flags with descriptions:

```
Available Commands:
  seed        seed tiles to the cache
  purge       purge tiles from the cache

Flags:
  -h, --help   help for cache
Global Flags:
      --config string   path to config file (default "config.toml")
```


## Seeding/Purging

These subcommands are used to manipulate Tegola's cache.

#### Flags

```
Available Commands:
  tile-list   operate on a list of tile names separated by new lines
  tile-name   operate on a single tile formatted according to --format

Flags:
      --bounds string           lng/lat bounds to seed the cache with in the format: minx, miny, maxx, maxy (default "-180,-85.0511,180,85.0511")
      --bounds-srid int         the srid --bounds are given in. only 4326 (lng/lat) is supported (default 4326)
      --cache-tiers string      for a layered cache, the comma-separated tier names this run may write
      --concurrency int         the amount of concurrency to use. defaults to the number of CPUs on the machine (default 8)
  -h, --help                    help for seed
      --log-threshold int       during seeding, only log tiles that take this number of milliseconds or longer to render
      --map string              map name as defined in the config
      --max-zoom uint           max zoom to seed cache to (default 22)
      --min-zoom uint           min zoom to seed cache from
      --overwrite               overwrite the cache if a tile already exists (default false)
      --tile-matrix-set string  the tiling scheme to seed or purge, by tileMatrixSetId
```

* bounds -- The `bounds` flag is used to specify latitude and longitude bounds for seeding and purging. Using this command should be used along with the `max-zoom` and `min-zoom` flags.
* bounds-srid -- the SRID `--bounds` are given in. Only 4326 (lng/lat) is supported. **This does not select the tiling scheme** — use `--tile-matrix-set` for that.
* max-zoom -- max zoom to seed the cache, will default to 22. 
* min-zoom -- min zoom to seed the cache, will default to 0.
* log-threshold -- during seeding, only log tiles slower than this many milliseconds. Defaults to logging all tiles.

> Bounds landing exactly on a tile edge **no longer include the tile on the far side**. A run whose
> bounds were chosen to line up with tile boundaries will cover one fewer tile per edge than it did
> upstream.

[Global Flags](#global-flags)

### `--tile-matrix-set` {#tile-matrix-set}

> **Added by [this fork](./about-this-fork.md).**

Names the [tiling scheme](./tile-matrix-sets.md) to seed or purge.
**One run covers one scheme** — it enumerates a single tile pyramid, so a run cannot cover two at
once. Seed each scheme you serve.

```shell
# defaults to the map's own default scheme
$ ./shigola cache seed --map=parks --bounds="-117.25,32.5,-117.0,32.75"

# or name one explicitly
$ ./shigola cache seed --map=parks --tile-matrix-set=WorldCRS84Quad --bounds="-117.25,32.5,-117.0,32.75"
```

Without `--map`, a run defaults to `WebMercatorQuad`. If any targeted map does not support the run's
scheme, **the run fails and names those maps** rather than skipping them: seeding a map on the wrong
pyramid writes tiles no request will ever ask for, and would otherwise report success.

### `--cache-tiers` {#cache-tiers}

> **Added by [this fork](./about-this-fork.md).** No effect on a
> single-backend cache.

For a [layered cache](./layered-cache.md), which tiers a run may write.

```shell
$ ./shigola cache seed --map=osm                          # writes the LAST tier only (default)
$ ./shigola cache seed --map=osm --cache-tiers=all        # pre-warm: write every tier
$ ./shigola cache seed --map=osm --cache-tiers=hot,s3     # an explicit list
$ ./shigola cache seed --map=osm --overwrite              # write, then purge the rest
```

**`seed` writes only the last tier by default.** Seeding every tier would flood the hot tier with cold
tiles in seed order, evicting the live working set — the exact harm a chain exists to avoid. The last
tier in read order is the durable one by construction.

Two consequences: **adding a tier to an existing chain changes what `seed` writes**, and the default
**assumes tiers are ordered hot → durable, which nothing enforces** — a chain of `s3` then `redis`
makes `seed` write the hot tier and skip the durable one.

Names are validated at startup; an unknown name is an error, not a silent no-op. A tier inside a
nested chain is addressed by path (`nested/inner`). When set, `--cache-tiers` bounds promotion as well
as writes, so `--cache-tiers=s3` cannot reach the hot tier by either route.

**`--overwrite` purges the tiers it does not write, after writing them.** Without that, a re-seed with
the durable-only default would leave the hot tier serving pre-update tiles until TTL expiry — so the
command documented as the invalidation mechanism would not invalidate what users are served. Writing
first closes the window in which a concurrent read could promote the old tile back.


### cache seed

The `seed` subcommand is used to cache tiles on demand.

Note: the Tegola server does not need to be running for this command to execute. However, your caching backend does.

##### Example

<a id="seed1">Example: Simple seed</a>
```shell
$ ./shigola cache seed --bounds "-117.25,32.5,-117.0,32.75"
```
This command will seed the only tile at zoom 0, based on the layers specified in the `bonn.toml` configuration file. The `--overwrite` ensures the previously cached tile gets overwritten.

### cache purge

The `purge` command is used to remove tiles from the cache. This can be used to remove outdated data, as Tegola prioritizes the cache.

##### Example

<a id="purge1">Example: Simple purge</a>
```shell
$ ./shigola cache purge --bounds "-117.25,32.5,-117.0,32.75"
```
This command will purge the only tile at zoom 0, based on the layers specified in the `bonn.toml` configuration file.


### cache [seed|purge] tile-name

The `tile-name` command and `format` flag are used to specify tiles according to the slippy tile scheme. The `tile-name` command takes in the tile described by the format.


##### Flags

```
Flags:
      --format string   4 character string where the first character is a non-numeric delimiter followed by 'z', 'x' and 'y' defining the coordinate order (default "/zxy")
  -h, --help            help for tile-name
      --max-zoom uint   max zoom to seed cache to
      --min-zoom uint   min zoom to seed cache from
```

* min-zoom -- If specified; Tegola will generate a range of tiles (from min-zoom to max-zoom (defaults to 22)) for each tile listed in the file.
* max-zoom -- If specified; Tegola will generate a range of tiles (from min-zoom (defaults to 0) to max-zoom) for each tile listed in the file.
* format -- 4 characters string defining the tile format. See: [tile_format](#tile-name-format).

[Global Flags](#global-flags)


##### Example
<a id="seed_tile_name">Example: Simple seed tile-name</a>
```shell
$ ./shigola cache seed tile-name 0/0/0
```


### cache [seed|purge] tile-list

The `tile-list` command instructs Tegola to read tile names from a file. The file is expected to have one tile per line, where each tile is formatted according to the format flag.

##### Flags

```
Flags:
      --format string   4 character string where the first character is a non-numeric delimiter followed by 'z', 'x' and 'y' defining the coordinate order (default "/zxy")
  -h, --help            help for tile-list
      --max-zoom uint   max zoom to seed cache to
      --min-zoom uint   min zoom to seed cache from
```

* min-zoom -- If specified; Tegola will generate a range of tiles (from min-zoom to max-zoom (defaults to 22)) for each tile listed in the file.
* max-zoom -- If specified; Tegola will generate a range of tiles (from min-zoom (defaults to 0) to max-zoom) for each tile listed in the file.
* format -- 4 characters string defining the tile format. See: [tile_format](#tile-name-format).

[Global Flags](#global-flags)

##### Example

<a id="tile-list1">Example: Simple file list</a>
`expired_tiles.txt` (with `/zxy` format):
```
15/0/0
15/0/1
15/1/1
```

```shell
$ ./shigola cache seed tile-list expired_tiles.txt
```
This will read the `expired_tiles.txt` and seed the cache with the exact tiles as listed in the file.

<a id="tile-list2">Example: Non-default format tile list</a>
`expired_tiles.txt` (with `-xyz` format):
```
0-0-15
0-1-15
1-1-15
```

```shell
$ ./shigola cache seed --tile-name-format="-xyz" --tile-list="expired_tiles.txt" --overwrite
```
This will do the same as the [above example](#tile-list1) but using a different format.

<a id="tile-list3">Example: Simple file list with zooms</a>
`expired_tiles.txt` (with `/zxy` format):
```
15/0/0
```

```shell
$ ./shigola cache seed tile-list expired_tiles.txt --min-zoom=14
```
This will read the `expired_tiles.txt` and seed the cache with tiles ranging from zoom level from 14-22 that are above and below the 15/0/0 tile.


### Tile-Name-Format

The `format` allows the slippy tile format to be changed. The flag takes a string of length four, where the first character is the delimiter and the following three characters have to be "x", "y", and "z" in the desired order. For example, the definition for `z/x/y` is `/zxy`. 

<a id="tile-name-format1">Example: Tile name format</a>
```shell
$ ./shigola cache seed tile-name "0-0-18" --format="-xyz"
```
In this example the `0-0-18` will be interpreted as `(z:18, x:0, y:0)`

<a id="tile-name-format2">Example: Tile name format</a>
```shell
$ ./shigola cache seed tile-name "18 0 0" --format=" zxy"
```
In this example the `18 0 0` will be interpreted as `(z:18, x:0, y:0)`

### Global Flags

Global Flags are valid for all subcommands

* concurrency -- the amount of concurrency to use.
* config -- path to config file (default “config.toml”)
* map -- the name of the map to use from the config file 
* overwrite -- if the tile already exists overwrite it. With a [layered cache](./layered-cache.md), also purges the tiers this run did not write.
* cache-tiers -- for a layered cache, the tiers this run may write. See [`--cache-tiers`](#cache-tiers).
* tile-matrix-set -- the tiling scheme to operate on. See [`--tile-matrix-set`](#tile-matrix-set).
* log-threshold -- during seeding, only log tiles slower than this many milliseconds.
