# Testing Strategy

## 1. Philosophy

CompanySim's quality is defined less by UI polish and more by coherence, reproducibility, and interface parity.

Tests must prove the generated company is structurally valid.

## 2. Test layers

### Unit tests

Test:

- seeded RNG,
- distributions,
- ID generation,
- timeline resolution,
- permission rules,
- schema validation,
- cost/budget helpers,
- provider error normalization.

### Property/invariant tests

Generate many small companies across seeds and verify invariants:

- no manager cycles,
- no self-management,
- all foreign IDs resolve,
- current role history resolves,
- all project owners exist,
- customer ownership references exist,
- message senders exist at message timestamp,
- document authors exist at document timestamp,
- no duplicate IDs.

### Repository/integration tests

Use real temporary SQLite databases.

Test:

- migrations,
- CRUD repositories,
- FTS indexing,
- transactions,
- snapshot/restore,
- job recovery.

### REST tests

Start real local server in test process and verify:

- health,
- pagination,
- filters,
- errors,
- actor filtering,
- search,
- OpenAPI endpoint.

### MCP tests

Test both:

- stdio,
- Streamable HTTP.

Use a real MCP client from the official SDK if practical.

### REST/MCP parity tests

For equivalent operations, compare normalized domain results.

### CLI tests

Test:

- non-interactive flows,
- JSON output,
- exit codes,
- `doctor`,
- create/serve/snapshot lifecycle.

### UI E2E tests

Use browser automation for critical paths:

1. first-run wizard,
2. generate Lite company,
3. dashboard loads,
4. inspect employee,
5. developer screen shows endpoints,
6. create snapshot,
7. restore snapshot.

## 3. Provider tests

Do not require real provider API calls for most CI.

Create fake provider implementations.

Test adapters with mocked HTTP/SDK boundaries.

Optional nightly/manual smoke tests may use real provider credentials if configured securely.

## 4. Golden fixtures

Maintain a few tiny deterministic companies from fixed seeds for regression tests.

Do not use giant checked-in SQLite binaries unless necessary.

Prefer generation during tests if fast enough.

## 5. Determinism test

For each supported generator version:

```text
same normalized config + same seed => same structural canonical hash
```

Create a canonical structural serialization that excludes volatile timestamps and generative prose.

Hash and compare.

## 6. Snapshot test

Workflow:

1. generate company,
2. record canonical state hash,
3. mutate allowed state or create additional data,
4. restore snapshot,
5. compare to original hash.

## 7. Migration test

For each migration:

- migrate fresh DB from zero,
- migrate previous fixture DB,
- run integrity checks,
- start runtime.

## 8. Performance smoke tests

At minimum test a medium profile:

```text
250 employees
40 customers
30 projects
2k documents
10k messages
```

Measure:

- generation duration,
- DB size,
- server startup,
- common query latency,
- search latency.

Do not turn alpha CI into a heavyweight benchmark suite; record trends.

## 9. Required CI gates

Before merge to main:

```text
typecheck
lint
unit tests
integration tests
REST tests
MCP tests
build
```

Before release:

```text
all above
Docker build
Docker smoke test
UI E2E critical path
CLI packaged smoke test
```
