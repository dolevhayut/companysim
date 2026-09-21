# Architecture Specification

## 1. Architectural goal

Build a single local application runtime that owns company state and exposes that state through multiple adapters.

The architecture must be simple enough for local use but clean enough that the same domain packages can later power hosted environments.

## 2. Logical architecture

```text
                         +-----------------------+
                         |   companysim.yaml     |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------------------+
                         | Application Services  |
                         +-----------+-----------+
                                     |
                  +------------------+------------------+
                  |                  |                  |
                  v                  v                  v
        +----------------+   +----------------+  +----------------+
        | Company Graph  |   | Generation     |  | Search         |
        | + Timeline     |   | Orchestrator   |  | + Permissions  |
        +-------+--------+   +-------+--------+  +-------+--------+
                |                    |                   |
                +--------------------+-------------------+
                                     |
                                     v
                              +-------------+
                              | SQLite      |
                              +------+------+ 
                                     |
                +--------------------+----------------------+
                |                    |                      |
                v                    v                      v
              REST                  MCP                    CLI
                |
                v
          Local Web UI
```

## 3. Recommended repository layout

```text
companysim/
  apps/
    web/

  packages/
    schema/
    core/
    database/
    generator/
    providers/
    search/
    rest/
    mcp/
    server/
    cli/
    testing/

  examples/
    node-client/
    mcp-client/
    docker-compose/

  docs/

  docker/

  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

## 4. Package responsibilities

### `@companysim/schema`

Owns:

- Zod schemas,
- TypeScript DTOs,
- configuration schema,
- canonical entity schemas,
- API request/response schemas,
- provider request/response contracts,
- event schemas,
- snapshot metadata schemas.

Must not depend on database or UI packages.

### `@companysim/core`

Owns:

- domain services,
- use cases,
- company state rules,
- relationship rules,
- temporal resolution,
- permission checks,
- snapshot orchestration interfaces,
- generation orchestration interfaces.

Must not contain HTTP-specific or MCP-specific logic.

### `@companysim/database`

Owns:

- SQLite connection,
- migrations,
- repositories,
- transaction helpers,
- FTS tables,
- database health,
- local job persistence.

### `@companysim/generator`

Owns:

- deterministic RNG,
- structural generators,
- timeline generation,
- content job planning,
- template content,
- validation/retry policy,
- generator versioning.

### `@companysim/providers`

Owns:

- provider interface,
- OpenAI adapter,
- Anthropic adapter,
- provider health checks,
- token/cost estimate helpers,
- normalized errors.

Provider SDK types must not leak into `core`.

### `@companysim/search`

Owns:

- FTS queries,
- cross-entity search aggregation,
- relationship expansion,
- actor-aware filtering.

### `@companysim/rest`

Owns:

- route registration,
- request validation,
- response mapping,
- OpenAPI generation,
- HTTP error mapping.

Route handlers call application services.

### `@companysim/mcp`

Owns:

- MCP server creation,
- MCP tools,
- MCP resources if useful,
- stdio transport bootstrap,
- Streamable HTTP handler.

MCP tools call application services.

### `@companysim/server`

Owns:

- runtime bootstrap,
- config loading,
- dependency composition,
- static UI serving,
- REST mounting,
- MCP mounting,
- lifecycle hooks,
- local job worker.

### `@companysim/cli`

Owns:

- terminal commands,
- interactive prompts,
- human-friendly output,
- process launch/management.

CLI commands call application services directly when local/in-process, or runtime APIs when that is explicitly more appropriate.

## 5. Application service layer

Create explicit service objects. Suggested starting set:

```text
CompanyService
PeopleService
TeamService
CustomerService
ProjectService
ContentService
RelationshipService
SearchService
GenerationService
ProviderService
SnapshotService
RuntimeService
```

Every adapter should depend on these services instead of repositories directly.

## 6. Dependency direction

Allowed direction:

```text
schema <- core <- adapters
schema <- database <- composition root
schema <- generator <- core/composition root
schema <- providers <- generator/composition root
```

Avoid circular package dependencies.

## 7. Persistence strategy

Use one SQLite database file per active company environment for V0.

Recommended path:

```text
/data/company.db
```

Use:

- foreign keys enabled,
- migrations,
- WAL mode after compatibility testing,
- indexes on major foreign keys and filter fields,
- FTS5 virtual tables for searchable text.

## 8. Runtime lifecycle

Startup sequence:

1. load configuration,
2. determine data directory,
3. acquire runtime lock where appropriate,
4. open SQLite,
5. apply migrations,
6. validate metadata/schema version,
7. initialize services,
8. recover generation jobs,
9. start job worker,
10. start HTTP listener,
11. mount REST,
12. mount MCP,
13. serve Web UI,
14. report readiness.

Shutdown sequence:

1. stop accepting new generation jobs,
2. stop HTTP listener,
3. finish or checkpoint active atomic job,
4. flush logs,
5. close SQLite,
6. release runtime lock.

## 9. Internal event handling

Do not introduce Kafka/event buses.

Use in-process typed domain events if useful.

Example:

```text
CompanyGenerated
GenerationProgressed
SnapshotCreated
CompanyReset
ProviderChanged
```

Persistence-critical events must not depend on an in-memory subscriber being alive.

## 10. Local generation queue

Use SQLite-backed jobs.

Suggested job states:

```text
pending
running
completed
failed
cancel_requested
cancelled
```

Each job should support progress counters.

A content generation job should be resumable at item boundaries.

## 11. Error architecture

Use typed application errors.

Examples:

```text
NotFoundError
ValidationError
ConflictError
ProviderError
PermissionDeniedError
BudgetExceededError
GenerationCancelledError
DatabaseError
```

Adapters map errors to their protocol:

- REST → HTTP status/problem response,
- MCP → tool error result,
- CLI → exit code + actionable message,
- UI → user-facing error state.

## 12. Future cloud compatibility

Do not implement cloud infrastructure now.

However:

- never assume absolute local filesystem paths inside domain logic,
- inject repositories/storage interfaces,
- keep company IDs explicit,
- avoid global mutable singleton state,
- keep provider interfaces network-agnostic,
- keep snapshot format versioned.

These seams should allow future multi-tenant composition without rewriting the company model.
