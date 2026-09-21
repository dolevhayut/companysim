import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "../../schema/src/index.js";
export type ProviderName = "openai" | "anthropic";
export interface TextProvider {
  generate(prompt: string, model: string): Promise<string>;
  health(): Promise<void>;
  models?(): Promise<{ id: string; name: string }[]>;
}
export class Providers {
  private keys = new Map<ProviderName, string>();
  constructor(
    private overrides: Partial<Record<ProviderName, TextProvider>> = {},
    private requestFetch?: typeof fetch,
  ) {}
  set(name: ProviderName, key: string) {
    this.keys.set(name, key);
  }
  remove(name: ProviderName) {
    this.keys.delete(name);
  }
  private key(name: ProviderName) {
    return (
      process.env[name === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] ||
      this.keys.get(name)
    );
  }
  status() {
    return (["openai", "anthropic"] as const).map((provider) => ({
      provider,
      configured: !!this.key(provider),
      source: this.key(provider)
        ? process.env[
            provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"
          ]
          ? "environment"
          : "session"
        : null,
    }));
  }
  redact(text: string) {
    for (const p of ["openai", "anthropic"] as const) {
      const key = this.key(p);
      if (key) text = text.split(key).join("[REDACTED]");
    }
    return text.replace(/sk-[a-zA-Z0-9_-]{8,}/g, "[REDACTED]");
  }
  get(name: ProviderName): TextProvider {
    if (this.overrides[name]) return this.overrides[name]!;
    const apiKey = this.key(name);
    if (!apiKey)
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        `Set ${name === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} or add a session key.`,
        503,
      );
    if (name === "openai") {
      const c = new OpenAI({
        apiKey,
        maxRetries: 0,
        timeout: 30000,
        fetch: this.requestFetch,
      });
      return {
        models: async () => {
          const models = [];
          for await (const model of c.models.list())
            models.push({ id: model.id, name: model.id });
          return models;
        },
        health: async () => {
          await c.models.list();
        },
        generate: async (prompt, model) =>
          (
            await c.responses.create({
              model,
              input: prompt,
              max_output_tokens: 800,
            })
          ).output_text,
      };
    }
    const c = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: 30000,
      fetch: this.requestFetch,
    });
    return {
      models: async () => {
        const models = [];
        for await (const model of c.models.list())
          models.push({ id: model.id, name: model.display_name });
        return models;
      },
      health: async () => {
        await c.models.list();
      },
      generate: async (prompt, model) =>
        (
          await c.messages.create({
            model,
            max_tokens: 800,
            messages: [{ role: "user", content: prompt }],
          })
        ).content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n"),
    };
  }
  async models(name: ProviderName) {
    try {
      const client = this.get(name);
      if (!client.models)
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          "Model listing is unavailable for this provider.",
          503,
        );
      const models = await client.models();
      return Array.from(
        new Map(models.map((model) => [model.id, model])).values(),
      ).sort((a, b) => a.id.localeCompare(b.id));
    } catch (e) {
      throw providerError(e);
    }
  }
  async test(name: ProviderName) {
    try {
      await this.get(name).health();
      return { provider: name, ok: true };
    } catch (e) {
      throw providerError(e);
    }
  }
}
export function providerError(error: unknown) {
  if (error instanceof AppError) return error;
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : 0;
  return new AppError(
    status === 429 || status >= 500 || !status
      ? "PROVIDER_RETRYABLE"
      : "PROVIDER_FAILED",
    status === 401
      ? "Provider rejected credentials. Replace the key and retry."
      : status === 429
        ? "Provider rate limit reached. Wait and resume."
        : "Provider request failed. Check model, credentials and connectivity, then resume.",
    503,
  );
}
