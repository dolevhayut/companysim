# Implementation References

These references are included to help implementation agents verify current APIs before coding. Always prefer current official documentation over copied examples.

## Model Context Protocol

- TypeScript SDK docs: https://ts.sdk.modelcontextprotocol.io/
- TypeScript SDK v2 docs: https://ts.sdk.modelcontextprotocol.io/v2/
- MCP specification: https://modelcontextprotocol.io/specification/
- MCP TypeScript SDK repository: https://github.com/modelcontextprotocol/typescript-sdk

Implementation note: the 2026-07-28 specification line defines stdio and Streamable HTTP as standard transports; current SDK package/API details should be verified when implementation begins.

## OpenAI

- API docs: https://platform.openai.com/docs/
- OpenAI Node SDK: https://github.com/openai/openai-node

Use server-side API keys and current recommended generation API at implementation time.

## Anthropic

- API docs: https://docs.anthropic.com/
- Anthropic TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript

Use server-side API keys and current official SDK patterns.
