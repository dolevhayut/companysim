export type ModelOption = { id: string; name: string; version?: string };
// Reviewed 2026-09-21 against official model catalogs and retirement notices.
// This is an intentionally curated UI catalog, not an exhaustive capability API.
// https://developers.openai.com/api/docs/models/all
// https://developers.openai.com/api/docs/deprecations
// https://platform.claude.com/docs/en/models/overview
// https://platform.claude.com/docs/en/about-claude/model-deprecations
const supported: Record<string, ModelOption[]> = {
  openai: [
    { id: "gpt-6-astra", name: "GPT", version: "6 Astra" },
    { id: "gpt-5.6-sol", name: "GPT", version: "5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT", version: "5.6 Terra" },
    { id: "gpt-5.6-luna", name: "GPT", version: "5.6 Luna" },
    { id: "gpt-5.5", name: "GPT", version: "5.5" },
    { id: "gpt-5.4", name: "GPT", version: "5.4" },
    { id: "gpt-5.4-mini", name: "GPT", version: "5.4 mini" },
    { id: "gpt-5.4-nano", name: "GPT", version: "5.4 nano" },
  ],
  anthropic: [
    { id: "claude-sonnet-5", name: "Claude Sonnet", version: "5" },
    { id: "claude-opus-5", name: "Claude Opus", version: "5" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet", version: "4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku", version: "4.5" },
  ],
};
export function filterModelCatalog(
  provider: string,
  available: ModelOption[],
): ModelOption[] {
  const ids = new Set(available.map((model) => model.id));
  return (supported[provider] ?? []).flatMap((model) => {
    if (ids.has(model.id)) return [model];
    // Prefer a stable alias; use a returned dated snapshot only if no alias exists.
    const snapshot = available
      .map((item) => item.id)
      .filter(
        (id) =>
          id.startsWith(model.id + "-") &&
          /^\d{4}-\d{2}-\d{2}$/.test(id.slice(model.id.length + 1)),
      )
      .sort()
      .at(-1);
    return snapshot ? [{ ...model, id: snapshot }] : [];
  });
}
