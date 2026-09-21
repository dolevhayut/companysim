# Acceptance Tests — Public Alpha

Codex/automation must not consider the public alpha complete until these scenarios pass.

## A. Docker zero-to-company

Given a machine with Docker,
when the user runs the documented Docker command,
then:

- container becomes healthy,
- UI opens on localhost,
- no external DB is required,
- data volume is writable.

## B. Browser first-run

Given an empty data directory,
when user opens the UI,
then:

- setup wizard appears,
- user can create a 100-person SaaS company without any AI key,
- generation progress is real,
- dashboard appears after completion.

## C. Persistence

Given a generated company,
when container/runtime restarts using the same data volume,
then:

- company remains present,
- entity IDs remain identical,
- counts remain identical,
- REST and MCP become available again.

## D. REST person query

Given a generated company,
when requesting `/api/v1/people`,
then:

- valid paginated JSON returns,
- each person ID can be fetched individually,
- referenced team/department/manager IDs resolve where non-null.

## E. REST company search

Given a project with associated customer, people, and documents,
when searching a distinctive project name,
then relevant entities from multiple types are returned.

## F. MCP HTTP

Given running local runtime,
when an MCP client connects through Streamable HTTP,
then it can:

- list/call tools,
- call `get_company`,
- call `find_people`,
- call `search_company`.

## G. MCP stdio

Given a generated local company,
when an MCP client launches `company mcp`,
then the same core tools are usable over stdio.

Stdout must contain only protocol output.

## H. REST/MCP parity

Given `person_123`,
REST person retrieval and MCP `get_person` must represent the same underlying current state.

## I. Determinism

Given identical:

- generator version,
- normalized config,
- seed,

when two Lite companies are generated independently,
then structural canonical hashes match exactly.

## J. Different seed

Given same config but different seeds,
then at least meaningful structural identity differs while all invariants still pass.

## K. Structural integrity

After generation:

- zero duplicate public IDs,
- zero unknown manager IDs,
- zero manager cycles,
- zero unknown project owners,
- zero unknown message senders,
- zero unknown document authors,
- zero unknown relationship endpoints.

## L. Temporal integrity

Given a person promoted in 2025,
content/event references before 2025 resolve to the pre-promotion role when role context is displayed/generated.

## M. Snapshot/restore

Given a baseline snapshot,
when state changes and snapshot is restored,
then company returns to baseline canonical state.

## N. OpenAI BYOK

When `OPENAI_API_KEY` is available and provider test is invoked:

- key is read server-side,
- provider health/test succeeds or returns actionable provider error,
- key never appears in API response/log output.

## O. Anthropic BYOK

Same requirements as OpenAI using `ANTHROPIC_API_KEY`.

## P. No-AI mode

With no provider keys and no network access to model providers:

- Lite company generation works,
- runtime serves data,
- REST works,
- MCP works,
- UI works.

## Q. Provider failure recovery

Given an enrichment job where provider returns a retryable/fatal error,
then:

- structural company remains intact,
- completed content jobs remain persisted,
- generation status shows failure/actionable message,
- resume is possible after provider is fixed/switched.

## R. Budget enforcement

Given `maxCostUsd` below planned generation,
then the runtime must not knowingly continue beyond the configured budget policy.

Estimated costs must be labeled approximate where exact calculation is unavailable.

## S. CLI headless

The following style of flow works without interactive prompts:

```bash
company create testco --mode lite --employees 50 --seed 42 --yes
company status --json
```

## T. CLI doctor

`company doctor` detects at minimum:

- missing company DB,
- unwritable data directory,
- unavailable configured port,
- provider environment status.

## U. Security defaults

Native runtime binds to loopback by default.

Documentation Docker command maps host loopback by default.

API keys are absent from:

- DB,
- snapshots,
- exports,
- normal logs.

## V. OpenAPI

`/openapi.json` is valid and contains implemented stable `/api/v1` routes.

## W. UI developer panel

The UI exposes copyable REST and MCP endpoints and a working link to API docs.

## X. Fresh clone developer setup

A developer following repository setup documentation can:

- install dependencies,
- run tests,
- run local development runtime,
- build Docker image.

If this requires undocumented manual steps, acceptance fails.
