# CLI Specification

## 1. Goal

The CLI is a first-class interface for developers and automation.

Working executable:

```text
company
```

If package naming requires `companysim`, keep an alias if practical.

## 2. UX principles

- interactive when run by a human,
- scriptable with flags,
- non-interactive mode for CI,
- meaningful exit codes,
- no secrets printed,
- rich but not noisy output,
- JSON output available for automation where valuable.

## 3. Commands

### `company init`

Creates configuration interactively.

```bash
company init
```

Flags:

```text
--yes
--output
--format yaml|json
```

### `company create`

Creates structural company state.

```bash
company create acme --industry saas --employees 250 --history 5y --seed 12345
```

Useful flags:

```text
--config
--industry
--employees
--history
--seed
--mode
--density
--data-dir
--force
--json
```

### `company generate`

Runs or resumes enrichment.

```bash
company generate
company generate --resume
```

Flags:

```text
--provider openai|anthropic
--model
--max-cost
--resume
--force
--only documents,messages
--json
```

### `company serve`

Runs local runtime.

```bash
company serve
```

Flags:

```text
--host
--port
--data-dir
--no-ui
--no-rest
--no-mcp
--open
```

Default host outside Docker:

```text
127.0.0.1
```

### `company status`

Shows:

- runtime state,
- company metadata,
- entity counts,
- endpoints,
- generation status,
- provider availability.

### `company inspect`

```bash
company inspect person person_123
company inspect project project_atlas --json
```

### `company search`

```bash
company search "Atlas migration"
company search "Northwind" --type customer,project,ticket --limit 20
```

### `company snapshot`

Subcommands:

```text
create
list
restore
delete
```

### `company branch`

Creates isolated, writable copies of the main company for agents, pull
requests and experiments.

```bash
company branch create pr-184
company branch list --json
company status --branch pr-184
company serve --branch pr-184 --port 4546
company branch delete pr-184 --yes
```

Branches use SQLite's online backup API, so each branch starts from one
consistent main-company state. Branch metadata records the source company and
canonical hash. Provider credentials and main-company snapshots are not
copied. Deleting a branch must fail while its runtime holds the branch lock.

### `company scenario`

Inspect or apply built-in scenarios, and validate or execute a downloaded
scenario test pack:

```bash
company scenario list
company scenario preview delivery-risk --json
company scenario evaluate delivery-risk --json
company scenario apply delivery-risk --branch agent-run
company scenario validate ./companysim-delivery-risk-test-pack.json --branch agent-run
company scenario run ./companysim-delivery-risk-test-pack.json --branch agent-run
```

`validate` resolves every target and checks its expected baseline value.
`run` refuses stale packs instead of silently overwriting changed state. JSON
and YAML packs are accepted. Run packs on an isolated branch when possible.

### `company eval`

Create a portable trace template, then score a completed agent run:

```bash
company eval template ./scenario-pack.json --branch agent-run --json
company eval run ./scenario-pack.json ./agent-run.json --branch agent-run --json
```

The deterministic scorecard checks that the scenario's after-state exists,
the agent loaded company context, used CompanySim search, cited every target
entity ID and used only known read-only CompanySim MCP tools. Optional latency
and cost supplied by the client are preserved as metrics. CompanySim does not
claim to execute or judge an external agent with an LLM.

### `company reset`

```bash
company reset
company reset --snapshot baseline
```

Require confirmation in interactive use unless `--yes`.

### `company provider`

Subcommands:

```text
list
status
test
```

Do not persist plaintext API keys through a CLI command in V0.

### `company doctor`

Checks:

- config,
- data directory,
- DB access,
- migrations,
- port,
- REST,
- MCP,
- provider env vars,
- provider connectivity if explicitly requested,
- filesystem free space.

### `company export`

Formats:

```text
json
jsonl
csv
sqlite
```

### `company import`

Import supported CompanySim exports.

### `company mcp`

Runs MCP stdio server.

No terminal decorations or logs on stdout.

## 4. Output format

Default human-readable output.

Where useful support:

```text
--json
```

JSON output must contain only JSON on stdout.

## 5. Exit codes

Suggested:

```text
0 success
1 unexpected error
2 invalid usage/config
3 company not initialized
4 database error
5 provider error
6 validation error
7 budget/cancel condition
```

Do not over-engineer dozens of codes.

## 6. Examples

Happy path:

```bash
company init
company create
company serve --open
```

CI:

```bash
company create testco --mode lite --seed 42 --yes
company branch create test-run-$CI_JOB_ID
company serve --no-ui &
```

BYOK:

```bash
export ANTHROPIC_API_KEY=...
company generate --provider anthropic --max-cost 3
```
