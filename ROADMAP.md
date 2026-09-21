# Product Roadmap

## Phase 0 — Coherent local runtime

Goal: prove the core product loop.

Ship:

- deterministic synthetic company,
- SQLite,
- REST,
- MCP,
- CLI,
- local browser UI,
- Docker,
- BYOK OpenAI/Anthropic,
- snapshots.

Success signal:

Developers use CompanySim instead of hand-built fixtures for real product work.

## Phase 1 — Better realism

Add:

- richer company history,
- more content archetypes,
- stronger timeline consistency,
- better permission modeling,
- industry packs,
- data density controls,
- more validation.

Potential packs:

- SaaS,
- fintech,
- manufacturing,
- professional services,
- retail.

Do not add many packs until the pack interface is stable.

## Phase 2 — Scenario engine

Add explicit state mutations:

```text
employee offboarding
customer escalation
security incident
reorganization
executive departure
major outage
product launch
customer churn
acquisition
```

Scenario application must update multiple related parts of the company consistently.

Example employee departure:

- employment state changes,
- manager/team membership changes,
- project ownership reassignment,
- permissions change,
- handover document appears,
- related tickets/messages/events appear.

## Phase 3 — Simulation clock

Add controlled time advancement:

```bash
company time advance 30d
```

Generate state evolution and new events.

Use cases:

- long-running agent testing,
- workflow regression,
- monitoring products,
- security simulations.

## Phase 4 — Evaluation toolkit

Build repeatable evaluation suites around generated/scenario companies.

Examples:

```text
Can the agent find the correct account owner?
Does the agent respect document permissions?
Can it identify the correct project after reorg?
Does it react correctly to an incident?
```

Store evaluation definitions and expected facts.

This may become a strong paid/cloud wedge later.

## Phase 5 — Hosted CompanySim Cloud

Cloud provides convenience and scale, not basic functionality.

Potential features:

- persistent hosted companies,
- stable REST/MCP URLs,
- shared team environments,
- large datasets,
- managed snapshots,
- hosted scenarios,
- scheduled reset,
- CI API,
- usage analytics,
- managed provider options,
- private industry packs.

## Phase 6 — Enterprise

Possible enterprise capabilities:

- private cloud/VPC deployment,
- enterprise support,
- custom company schemas,
- custom scenario packs,
- SSO,
- audit logs,
- policy controls,
- synthetic environment governance.

## Commercial hypothesis

Open-source local product drives discovery and adoption.

Cloud monetizes:

- hosting,
- persistence,
- collaboration,
- scale,
- managed scenarios,
- evaluations,
- enterprise support.

Initial target does not require large enterprise contracts.

Example path to $10K MRR:

```text
25 customers at $400/mo
or
50 customers at $200/mo
```

Treat this as a planning hypothesis, not a pricing commitment.
