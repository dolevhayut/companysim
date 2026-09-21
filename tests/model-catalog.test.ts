import { expect, it } from "vitest";
import { filterModelCatalog } from "../apps/web/src/components/model-catalog.js";
const list = (...ids: string[]) => ids.map((id) => ({ id, name: id }));
it("hides retired, specialized, unknown and duplicate OpenAI entries while keeping available text models", () => {
  const result = filterModelCatalog(
    "openai",
    list(
      "babbage-002",
      "gpt-4-turbo",
      "gpt-5.1-chat-latest",
      "gpt-image-1",
      "whisper-1",
      "text-embedding-3-small",
      "gpt-5.4-mini",
      "gpt-5.4-mini-2026-03-17",
      "gpt-6-astra",
      "gpt-unknown",
      "gpt-6-astra",
    ),
  );
  expect(result.map((x) => x.id)).toEqual(["gpt-6-astra", "gpt-5.4-mini"]);
});
it("uses a returned snapshot only when the stable alias is absent", () => {
  expect(
    filterModelCatalog("openai", list("gpt-5.4-mini-2026-03-17")).map(
      (x) => x.id,
    ),
  ).toEqual(["gpt-5.4-mini-2026-03-17"]);
});
it("excludes retired Claude models, preserves exact Haiku ID and never invents account access", () => {
  expect(
    filterModelCatalog(
      "anthropic",
      list(
        "claude-3-7-sonnet-20250219",
        "claude-opus-4-20250514",
        "claude-sonnet-5",
        "claude-haiku-4-5-20251001",
      ),
    ).map((x) => x.id),
  ).toEqual(["claude-sonnet-5", "claude-haiku-4-5-20251001"]);
  expect(filterModelCatalog("openai", [])).toEqual([]);
});
