# Docker and Local Runtime Specification

## 1. Goal

One container should run the complete local CompanySim experience:

- runtime,
- SQLite,
- REST,
- MCP HTTP,
- browser UI,
- generation worker.

## 2. Image

Working image:

```text
ghcr.io/companysim/companysim
```

## 3. Basic run

Recommended documentation example:

```bash
docker run --rm \
  -p 127.0.0.1:4545:4545 \
  -v "$(pwd)/company-data:/data" \
  ghcr.io/companysim/companysim:latest
```

Then open:

```text
http://localhost:4545
```

## 4. BYOK example

```bash
docker run --rm \
  -p 127.0.0.1:4545:4545 \
  -v "$(pwd)/company-data:/data" \
  -e ANTHROPIC_API_KEY \
  ghcr.io/companysim/companysim:latest
```

Do not encourage keys embedded directly in shell history where avoidable.

## 5. Container paths

```text
/data/company.db
/data/config.json
/data/snapshots/
/data/logs/
```

Static UI assets live in the image, not the volume.

## 6. Container networking

Inside container the server can bind:

```text
0.0.0.0:4545
```

Documentation should recommend host mapping:

```text
127.0.0.1:4545:4545
```

so it remains local by default.

## 7. Health check

Endpoint:

```text
GET /health
```

Health result should distinguish:

- process alive,
- database ready,
- migration state,
- generation worker ready.

Do not require external AI provider connectivity for overall runtime health.

## 8. Dockerfile requirements

- multi-stage build,
- production dependencies only in final image,
- non-root user where practical,
- deterministic install using lockfile,
- no API keys baked into layers,
- reasonable image size,
- healthcheck,
- clean SIGTERM handling.

## 9. Docker Compose example

Provide an example compose file in repository.

Single service only for V0.

Do not add Postgres/Redis sidecars.

## 10. Native CLI runtime

Docker is recommended but native CLI must work without Docker.

Native paths should follow platform conventions where practical, with explicit `--data-dir` override.

## 11. Locking

Protect users from accidentally starting two write-capable runtimes over the same company DB.

Implement a simple process/runtime lock or reliable detection strategy.

Read-only client access through the running server is preferred over direct concurrent DB writes.

## 12. Updates/migrations

On startup:

- inspect schema version,
- make backup or checkpoint if migration is potentially destructive,
- run migration,
- refuse unsafe downgrade.

Snapshot/export formats must be versioned.
