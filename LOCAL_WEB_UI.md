# Local Web UI Specification

## 1. Purpose

The browser UI makes CompanySim usable by people who do not want to operate primarily through a CLI.

It is also the best place to inspect, debug, and demo a generated company.

It is not a hosted SaaS dashboard.

## 2. Runtime location

Default:

```text
http://localhost:4545
```

The UI communicates only with the local runtime.

## 3. First-run flow

When no company exists:

### Welcome

```text
CompanySim
Spin up an entire company on your machine.

[Create Company]
[Import Company]
```

### Step 1 — Company

Fields:

- name,
- industry,
- company size / exact employee count,
- years of history,
- region,
- locations,
- seed (advanced).

Presets:

```text
Startup
SMB
Mid-market
Enterprise
```

### Step 2 — Structure

Default: automatic.

Advanced custom options:

- departments,
- locations,
- desired customer count,
- desired project count.

### Step 3 — Data

Toggles:

- employees,
- customers,
- projects,
- documents,
- messages,
- tickets,
- policies,
- tools,
- history/events.

Density:

```text
Low
Medium
High
```

### Step 4 — AI

Options:

```text
No AI
OpenAI
Anthropic
```

If provider selected:

- API key field,
- model selection or `Auto`,
- generation budget,
- Test Connection.

API key is session-only unless a secure OS credential implementation is added later.

Clearly label this.

### Step 5 — Review

Show estimated counts and generation plan.

If AI enabled, show estimated usage/cost as approximate.

CTA:

```text
Create Company
```

## 4. Generation progress

Show stages:

```text
Building organization
Creating employees
Creating customers
Creating projects
Building history
Planning content
Generating content
Validating
Indexing
```

Show:

- progress percentage,
- completed/total jobs,
- provider usage where known,
- cancel button.

Do not fake progress. Progress must reflect persisted generation/job state.

## 5. Dashboard

Header:

- company name,
- industry,
- size,
- founded year,
- seed,
- mode.

Cards:

- employees,
- departments,
- customers,
- projects,
- documents,
- messages,
- tickets.

Runtime panel:

- REST status,
- MCP status,
- database status,
- provider status,
- endpoints.

## 6. Explorer

Navigation:

```text
People
Teams
Departments
Customers
Projects
Documents
Messages
Tickets
Policies
Tools
Events
```

Each list supports:

- search,
- useful filters,
- pagination,
- detail drawer/page.

Entity detail shows related entities.

Example person detail:

- role,
- manager,
- team,
- department,
- projects,
- authored documents,
- recent messages,
- relationships.

## 7. Global search

Prominent search field.

Search returns heterogeneous result types.

Do not put an LLM chatbot in V0 merely because the project involves AI.

Search should exercise the actual CompanySim search service.

## 8. Developer screen

Display:

### REST

```text
http://localhost:4545/api/v1
```

Actions:

- copy URL,
- open API docs,
- download/open OpenAPI schema.

### MCP

```text
http://localhost:4545/mcp
```

Actions:

- copy endpoint,
- copy generic MCP configuration example,
- run local test.

### stdio

Show:

```bash
company mcp
```

## 9. Snapshots screen

Actions:

- create snapshot,
- list snapshots,
- restore snapshot,
- delete snapshot.

Destructive restore requires explicit confirmation.

## 10. Settings

Sections:

- runtime,
- provider,
- generation defaults,
- data directory information,
- version.

Do not expose secret values after entry.

## 11. Visual design

Keep UI modern, developer-tool oriented, compact, and readable.

Prioritize:

- fast navigation,
- clear status,
- inspectability,
- copyable technical values.

Avoid excessive marketing visuals inside the local product.

## 12. Accessibility

At minimum:

- keyboard navigable forms,
- labels for controls,
- visible focus states,
- reasonable contrast,
- no information encoded solely by color.
