import { useState } from "react";
import { Check, Copy, Download, Plug, Bot } from "lucide-react";
import skillTemplate from "../../../../docs/skills/companysim/SKILL.md?raw";

export function downloadText(
  text: string,
  filename: string,
  type = "text/markdown",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function agentSkill(origin: string) {
  return skillTemplate.replaceAll("{{BASE_URL}}", origin);
}
export function agentPrompt(origin: string) {
  return `Connect to my running CompanySim at ${origin} and help me work with its synthetic company. Set up the companysim MCP server in this agent client's supported configuration, preserving existing servers. Verify the connection with get_company, get_company_stats and get_company_entry_points. Treat simulation.asOf as the company's current date, summarize the available company and useful starting entities, then ask what I want to build or test. If your environment cannot reach my localhost, explain that limitation rather than claiming connection success. Do not create, reset, enrich or restore company data as part of setup.\n\nUse the following CompanySim skill. If this host supports reusable skills, install it as companysim/SKILL.md in the appropriate project skill directory, following the host's conventions; otherwise use it as task guidance. Replace an existing skill only after checking its contents.\n\n${agentSkill(origin)}`;
}
function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setError("");
          } catch {
            setError(
              "Clipboard unavailable. Select and copy the text in the preview below.",
            );
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Copied: " + label : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export function AgentGuide() {
  const origin = location.origin;
  const skill = agentSkill(origin),
    prompt = agentPrompt(origin);
  const codex = `codex mcp add companysim --url ${origin}/mcp`;
  const claude = JSON.stringify(
    { mcpServers: { companysim: { type: "http", url: origin + "/mcp" } } },
    null,
    2,
  );
  return (
    <div className="agent-guide">
      <article>
        <h3>
          <Bot size={19} aria-hidden="true" /> Give your agent the company
        </h3>
        <p>
          Copy this prompt into your local coding agent. It explains CompanySim,
          sets up MCP and verifies access before exploring your data.
        </p>
        <div className="actions">
          <CopyText text={prompt} label="Copy agent setup prompt" />
          <button type="button" onClick={() => downloadText(skill, "SKILL.md")}>
            <Download size={15} aria-hidden="true" />
            Download agent skill
          </button>
        </div>
        <details>
          <summary>Preview agent prompt & skill</summary>
          <pre>{prompt}</pre>
        </details>
        <p>
          To install the downloaded skill manually, place it in a{" "}
          <code>companysim/SKILL.md</code> folder under your agent’s supported
          skills directory. The prompt can do this for a skill-aware agent.
        </p>
      </article>
      <article>
        <h3>
          <Plug size={19} aria-hidden="true" /> MCP setup guide
        </h3>
        <ol>
          <li>Keep CompanySim running on this machine.</li>
          <li>Add the HTTP server using one of the configurations below.</li>
          <li>
            Reload your client’s MCP tools, then ask it to call{" "}
            <code>get_company</code>, <code>get_company_stats</code> and{" "}
            <code>get_company_entry_points</code>.
          </li>
        </ol>
        <h4>Codex CLI</h4>
        <pre>{codex}</pre>
        <CopyText text={codex} label="Copy Codex command" />
        <h4>Claude Code</h4>
        <p>
          Merge into your project’s <code>.mcp.json</code>, keeping existing
          servers.
        </p>
        <pre>{claude}</pre>
        <CopyText text={claude} label="Copy Claude Code config" />
        <p>
          Other clients: add <code>{origin}/mcp</code> as a Streamable HTTP
          server. Localhost is reachable only from this machine, not from a
          remote cloud agent.
        </p>
        <details>
          <summary>Authentication & troubleshooting</summary>
          <p>
            If you enabled a local API token, configure the client’s
            Authorization bearer token securely. Provider API keys are not MCP
            credentials. Codex supports{" "}
            <code>--bearer-token-env-var COMPANYSIM_API_TOKEN</code>. No secrets
            are included in these copied instructions.
          </p>
          <p>
            If no company exists, create one in Overview. If connection fails,
            check the running container, published port and client HTTP
            transport support. MCP tools are read-only; export and enrichment
            live in Settings.
          </p>
        </details>
      </article>
    </div>
  );
}
