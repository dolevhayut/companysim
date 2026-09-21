# CompanySim — Autonomous Build Handoff

This folder is the implementation source of truth for the first public version of CompanySim.

## Product in one sentence

CompanySim is an open-source, local-first synthetic company runtime that lets developers and product teams spin up a coherent fictional organization and access it through REST, MCP, CLI, and a local browser UI.

## Primary product promise

> Spin up an entire company on your machine.

The runtime must work locally, without a cloud account, and must remain useful without any LLM provider. AI enrichment is optional and BYOK.

## Build order

Read these files in this order before changing code:

1. `PRD.md`
2. `DECISIONS.md`
3. `ARCHITECTURE.md`
4. `DATA_MODEL.md`
5. `GENERATION_ENGINE.md`
6. `REST_API.md`
7. `MCP_SPEC.md`
8. `CLI_SPEC.md`
9. `LOCAL_WEB_UI.md`
10. `DOCKER_RUNTIME.md`
11. `SECURITY_BYOK.md`
12. `TESTING_STRATEGY.md`
13. `ACCEPTANCE_TESTS.md`
14. `MVP_TASKS.md`
15. `ROADMAP.md`
16. `CODEX.md`

## Non-negotiable product principles

- Local-first.
- Docker-first.
- Rich CLI.
- Local browser UI for non-developers.
- SQLite for the first public version.
- One application core shared by CLI, REST, MCP, and Web UI.
- Structural company generation does not require an LLM.
- OpenAI and Anthropic are optional BYOK providers.
- Provider keys are never stored inside the generated company database, snapshots, logs, or exports.
- REST and MCP are adapters over the same domain services.
- Same seed + same configuration + same generator version produces the same structural company.
- Generated content may be probabilistic, but structural references must always be valid.
- The product models a company, not a pixel-perfect clone of Salesforce, Slack, Jira, or Microsoft 365.

## Definition of a real first release

A new user can run a Docker command, open localhost, generate a company, and then query that same company through both REST and MCP without editing source code.

The release is not complete if it only contains:

- schemas,
- mocks,
- static JSON,
- a UI prototype,
- an MCP demo,
- or a REST demo.

All major surfaces must operate over one persisted local company state.

## Working name

`CompanySim` and package names beginning with `companysim` are working names. Keep naming centralized so the repository can be renamed later without architectural changes.
