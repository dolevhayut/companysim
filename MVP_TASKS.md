# MVP Implementation Tasks

This is the recommended autonomous execution order.

Do not parallelize foundations that depend on unresolved schema decisions.

## Milestone 0 — Repository foundation

- [ ] initialize pnpm workspace
- [ ] strict TypeScript base config
- [ ] lint/format configuration
- [ ] Vitest
- [ ] package boundaries
- [ ] CI workflow
- [ ] root README
- [ ] `.env.example` with names only, no secrets
- [ ] release/version strategy

Exit criteria:

- all packages build,
- test command runs,
- CI passes.

## Milestone 1 — Schema and database

- [ ] canonical entity Zod schemas
- [ ] config schema
- [ ] SQLite adapter
- [ ] migration framework
- [ ] metadata table
- [ ] core entity tables
- [ ] relationships table
- [ ] events table
- [ ] generation jobs table
- [ ] FTS scaffolding
- [ ] repository interfaces + implementations

Exit criteria:

- create/open DB,
- migrate from zero,
- insert/read core entities,
- integration tests pass.

## Milestone 2 — Deterministic generator

- [ ] seeded PRNG
- [ ] normalized generation plan
- [ ] company generator
- [ ] location generator
- [ ] department/team generator
- [ ] role/person generator
- [ ] hierarchy builder
- [ ] customer generator
- [ ] project generator
- [ ] tool generator
- [ ] relationship generator
- [ ] simple event/timeline generator
- [ ] Lite document/message/ticket templates
- [ ] integrity validator
- [ ] canonical structural hash

Exit criteria:

- same seed reproducible,
- different seeds differ,
- invariant/property tests pass,
- zero broken references.

## Milestone 3 — Application services and search

- [ ] CompanyService
- [ ] PeopleService
- [ ] TeamService
- [ ] CustomerService
- [ ] ProjectService
- [ ] ContentService
- [ ] RelationshipService
- [ ] SearchService
- [ ] actor-aware visibility basics
- [ ] FTS indexing
- [ ] cross-entity search aggregation

Exit criteria:

- services can query a generated DB without HTTP.

## Milestone 4 — REST server

- [ ] server composition root
- [ ] health endpoint
- [ ] `/api/v1/company`
- [ ] stats
- [ ] people endpoints
- [ ] departments/teams endpoints
- [ ] customers/projects endpoints
- [ ] documents/messages/tickets endpoints
- [ ] tools/events/relationships endpoints
- [ ] search endpoint
- [ ] cursor pagination
- [ ] consistent errors
- [ ] OpenAPI
- [ ] API docs UI

Exit criteria:

- REST acceptance paths pass against real generated DB.

## Milestone 5 — MCP

- [ ] install current stable official MCP TS SDK
- [ ] MCP server factory
- [ ] `get_company`
- [ ] `get_company_stats`
- [ ] people tools
- [ ] customer tools
- [ ] project tools
- [ ] content search tools
- [ ] relationships tool
- [ ] `search_company`
- [ ] Streamable HTTP mount
- [ ] stdio bootstrap
- [ ] MCP integration tests
- [ ] REST/MCP parity tests

Exit criteria:

- real MCP client can call tools over both transports.

## Milestone 6 — CLI

- [ ] `init`
- [ ] `create`
- [ ] `serve`
- [ ] `status`
- [ ] `inspect`
- [ ] `search`
- [ ] `doctor`
- [ ] `mcp`
- [ ] JSON output modes
- [ ] non-interactive flags

Exit criteria:

- developer can generate + serve without Web UI.

## Milestone 7 — Snapshots

- [ ] snapshot metadata
- [ ] safe SQLite snapshot strategy
- [ ] create/list/restore/delete
- [ ] reset command
- [ ] tests

Exit criteria:

- state hash restores exactly.

## Milestone 8 — Provider abstraction and BYOK

- [ ] provider interface
- [ ] normalized provider errors
- [ ] OpenAI adapter
- [ ] Anthropic adapter
- [ ] env-key detection
- [ ] in-memory session key store
- [ ] provider test
- [ ] content job persistence
- [ ] LLM enrichment for at least documents/messages/tickets
- [ ] structured validation
- [ ] cancellation
- [ ] resume
- [ ] rough usage/cost estimate
- [ ] `maxCostUsd`

Exit criteria:

- both providers can enrich a small company when keys are provided,
- no-AI flow remains fully functional.

## Milestone 9 — Local Web UI

- [ ] Vite React app
- [ ] first-run detection
- [ ] setup wizard
- [ ] generation planning/review
- [ ] generation progress
- [ ] dashboard
- [ ] explorer lists
- [ ] entity detail views
- [ ] global search
- [ ] developer endpoints screen
- [ ] provider settings/session key
- [ ] snapshot screen
- [ ] critical E2E tests

Exit criteria:

- non-developer can perform full first-run through browser.

## Milestone 10 — Docker packaging

- [ ] production build pipeline
- [ ] multi-stage Dockerfile
- [ ] static UI included
- [ ] volume path `/data`
- [ ] healthcheck
- [ ] non-root execution where practical
- [ ] compose example
- [ ] Docker smoke test in CI

Exit criteria:

- documented one-container flow passes acceptance tests.

## Milestone 11 — Public alpha hardening

- [ ] docs cleanup
- [ ] install instructions
- [ ] examples
- [ ] security review
- [ ] dependency audit
- [ ] performance smoke test
- [ ] migration test
- [ ] release artifacts
- [ ] GitHub issue templates
- [ ] contribution guide
- [ ] changelog

Exit criteria:

- `ACCEPTANCE_TESTS.md` passes.
