# Autonomous Implementation Instructions

You are implementing CompanySim from the specifications in this repository.

Your objective is to produce a working end-to-end local product, not a prototype collection.

## 1. Read before coding

Read, in order:

1. `00_README_FIRST.md`
2. `PRD.md`
3. `DECISIONS.md`
4. `ARCHITECTURE.md`
5. `DATA_MODEL.md`
6. `GENERATION_ENGINE.md`
7. interface specifications
8. `TESTING_STRATEGY.md`
9. `ACCEPTANCE_TESTS.md`
10. `MVP_TASKS.md`

Treat `DECISIONS.md` as binding unless a decision is technically impossible with current dependencies.

If a change is necessary, document it in `IMPLEMENTATION_NOTES.md` with:

- decision being changed,
- reason,
- alternatives considered,
- migration impact.

Do not silently redesign the product.

## 2. Work autonomously

Do not stop for cosmetic questions.

When a detail is unspecified:

1. choose the smallest reasonable implementation,
2. keep it reversible,
3. document the choice,
4. continue.

Only treat a question as blocking if continuing would risk major data-model or compatibility rework.

## 3. Implementation priority

Always prefer vertical completeness over horizontal breadth.

Example:

A working flow:

```text
Generate company -> persist -> REST -> MCP -> UI inspect
```

is more important than adding fifteen extra entity types.

## 4. No fake completion

Do not mark a milestone complete because types/interfaces exist.

A feature is complete only when:

- implemented,
- integrated,
- tested,
- reachable through intended surface,
- documented where required.

## 5. Test continuously

After each meaningful milestone run:

```text
typecheck
lint
tests
build
```

Fix regressions immediately.

Do not accumulate known red tests while moving to the next milestone.

## 6. Current dependency verification

Before adopting or pinning a major external dependency, check its current official documentation.

Especially verify:

- official MCP TypeScript SDK package names and stable API,
- OpenAI SDK current recommended API,
- Anthropic SDK current recommended API,
- Node.js compatibility,
- Hono integration patterns,
- SQLite driver compatibility.

Do not rely on stale examples in random blog posts.

## 7. MCP

Use the current stable official MCP SDK.

Support:

- stdio,
- Streamable HTTP.

Do not implement the protocol from scratch.

Do not prioritize deprecated transports unless required for a concrete compatibility test.

## 8. LLM providers

Use official provider SDKs where practical.

Provider code must stay behind CompanySim interfaces.

Never require a provider key for Lite mode.

Never expose keys to browser JavaScript.

## 9. Database

Use SQLite.

Apply migrations on startup.

Enable foreign keys.

Add indexes intentionally.

Use FTS5 for search in V0.

Do not add Postgres/Redis because they appear more scalable.

## 10. Determinism

Do not use uncontrolled randomness in structural generation.

Any use of time/current date that affects structural output must be represented in normalized generation configuration or otherwise made reproducible.

Tests must prove deterministic structural hashes.

## 11. UI

Do not over-invest in design before core acceptance tests work.

The local UI should be polished enough to use and demo, but functionality wins.

## 12. Documentation while building

Maintain:

```text
IMPLEMENTATION_NOTES.md
CHANGELOG.md
README.md
```

`IMPLEMENTATION_NOTES.md` should record deviations, technical caveats, and follow-ups.

## 13. Git discipline

Prefer small logical commits.

Suggested pattern:

```text
chore: initialize workspace
feat(schema): add canonical entities
feat(generator): add deterministic people hierarchy
feat(rest): expose people endpoints
feat(mcp): add search_company
```

Do not commit secrets, generated provider responses containing secrets, local databases, or large build artifacts.

## 14. Security

Before every release candidate:

- inspect logs for secrets,
- inspect DB/snapshots for secrets,
- verify loopback defaults,
- test malicious path names for snapshots/import/export,
- run dependency/security checks.

## 15. Final autonomous build objective

Stop only when either:

A. all public-alpha acceptance tests pass, or
B. a clearly documented external blocker prevents completion.

If B occurs, leave the repository in a runnable state and document:

- blocker,
- exact failing test,
- what has already been implemented,
- next concrete action.

Do not stop at scaffolding.
