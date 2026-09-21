# Proposed Repository Structure

```text
companysim/
├─ apps/
│  └─ web/
│     ├─ src/
│     ├─ index.html
│     └─ package.json
│
├─ packages/
│  ├─ schema/
│  │  ├─ src/entities/
│  │  ├─ src/api/
│  │  ├─ src/config/
│  │  └─ package.json
│  │
│  ├─ core/
│  │  ├─ src/services/
│  │  ├─ src/domain/
│  │  ├─ src/errors/
│  │  └─ package.json
│  │
│  ├─ database/
│  │  ├─ src/migrations/
│  │  ├─ src/repositories/
│  │  ├─ src/search/
│  │  └─ package.json
│  │
│  ├─ generator/
│  │  ├─ src/rng/
│  │  ├─ src/structural/
│  │  ├─ src/timeline/
│  │  ├─ src/content/
│  │  ├─ src/validation/
│  │  └─ package.json
│  │
│  ├─ providers/
│  │  ├─ src/openai/
│  │  ├─ src/anthropic/
│  │  ├─ src/types.ts
│  │  └─ package.json
│  │
│  ├─ search/
│  │  └─ src/
│  │
│  ├─ rest/
│  │  └─ src/
│  │
│  ├─ mcp/
│  │  └─ src/
│  │
│  ├─ server/
│  │  └─ src/
│  │
│  ├─ cli/
│  │  └─ src/
│  │
│  └─ testing/
│     └─ src/
│
├─ examples/
│  ├─ rest-client/
│  ├─ mcp-client/
│  └─ docker-compose/
│
├─ docker/
│  └─ Dockerfile
│
├─ docs/
│
├─ .github/
│  └─ workflows/
│
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ companysim.example.yaml
├─ CODEX.md
└─ README.md
```

## Dependency rules

- `schema` depends on almost nothing.
- `core` may depend on `schema`.
- `database`, `generator`, `providers`, and `search` may depend on `schema` and core interfaces as needed.
- `rest`, `mcp`, `cli` depend on application/core services.
- `server` is the composition root.
- `web` talks to REST/control endpoints; it must not import server-only packages.

Keep package boundaries enforceable through TypeScript project references, lint rules, or simple conventions.
