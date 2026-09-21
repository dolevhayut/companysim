# Product Requirements Document — CompanySim

## 1. Overview

CompanySim is an open-source, local-first runtime for generating and serving realistic synthetic organizations.

It exists for teams building enterprise software that need an organization to develop, test, demonstrate, or evaluate against before they have access to a real enterprise customer environment.

A generated company can include:

- company metadata,
- departments,
- teams,
- employees,
- reporting lines,
- customers,
- customer contacts,
- projects,
- tasks,
- documents,
- folders,
- internal messages,
- channels and conversations,
- support tickets,
- policies,
- business processes,
- software tools,
- permissions,
- relationships,
- organizational events,
- and historical timelines.

Everything is exposed through the same local runtime via:

- REST API,
- MCP Streamable HTTP,
- MCP stdio,
- CLI,
- local browser UI.

## 2. Core problem

Enterprise software often needs realistic organizational context before the vendor has a real customer environment.

Typical missing inputs include:

- hundreds or thousands of employees,
- org charts,
- customer ownership,
- project membership,
- internal documents,
- messages,
- tickets,
- company history,
- access controls,
- cross-system relationships,
- realistic data density.

Existing fake-data generators usually create isolated records. The differentiator of CompanySim is coherence: entities refer to one another, organizational history is time-aware, and the same company can be traversed from multiple perspectives.

## 3. Product positioning

Do not position the project primarily as a faker library.

Preferred descriptions:

- Synthetic Company Runtime
- Company Simulator
- Local Enterprise Sandbox
- Programmable Company Environment

Primary message:

> Spin up an entire company on your machine.

Secondary message:

> Give your enterprise software a company to work with.

AI-focused message:

> Give your agent somewhere to work.

## 4. Target users

### AI developers
Need realistic organizational context for agents, RAG, search, tool use, and evaluations.

### Enterprise SaaS developers
Need a company-shaped environment before enterprise customer access exists.

### QA and automation engineers
Need deterministic, resettable organizational fixtures.

### Solutions engineers
Need industry-specific demo environments quickly.

### Product managers and non-developers
Need a browser-driven company generator without terminal expertise.

## 5. Core jobs to be done

1. Create a realistic organization in minutes.
2. Connect an application to the organization through REST.
3. Connect an AI client or agent through MCP.
4. Reproduce the same structural environment from a seed.
5. Inspect data through browser UI or CLI.
6. Snapshot and restore state.
7. Optionally enrich the company using the user's OpenAI or Anthropic key.
8. Eventually apply scenarios and mutate the company over time.

## 6. Product modes

### Lite
No LLM required. Fully deterministic structural generation with template-based content.

Use cases:
- CI,
- integration testing,
- fixtures,
- API development.

### Realistic
Adds LLM-generated messages, documents, tickets, policies, descriptions, and other prose.

Use cases:
- demos,
- agent testing,
- RAG,
- search.

### Deep
Higher density, richer history, more cross-references, and stronger realism.

Use cases:
- enterprise agent evaluations,
- stress testing,
- scenario testing.

Deep mode does not need to ship in the first alpha, but the architecture must allow it.

## 7. V0 entity scope

Required:

- Company
- Location
- Department
- Team
- Person
- Role
- Customer
- CustomerContact
- Project
- Task
- Document
- Folder
- Message
- Conversation
- Channel
- Ticket
- Policy
- Tool
- Permission
- Relationship
- Event

Optional after baseline:

- Process
- Meeting
- CalendarEvent
- Deal
- Invoice
- Repository

## 8. V0 functional scope

### Runtime
- single local process,
- SQLite persistence,
- startup migrations,
- health endpoint,
- graceful shutdown,
- local job queue,
- generation progress.

### REST
- entity list/get endpoints,
- filtering,
- cursor pagination,
- company-wide search,
- OpenAPI document,
- interactive docs.

### MCP
- Streamable HTTP,
- stdio,
- tools for company, people, customers, projects, documents, messages, tickets, relationships, and search.

### CLI
- init,
- create,
- generate,
- serve,
- status,
- inspect,
- search,
- snapshot,
- restore,
- reset,
- provider,
- doctor,
- export,
- import,
- mcp.

### Local Web UI
- first-run setup,
- company generation wizard,
- live progress,
- dashboard,
- entity explorer,
- developer/API screen,
- provider setup,
- snapshot/reset controls.

### AI
- OpenAI provider adapter,
- Anthropic provider adapter,
- BYOK,
- provider health test,
- generation budget,
- resumable content generation,
- provider independence.

### Packaging
- Docker image,
- Docker Compose example,
- npm CLI distribution,
- persistent data volume.

## 9. Explicit non-goals for first release

Do not build:

- a Salesforce clone,
- a Slack clone,
- a Microsoft 365 clone,
- real OAuth integrations,
- real customer data ingestion,
- enterprise SSO,
- multi-tenant cloud,
- billing,
- Kubernetes,
- Redis,
- a custom vector database,
- mobile apps,
- full workflow automation,
- a complex admin permissions product.

## 10. Structural generation requirements

The generator must produce a valid company before any LLM is used.

Structural generation includes:

- departments appropriate to company size and industry,
- teams,
- reporting hierarchy,
- employee roles,
- customers,
- project ownership,
- project participants,
- tool usage,
- visibility rules,
- relationships,
- historical events.

All generated IDs are stable inside a seed/version combination.

## 11. Generative enrichment requirements

The LLM must not invent the core organizational graph.

Before an LLM request, CompanySim creates a content job containing the allowed context and references.

Example content job:

- type: internal conversation,
- participants: known person IDs,
- project: known project ID,
- customer: known customer ID,
- date: known timestamp,
- company state at date,
- desired length,
- desired tone.

The provider generates prose only within that envelope.

Generated output must be validated before persistence.

## 12. Time-awareness

Historical consistency is required.

If a person was promoted in 2025, content from 2023 cannot refer to the person using the 2025 title.

Events are first-class state transitions.

The generator must be able to resolve an entity's effective state at a timestamp.

## 13. Search

V0 uses SQLite FTS5 plus relational/graph expansion.

Semantic embeddings are optional future functionality.

The runtime must be useful without embedding costs.

## 14. Permissions

Synthetic permissions are required because many enterprise products depend on access-aware behavior.

Initial visibility levels:

- public,
- company,
- department,
- team,
- restricted,
- private.

Queries may optionally execute as a synthetic actor.

## 15. Snapshots

A snapshot captures company state and relevant generation metadata, excluding secrets.

Required operations:

- create,
- list,
- restore,
- delete.

Snapshots are central to QA and repeatable demos.

## 16. BYOK

Supported first:

- OpenAI,
- Anthropic.

Preferred secret sources:

1. environment variable,
2. in-memory session secret from local UI,
3. future OS keychain integration.

Never persist secrets in:

- SQLite company DB,
- snapshots,
- exports,
- logs,
- config committed to disk by default.

## 17. Cost control

Before generative enrichment, estimate:

- content jobs,
- approximate input tokens,
- approximate output tokens,
- estimated provider cost where possible.

Support:

- `--max-cost`,
- generation cancellation,
- generation resume,
- partially enriched companies.

## 18. Performance targets

Target normal developer laptop.

Baseline profile:

- 1,000 employees,
- 100 customers,
- 100 projects,
- 10,000 documents,
- 50,000 messages.

Targets:

- runtime startup < 2 seconds after DB exists,
- common local lookups p95 < 100 ms where practical,
- Lite company generation under 3 minutes for baseline alpha profile,
- zero broken foreign references after validation.

## 19. Security defaults

- Native CLI server binds to `127.0.0.1` by default.
- Docker image may listen on `0.0.0.0` internally, while examples map to `127.0.0.1` on the host.
- Warn when exposed on non-loopback interfaces.
- Never log provider keys.
- Use `.test` domains for fictional organizations by default.

## 20. Definition of done for public alpha

A user can:

1. run the Docker image,
2. open localhost,
3. create a 100-person SaaS company,
4. persist it across restarts,
5. browse it in the UI,
6. call REST endpoints,
7. connect through MCP,
8. use Lite mode without any AI provider,
9. optionally provide OpenAI or Anthropic credentials for enrichment,
10. create and restore a snapshot.

The same persisted company state must be visible through all surfaces.

## 21. Success signals

Engineering signals:

- no broken entity references,
- deterministic structural regeneration,
- REST/MCP parity,
- reliable Docker startup,
- reliable reset/snapshot flows.

Product signals:

- developers use CompanySim in actual product development,
- external projects build against the local API,
- users request additional scenarios/industry packs,
- users keep generated environments rather than treating them as one-off demos.

## 22. Long-term direction

The product evolves from synthetic company generation toward programmable enterprise simulation.

Potential sequence:

1. Synthetic Company Runtime
2. Interactive Company
3. Scenario Simulator
4. Enterprise Agent Evaluation Platform
5. Hosted Company Infrastructure

The local open-source runtime must remain valuable even after a cloud product exists.
