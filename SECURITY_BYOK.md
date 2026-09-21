# Security and BYOK Requirements

## 1. Threat model for V0

CompanySim is local software, but it handles:

- user-owned model API keys,
- generated data,
- local HTTP endpoints,
- filesystem persistence,
- possible non-loopback exposure.

Security defaults still matter.

## 2. Secrets

Initial supported environment variables:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

Rules:

- never print complete secrets,
- never include secrets in logs,
- never put secrets in SQLite,
- never put secrets in snapshot archives,
- never put secrets in exports,
- never send one provider's key to another provider,
- never expose secrets to browser JavaScript after submission.

## 3. Browser key submission

When the user enters a key in local UI:

```text
Browser -> localhost control endpoint -> server memory
```

The server stores it only in memory for that runtime session.

The API response must never echo the key.

UI should display only provider status such as:

```text
Configured for this session
```

## 4. Logs

Implement redaction for common secret patterns.

Provider request logs should include metadata, not headers or raw auth values.

Avoid logging entire prompts/content by default because generated companies can become large and users may import custom data later.

## 5. Local binding

Native server defaults to loopback.

If user requests `0.0.0.0` or a LAN address, warn prominently.

## 6. Optional local API token

Not required for first internal milestone.

Before encouraging remote/LAN exposure, support a local API token or equivalent authentication mechanism.

## 7. Synthetic identity safety

Defaults:

- company domains end in `.test`,
- generated customer domains end in `.test`,
- generated records are fictional,
- prompts explicitly request fictional data.

Avoid using known company employee lists as generation source.

## 8. Provider data disclosure

When AI enrichment is enabled, CompanySim sends generation context to the selected model provider.

The UI/CLI must make this clear.

Because the company is synthetic by default, this is low-risk, but user-provided imported data may not be synthetic in future versions.

## 9. Imported data

If import exists in V0, display a warning that AI enrichment may transmit imported content to the selected provider.

Do not silently enrich imported data through external models.

## 10. Dependency security

CI should include:

- dependency audit,
- secret scanning,
- lockfile integrity,
- basic container vulnerability scan where available.

Do not block local development on noisy low-severity advisories, but fail release CI for known critical issues in runtime dependencies where feasible.

## 11. Filesystem

- create data files with restrictive permissions where supported,
- prevent path traversal in import/export/snapshot names,
- sanitize user-provided filenames,
- never allow API paths to read arbitrary host files.

## 12. MCP/REST data scope

MCP and REST expose synthetic organization data, not runtime host filesystem or environment variables.

No generic `read_file`, `execute_shell`, `sql`, or `get_env` tool should exist in V0.
