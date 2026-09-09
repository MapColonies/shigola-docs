---
id: logging
title: "Logging in Shigola"
sidebar_label: "Logging"
sidebar_position: 11
description: "Managing logging output in Shigola"
---

## Log Levels

In decreasing order of severity. Logs below the set level are ignored.

- `error` - prevents a valid execution, i.e. can't connect to a database
- `warn` - unusual but does not prevent a valid execution, i.e. deprecation warnings
- `info` - (default) least severe level a sysadmin would want, i.e. request logs
- `debug` - high level detail for developers, verbose
- `silent` - emit nothing at all

### Set Log Levels

Log levels can be set on start up. The value is case-insensitive, and anything
unrecognised falls back to `info` rather than failing to start.

```bash
/opt/shigola serve --log-level info
```


