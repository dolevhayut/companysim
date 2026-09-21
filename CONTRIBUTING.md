# Contributing

Read `00_README_FIRST.md`, `CODEX.md` and the referenced specs before changing behavior. Install Node 24 LTS and pnpm 10.32.1, then run `pnpm install --frozen-lockfile` and `pnpm check`. Run `pnpm exec playwright install chromium` once before `pnpm test:e2e`. Docker release checks use `pnpm test:docker`.

Keep business rules in shared services, validate input at boundaries, preserve opaque IDs, and never persist provider keys. Generator changes that alter released deterministic output require a generator-version bump. Include tests proving references, temporal context and adapter parity. Use `pnpm format` before submitting a change.

Alpha package versions use semver prereleases; schema, generator and snapshot format versions evolve independently. Release artifacts are built by CI; publishing requires a separate maintainer action.
