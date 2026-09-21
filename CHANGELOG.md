# Changelog

## 0.1.0-alpha.1

Initial local runtime: deterministic company generation, SQLite/FTS5 persistence, shared services, REST and OpenAPI, official SDK MCP HTTP/stdio, CLI lifecycle, React control panel, snapshots and exports, optional OpenAI/Anthropic enrichment with persisted jobs and approximate budget reservations, Docker packaging and acceptance tests.

### Interface refresh

Modernized all operator screens with a 21st.dev-inspired charcoal/alabaster shell, self-hosted Geist Variable, Lucide icon navigation, guided onboarding with a live company preview, cleaner metric cards and tables, and a keyboard-accessible entity drawer.

### Final UI component polish

Adapted three more 21st.dev component patterns: accessible asynchronous confirmation dialogs for snapshot restore/delete and company reset, real provider credential status rows, and contextual search/snapshot empty states. Search results now have separate state from entity collections. Connection testing shows pending status. No new dependencies or live provider calls. Typecheck, lint, 11 acceptance tests and expanded browser flow (Escape cancellation, restore, empty search and provider status) passed; 21st review reports zero findings.

### AI model picker

Integrated the 21st.dev Model Picker in setup step 04 and provider Settings. Provider-scoped curated text-model shortcuts and custom model IDs share the actual generation model state. Changing provider clears the previous model and unsaved key. Added keyboard navigation, Escape/focus restoration and outside dismissal. No provider requests occur when selecting a model. Verified typecheck, lint, 11 acceptance tests, browser selection/custom-ID/provider-switch flow, production build and zero-finding 21st review. Live paid-provider validation remains for the user's manual test.

- Added Refresh models in AI setup and Settings, loading account models through the runtime using the configured provider key. Selection is preserved and failures leave the previous list available.

- Corrected refreshed model picker to show a curated account-available text catalog, excluding retired/specialized entries and duplicate dated versions. Preserve custom selection and show when it falls outside the curated list.

- Added model-picker search by display name, version and model ID, with case-insensitive filtering, clear action, no-results feedback, focus on opening, arrow-key selection and Escape dismissal.

- Added a copyable agent setup prompt, downloadable CompanySim skill and client-specific MCP guide to the Developer screen. URLs follow the active runtime port. Export downloads now send the configured local bearer token.

- Placed Test connection and Start enrichment together in Settings; enrichment requires a selected model and is disabled during connection testing or active generation.

### Phase 2 foundations

- Added isolated company branches for agent, pull-request and CI experiments. `company branch create|list|delete` manages consistent SQLite copies, and all existing commands can target one with `--branch NAME`. Branches preserve main state, reject unsafe names and symlink targets, respect runtime locks on deletion, and never copy session-only provider credentials.
