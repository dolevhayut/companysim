# Locked Product and Architecture Decisions

This file exists to stop autonomous implementation from drifting.

These decisions are considered locked for V0 unless implementation evidence proves they block delivery.

## D-001 — Local runtime is the product

CompanySim is not primarily a library and not primarily a web app.

The first product is a local runtime exposing one persisted synthetic company through multiple adapters.

## D-002 — One core, multiple adapters

CLI, REST, MCP, and Web UI must call the same application/domain services.

Do not duplicate business logic inside route handlers, MCP tools, UI actions, or CLI commands.

## D-003 — TypeScript + Node.js

Use TypeScript with strict settings on a currently supported Node.js LTS/runtime line.

Do not rewrite the core in Python, Go, Rust, or another language for V0.

## D-004 — Monorepo

Use a workspace-based monorepo.

Recommended: pnpm workspaces.

Avoid heavyweight monorepo tooling unless it adds clear value.

## D-005 — SQLite first

SQLite is the V0 persistence layer.

No Postgres, Redis, Kafka, or external database is required to run the local product.

Use migrations and indexes from day one.

## D-006 — Hono-class lightweight HTTP server

Use Hono or another lightweight Web-standard HTTP layer if implementation compatibility requires it.

Do not introduce Next.js as the runtime server.

The browser UI can be a separate compiled React application served as static assets by the runtime.

## D-007 — React + Vite local UI

The local control panel should be a small SPA built separately from the runtime and served from localhost.

It is an operator/debug UI, not a full SaaS dashboard.

## D-008 — Official MCP SDK

Use the current stable official Model Context Protocol TypeScript SDK.

Support:

- stdio,
- Streamable HTTP.

Do not implement MCP framing manually.

Do not prioritize deprecated legacy HTTP+SSE transport.

## D-009 — Structural generation is deterministic

Core company structure must not depend on an LLM.

The LLM enriches content; it does not define organizational truth.

## D-010 — BYOK only for V0

CompanySim does not proxy paid inference through a CompanySim-owned account in the open-source V0.

Users provide provider credentials.

## D-011 — Initial providers

Implement adapters for:

- OpenAI,
- Anthropic.

All provider-specific code is isolated behind a provider interface.

## D-012 — No secret persistence in company data

Provider keys never enter the database, snapshots, exports, generated company files, or logs.

## D-013 — FTS before vectors

Use SQLite FTS5 and deterministic relation expansion before adding embeddings.

Semantic search is not required to launch.

## D-014 — Persist everything important

Company state, generation jobs, events, metadata, and snapshots must survive restarts.

Do not keep core state only in memory.

## D-015 — IDs are stable

Entity IDs must be stable for the same seed/configuration/generator-version combination.

## D-016 — Time is first-class

Relationships and roles may change over time.

Generated historical content must use entity state valid at that timestamp.

## D-017 — No real SaaS emulation in V0

Do not spend V0 building fake Slack UI, fake Salesforce UI, fake Jira UI, or protocol-compatible clones of those products.

Represent the underlying company concepts through CompanySim's normalized model.

## D-018 — Docker is a first-class installation path

A Docker image must run the whole product.

Persistence uses a mounted volume.

## D-019 — CLI remains first-class

Every important lifecycle action available in the browser UI should have a CLI equivalent unless the action is purely visual.

## D-020 — Browser UI is local

No account creation is required to open the local UI.

## D-021 — Open-source version must not be intentionally crippled

Local generation, REST, MCP, CLI, UI, snapshots, and BYOK belong in the open-source product.

Future paid cloud value should come from hosting, scale, collaboration, scenario packs, managed infrastructure, and enterprise features.

## D-022 — Build smallest coherent system first

A small, end-to-end product beats a broad collection of disconnected components.

Before adding extra entities or UI polish, prove:

Generation → Persistence → REST → MCP → UI → Snapshot/Restore.
