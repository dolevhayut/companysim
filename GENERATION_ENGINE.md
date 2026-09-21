# Generation Engine Specification

## 1. Objective

Generate companies that are coherent before they are verbose.

The engine must separate deterministic organizational truth from probabilistic prose generation.

## 2. Governing principle

> The company is deterministic. The content is generative.

## 3. Pipeline

### Phase A — Normalize configuration

Input examples:

```text
industry
employee target
history years
regions
locations
density
mode
seed
provider
budget
```

Resolve presets into a fully explicit internal `GenerationPlan`.

### Phase B — Initialize deterministic RNG

Use a documented seeded PRNG.

Never use `Math.random()` in deterministic structural generation.

Sub-generators should derive stable sub-seeds from:

```text
root seed + namespace + stable entity key
```

This reduces cascading differences when unrelated generators change.

### Phase C — Generate company skeleton

Generate:

- company,
- locations,
- departments,
- teams,
- roles.

### Phase D — Generate people

Generate:

- names,
- emails using `.test`,
- employment dates,
- role assignment,
- manager hierarchy,
- team assignment,
- location assignment.

Hierarchy constraints:

- no manager cycles,
- no person manages themselves,
- manager seniority must be reasonable,
- team sizes must be plausible,
- leadership spans should be bounded by configurable heuristics.

### Phase E — Generate customers and projects

Generate customer lifecycle states and attach projects/ownership.

Cross-link:

- account owner,
- project owner,
- delivery teams,
- customer contacts,
- tickets.

### Phase F — Generate tools and visibility structure

Create tool inventory appropriate to industry and company size.

Create visibility patterns for documents, channels, and policies.

### Phase G — Generate timeline

Create historical events across the configured company age.

Events must produce a coherent current state.

Generate backward or forward, but use one clearly tested strategy.

### Phase H — Plan content jobs

Content job types may include:

```text
document
policy
message_thread
ticket
project_update
meeting_summary
customer_note
```

Each job contains fixed entity references and temporal context.

The LLM is not allowed to substitute entity IDs.

### Phase I — Generate content

Modes:

#### Lite
Template-based content only.

#### Realistic
LLM generates human-like prose inside structured constraints.

### Phase J — Validate

Each output passes:

- schema validation,
- ID validation,
- timeline validation,
- visibility validation,
- content safety/fictionality checks,
- length limits.

Invalid outputs are rejected or regenerated.

### Phase K — Persist and index

Use transactions at appropriate batch boundaries.

Update progress counters after committed batches.

## 4. Generator versioning

Maintain an explicit generator version independent from package version.

Example:

```text
generatorVersion: 1
```

Structural reproducibility guarantees apply to:

```text
seed + normalized config + generator version
```

Changing generation behavior that alters deterministic structure requires a generator-version bump.

## 5. Industry profiles

V0 can ship one strong `saas` profile and optionally one generic profile.

An industry profile should define distributions and vocabulary, not hard-coded generated companies.

Suggested profile fields:

```text
department templates
role families
team patterns
customer patterns
project archetypes
tool categories
document archetypes
event frequencies
```

Do not block V0 on many industries.

## 6. Density

Define `low`, `medium`, `high` as explicit numeric generation policies.

Density affects:

- documents/person,
- messages/person/month,
- tickets/customer/month,
- events/year,
- cross-reference frequency.

Keep defaults small enough for local experimentation.

## 7. Content job contract

Example:

```ts
interface ContentJob {
  id: string;
  type: 'document' | 'message_thread' | 'ticket' | 'policy';
  timestamp: string;
  entityRefs: EntityRef[];
  context: Record<string, unknown>;
  targetSchemaVersion: number;
  promptVersion: string;
}
```

Every job should be serializable and persisted before execution so generation can resume.

## 8. Provider abstraction

Provider interface must return normalized results.

Suggested operations:

```text
healthCheck
generateText
generateObject
estimateUsage (optional)
```

Provider failures should include:

```text
provider
statusCode?
retryable
retryAfter?
requestId?
safeMessage
```

Never include secret values in error objects.

## 9. Structured generation

Prefer structured output for generated objects whenever provider support is reliable.

Generated textual bodies may remain plain text inside a structured envelope.

Example result:

```json
{
  "title": "Atlas Migration Risk Review",
  "body": "...",
  "summary": "..."
}
```

## 10. Prompt policy

Prompts must state:

- all names and organizations are fictional,
- use only provided entity references,
- do not invent new employee/customer/project identity unless job explicitly allows creation,
- obey timestamp state,
- obey requested format,
- do not include hidden reasoning,
- return only requested structured result.

## 11. Cost/budget control

Before execution:

- count jobs,
- estimate rough usage,
- display estimate,
- enforce `maxCostUsd` where provider pricing data is available.

When exact pricing is unknown, label estimate as approximate.

Do not fabricate precision.

## 12. Cancellation

User can cancel generation.

At cancellation:

- mark cancellation requested,
- finish current atomic write safely,
- stop taking new content jobs,
- preserve generated structure and completed enrichment,
- allow resume.

## 13. Resume

`generate --resume` should execute only incomplete/failed-retryable jobs.

Do not regenerate completed jobs unless `--force` is supplied.

## 14. Content cache

Optional but recommended for alpha.

Cache key can include:

```text
provider
model
promptVersion
normalized job payload
```

Use cache only when safe and deterministic enough for the intended operation.

## 15. Validation report

Expose a command/service that returns:

```text
entity count
relationship count
invalid references
orphan count
temporal inconsistencies
search index status
```

Public alpha should target zero invalid structural references.
