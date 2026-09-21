# Implementation notes

## Decisions

- TypeScript strict, pnpm workspace, Hono, React/Vite, Node 24 LTS Docker base, built-in `node:sqlite`. Current official docs checked through Context7 on 2026-09-21; npm registry reports stable MCP SDK 1.30.0. Context7 main-branch examples sometimes use v2 development imports; implementation uses installed stable v1 declarations and real client interoperability tests.
- TypeScript 6.0.x matches the lint parser's supported range. Lockfile is committed as the reproducible dependency source.
- SQLite stores validated canonical entities in a typed entity registry with indexed type/ID and a separate reference table. Every direct ID reference is materialized as a deferred SQLite foreign key; generic relationship endpoint types and temporal rules are also validated. This compact layout replaces separate per-entity tables without changing public entity shapes. Future migrations can split hot entity types into dedicated tables without changing IDs.
- Generator version 1 uses fixed normalized `asOf`, namespace SHA-256 IDs and seeded Mulberry32 names. History has explicit `has_role` intervals and promotion events. Events retain `type: event` and use `eventType` to distinguish the transition kind.
- The first company is structurally generated and committed atomically; the UI reports zero committed items until completion. This is real progress, not a simulated timer. Enrichment checkpoints every item and can cancel between requests. A synchronous structure build cannot process a cancellation arriving during its atomic generation turn.
- Snapshot format is versioned JSON containing entities, normalized config and persisted job state; restore validates first and replaces in one SQLite transaction. JSON permits transparent secret inspection and exact state comparisons. SQLite export uses the online backup API. JSONL/CSV are entity-only analysis exports.
- Both provider SDKs are isolated behind TextProvider. Model selection is explicit. Unknown current model prices cannot support an honest exact dollar estimate, so enrichment requires a positive user-provided per-job cost reservation. This approximate policy is persisted and enforced before requests; it is not a provider billing ceiling.
- Environment keys take precedence over in-memory session keys. Provider errors deliberately discard upstream text. Provider-generated prose is redacted before storage.
- No production registry image or npm package is published. Docker quickstart builds a local image. The source directory initially had no Git repository, so no commits are invented.
- Company branches live under `<data-dir>/branches/<name>` and are created with Node's SQLite online backup API. Each has an independent database and runtime lock plus a small manifest containing its source company and canonical entity hash. Snapshots remain local to their environment, and in-memory provider credentials are never copied. Branch deletion validates names, rejects symlinks and refuses to proceed while the branch runtime is active.
- Scenario test packs are portable JSON/YAML artifacts containing exact target IDs, before/after values, retrieval checks and an agent prompt. The first pack format intentionally allows writes only to status, priority and health plus one generated `scenario_applied` event. Validation checks every baseline before the transaction, preventing a stale pack from partially mutating a company. Exact-ID packs replay across clones of the same deterministic company; selector-based cross-seed packs remain future work.

## Acceptance evidence

Verified on 2026-09-21:

- Strict typecheck and ESLint passed after the final schema, SDK injection, permission and shutdown changes.
- Nine native acceptance groups passed before the final hardening changes: deterministic/invariant generation across seeds, SQLite restart and snapshot restore, historical roles, REST validation/access/search/OpenAPI, real MCP HTTP and stdio clients, CLI headless/doctor, fake-provider recovery and budget enforcement, cancellation, and the medium performance profile.
- The checked-in Playwright critical path passed: a fresh 100-person Lite company, automatic dashboard transition, person detail, developer endpoints, snapshot creation and restore.
- Final Docker build and smoke passed: non-root healthy process, browser assets, writable named volume, 100-person generation, real MCP HTTP client and identical people after container restart. Log: `/private/tmp/companysim-docker-check.log` on the implementation machine.
- Runtime dependency audit: no known vulnerabilities.
- The expanded 11-test suite covers official SDK HTTP boundaries and control/import validation and now passes.

### Final verification update — UI refresh

The prior approval-review availability blocker is resolved. After the 21st.dev UI refresh:

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (11/11) and `pnpm build` passed.
- `pnpm test:e2e` passed the full first-run, inspection, developer and snapshot flow.
- `pnpm test:docker` passed with the updated image. Log: `/private/tmp/companysim-redesign-docker.log`.
- `npm pack` succeeded; the generated tarball was installed into a disposable temporary prefix. The installed `company` binary successfully created a five-person company and returned valid JSON status.
- 21st review of the React components reports zero findings. Stylesheet review reports informational literal-color suggestions; palette choices are recorded in `.21st/design.json`.
- Desktop and 390px mobile setup layouts were visually inspected. Geist font files are bundled locally.
- Updated static UI assets were applied to the running `companysim-manual` container without restarting its process or touching the `/data` volume. The local Docker image was also rebuilt for future runs.
- Live provider enrichment was subsequently reported working by the maintainer on 2026-09-21; this is user-reported manual verification, not an automated provider test. Official SDK request/response boundaries, failures, retries/resume, budget reservations and secret isolation pass deterministic tests.

### Phase 2 branch verification

- The full 16-test acceptance suite, strict typecheck, ESLint and production build pass with branch support.
- CLI acceptance creates a branch, mutates it independently, proves main is unchanged, rejects deletion while the branch lock is active, then deletes it.
- Docker smoke creates and inspects a branch while the main HTTP/MCP runtime is live, then verifies normal restart persistence. The existing `companysim-manual` container was not restarted.

Docker restart testing also exposed that dynamically allocated host ports can change on restart; the smoke runner now refreshes that mapping. Shutdown closes HTTP connections, and Linux lock identities include process start time and kernel boot ID so stale PID 1 locks cannot block a restarted container.

## Scope limits

The alpha ships a SaaS/generic profile, one promotion mechanism, simple visibility rules, deterministic one-hop search expansion, three controlled scenarios and isolated CLI-selected company branches. Custom scenario packs, semantic embeddings, cloud hosting and Deep mode remain roadmap work. Structural UI settings use automatic departments and teams. Content enrichment must be started explicitly after structural generation.

### Final UI component polish

Adapted three more 21st.dev component patterns: accessible asynchronous confirmation dialogs for snapshot restore/delete and company reset, real provider credential status rows, and contextual search/snapshot empty states. Search results now have separate state from entity collections. Connection testing shows pending status. No new dependencies or live provider calls. Typecheck, lint, 11 acceptance tests and expanded browser flow (Escape cancellation, restore, empty search and provider status) passed; 21st review reports zero findings.

### AI model picker

Integrated the 21st.dev Model Picker in setup step 04 and provider Settings. Provider-scoped curated text-model shortcuts and custom model IDs share the actual generation model state. Changing provider clears the previous model and unsaved key. Added keyboard navigation, Escape/focus restoration and outside dismissal. No provider requests occur when selecting a model. Verified typecheck, lint, 11 acceptance tests, browser selection/custom-ID/provider-switch flow, production build and zero-finding 21st review. Live paid-provider validation remains for the user's manual test.

### Account model refresh

Added GET /api/control/providers/:provider/models using server-side official SDK model listing, including Anthropic pagination. Only model IDs/display names are returned; provider errors use existing sanitized errors. The picker refresh button saves a newly entered session key when necessary, retains the selected ID and previous list on failure, and displays loading/empty/error states. It lists the provider catalog without claiming all models support text generation. Twelve acceptance tests include SDK pagination and errors; browser coverage includes refresh and failure preservation. Server deployment requires restart and re-entry of session-only credentials.

### Curated model filtering correction

The provider model-list endpoint is an unfiltered account catalog, including non-text, historical and retired IDs. The picker now intersects that response with a deliberately maintained text-model catalog reviewed on 2026-09-21. It prefers aliases over duplicate dated snapshots, preserves a selected custom ID with a clear notice, and never adds account access absent from the response. Unknown, specialized and older models are hidden; Custom model remains available for advanced use. This catalog needs review when provider support changes; it is not automatic capability verification. Sources: https://developers.openai.com/api/docs/models/all, https://developers.openai.com/api/docs/deprecations, https://platform.claude.com/docs/en/models/overview and https://platform.claude.com/docs/en/about-claude/model-deprecations. UI-only deployment preserves session credentials.

### Searchable model picker

The picker popover now contains a labeled search field and a separate results menu. Search filters the existing curated/account catalog locally, without provider requests. Custom model remains available when no entries match. Reopening resets the query, filtering preserves the selected model, Home/End keep normal text-editing behavior and arrows move from search to results. Browser regression coverage exercises case-insensitive ID search, name search, keyboard selection, empty results, clear and Escape/focus restoration.

### Agent handoff and export guidance

Added a self-contained skill source under docs/skills/companysim and bundle it into the web UI as text. Developer offers a copyable agent prompt, resolved SKILL.md download, Codex CLI command and Claude Code HTTP configuration. Guidance is grounded in actual read-only MCP tool schemas, pagination, actor visibility, local networking and optional runtime authentication. It distinguishes model provider keys from runtime tokens, connection tests from generation tests, and estimated budget reservations from billing guarantees. No agent client configuration is modified automatically by the app. The user explicitly requested installation guidance, so installation is delegated in the copied prompt. Export now uses the authenticated API helper before creating the JSON download. Docker build includes the skill source. Skill-creator validator passes in an isolated temporary Python environment.
