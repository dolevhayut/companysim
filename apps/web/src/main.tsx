import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist/wght.css";
import {
  ArrowUpRight,
  Check,
  ClipboardCheck,
  ArrowRight,
  Database,
  FileText,
  FlaskConical,
  Layers,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import {
  Sidebar,
  Topbar,
  SetupSteps,
  CompanyBlueprint,
  PlanReview,
  EntityAvatar,
  EmptyState,
  DetailPanel,
  ConfirmDialog,
  ProviderStatus,
  type Confirmation,
} from "./components/workspace.js";
import { ModelPicker } from "./components/model-picker.js";
import { AgentGuide, downloadText } from "./components/agent-guide.js";
import "./style.css";
type Row = Record<string, unknown>;
type Progress = {
  state: string;
  stage: string;
  completed: number;
  total: number;
  error?: string;
};
async function api<T = Row>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = sessionStorage.getItem("localToken");
  const r = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error?.message ?? "Request failed");
  return data;
}
function App() {
  const [company, setCompany] = useState<Row | null>(null),
    [ready, setReady] = useState(false),
    [stats, setStats] = useState<Row>({}),
    [page, setPage] = useState("Overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [step, setStep] = useState(0),
    [progress, setProgress] = useState<Progress>({
      state: "idle",
      stage: "Ready",
      completed: 0,
      total: 0,
    }),
    [rows, setRows] = useState<Row[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [query, setQuery] = useState(""),
    [snapshots, setSnapshots] = useState<Row[]>([]),
    [snapshotName, setSnapshotName] = useState("baseline"),
    [provider, setProvider] = useState("none"),
    [key, setKey] = useState(""),
    [model, setModel] = useState(""),
    [budget, setBudget] = useState(1),
    [jobCost, setJobCost] = useState(0.01),
    [preview, setPreview] = useState<Row | null>(null),
    [providerStatus, setProviderStatus] = useState<Row[]>([]),
    [filter, setFilter] = useState(""),
    [scenarios, setScenarios] = useState<Row[]>([]),
    [scenarioHistory, setScenarioHistory] = useState<Row[]>([]),
    [scenarioPreview, setScenarioPreview] = useState<Row | null>(null),
    [scenarioEvaluation, setScenarioEvaluation] = useState<Row | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [searchResults, setSearchResults] = useState<Row[] | null>(null);
  const [testingProvider, setTestingProvider] = useState(false);
  const [config, setConfig] = useState({
    name: "Acme Labs",
    industry: "saas",
    employees: 100,
    historyYears: 5,
    regions: ["US"],
    seed: "42",
    density: "low",
    customers: 10,
    projects: 10,
    features: {
      documents: true,
      messages: true,
      tickets: true,
      policies: true,
      tools: true,
      events: true,
    },
  });
  const guard = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };
  const refresh = async () => {
    try {
      const c = await api("/api/v1/company");
      setCompany(c);
      setStats(await api("/api/v1/stats"));
    } catch (e) {
      if (e instanceof Error && e.message === "Create a company first.")
        setCompany(null);
      else throw e;
    } finally {
      setReady(true);
    }
  };
  useEffect(() => {
    void guard(refresh);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      void api<Progress>("/api/control/generation/status")
        .then((p) => {
          setProgress(p);
          if (
            (["running", "cancel_requested"].includes(progress.state) &&
              !["running", "cancel_requested"].includes(p.state)) ||
            (!company && p.state === "completed")
          )
            void guard(refresh);
        })
        .catch(() => {});
    }, 700);
    return () => clearInterval(timer);
  }, [progress.state, company]);
  const entities = [
    "People",
    "Teams",
    "Departments",
    "Customers",
    "Projects",
    "Documents",
    "Messages",
    "Tickets",
    "Policies",
    "Tools",
    "Events",
  ];
  const load = async (next?: string) => {
    const data = await api<{ items: Row[]; nextCursor: string | null }>(
      "/api/v1/" +
        page.toLowerCase() +
        "?limit=25" +
        (next ? "&cursor=" + encodeURIComponent(next) : "") +
        (filter ? "&q=" + encodeURIComponent(filter) : ""),
    );
    setRows(data.items);
    setCursor(data.nextCursor);
  };
  useEffect(() => {
    setDetail(null);
    if (entities.includes(page)) void guard(() => load());
    if (page === "Snapshots")
      void guard(async () =>
        setSnapshots(await api<Row[]>("/api/control/snapshots")),
      );
    if (page === "Settings")
      void guard(async () =>
        setProviderStatus(await api<Row[]>("/api/control/providers")),
      );
    if (page === "Scenarios")
      void guard(async () => {
        const data = await api<{ scenarios: Row[]; history: Row[] }>(
          "/api/control/scenarios",
        );
        setScenarios(data.scenarios);
        setScenarioHistory(data.history);
        setScenarioPreview(null);
        setScenarioEvaluation(null);
      });
  }, [page]);
  const configureProvider = async () => {
    if (provider !== "none" && key) {
      await api("/api/control/providers/session-key", "POST", {
        provider,
        key,
      });
      setKey("");
      setProviderStatus(await api<Row[]>("/api/control/providers"));
      setNotice("Provider key configured for this session.");
    }
  };
  const enrich = async () => {
    await configureProvider();
    if (provider === "none") throw Error("Select a provider first.");
    await api("/api/control/generation/enrich", "POST", {
      provider,
      model,
      maxCostUsd: budget,
      costPerJobUsd: jobCost,
    });
    setProgress(await api<Progress>("/api/control/generation/status"));
  };
  const busy = ["running", "cancel_requested"].includes(progress.state);
  const ai = (
    <>
      <label>
        AI provider
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setModel("");
            setKey("");
          }}
        >
          <option value="none">No AI · deterministic Lite mode</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </label>
      {provider !== "none" && (
        <>
          <p>
            Selected company content is sent to this provider. API keys stay in
            server memory for this session.
          </p>
          <label>
            Session API key
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <ModelPicker
            key={provider}
            provider={provider}
            value={model}
            onChange={setModel}
            onRefresh={async () => {
              await configureProvider();
              return (
                await api<{ models: { id: string; name: string }[] }>(
                  "/api/control/providers/" + provider + "/models",
                )
              ).models;
            }}
          />
          <div className="grid">
            <label>
              Maximum cost (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </label>
            <label>
              Approximate reserve per job (USD)
              <input
                type="number"
                min="0.0001"
                step="0.001"
                value={jobCost}
                onChange={(e) => setJobCost(Number(e.target.value))}
              />
            </label>
          </div>
          <p>
            Reservations are a user-supplied estimate, not a provider billing
            guarantee. Unknown pricing is never treated as free.
          </p>
          <div className="actions">
            <button
              onClick={() =>
                void guard(async () => {
                  setTestingProvider(true);
                  try {
                    await configureProvider();
                    await api("/api/control/providers/test", "POST", {
                      provider,
                    });
                    setNotice("Provider connection succeeded.");
                  } finally {
                    setTestingProvider(false);
                  }
                })
              }
              disabled={testingProvider}
            >
              {testingProvider ? "Testing connection…" : "Test connection"}
            </button>
            {company && page === "Settings" && (
              <button
                disabled={busy || testingProvider || !model.trim()}
                className="primary"
                onClick={() => void guard(enrich)}
              >
                Start enrichment
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
  const closeDetail = useCallback(() => setDetail(null), []);
  return (
    <div className="shell">
      <Sidebar
        page={page}
        onSelect={setPage}
        company={company ? String(company.name) : null}
        ready={ready}
      />
      <main>
        <Topbar
          page={page}
          company={company ? String(company.name) : null}
          onSearch={() => setPage("Search")}
        />
        <div className="page-content">
          <header>
            <div>
              <span className="eyebrow">
                {company
                  ? "YOUR COMPANY, CONNECTED"
                  : "A NEW WORLD STARTS HERE"}
              </span>
              <h1>
                {company
                  ? page === "Overview"
                    ? String(company.name)
                    : page
                  : "Meet your next company."}
              </h1>
              <p>
                {company
                  ? page === "Overview"
                    ? "Everything you need to explore, test and build. In one place."
                    : "Explore the people, knowledge and connections behind your company."
                  : "A realistic organization. An entirely local sandbox. Built by you."}
              </p>
            </div>
            <span className="badge">
              {company ? (
                String(company.industry).toUpperCase()
              ) : (
                <>
                  <Sparkles size={13} /> Ready in minutes
                </>
              )}
            </span>
          </header>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {!ready ? (
            <p>Connecting to local runtime…</p>
          ) : (
            <>
              {(busy ||
                progress.state === "failed" ||
                progress.state === "budget_exceeded" ||
                progress.state === "cancelled" ||
                progress.state === "interrupted") && (
                <section>
                  <h2>{progress.stage}</h2>
                  <progress
                    max={progress.total || 1}
                    value={progress.completed}
                  />
                  <p>
                    {progress.completed} / {progress.total} committed items ·{" "}
                    {progress.state}
                  </p>
                  {progress.error && <p>{progress.error}</p>}
                  {busy ? (
                    <button
                      onClick={() =>
                        void guard(async () =>
                          setProgress(
                            await api<Progress>(
                              "/api/control/generation/cancel",
                              "POST",
                            ),
                          ),
                        )
                      }
                    >
                      Cancel generation
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        void guard(async () => {
                          await api("/api/control/generation/resume", "POST");
                          setProgress(
                            await api<Progress>(
                              "/api/control/generation/status",
                            ),
                          );
                        })
                      }
                    >
                      Resume
                    </button>
                  )}
                </section>
              )}
              {!company && page !== "Settings" && !busy && (
                <div className="setup-layout">
                  <section className="wizard">
                    <SetupSteps step={step} />

                    <h2>
                      {
                        [
                          "Company basics",
                          "Structure",
                          "Data & density",
                          "Optional AI enrichment",
                          "Review your company",
                        ][step]
                      }
                    </h2>
                    <p className="step-description">
                      {
                        [
                          "Give your company a name and a little context. We’ll handle the connections.",
                          "Set the scale. We’ll bring the teams and reporting lines together.",
                          "Choose what fills your company’s world. You can enrich it later.",
                          "Start with zero dependencies, or add your own model provider.",
                          "Everything is connected and ready to go. Make it yours.",
                        ][step]
                      }
                    </p>
                    {step === 0 && (
                      <>
                        <label>
                          Company name
                          <input
                            value={config.name}
                            onChange={(e) =>
                              setConfig({ ...config, name: e.target.value })
                            }
                          />
                        </label>
                        <div className="grid">
                          <label>
                            Industry
                            <select
                              value={config.industry}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  industry: e.target.value,
                                })
                              }
                            >
                              <option value="saas">SaaS</option>
                              <option value="generic">Generic</option>
                            </select>
                          </label>
                          <label>
                            Size preset
                            <select
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  employees: Number(e.target.value),
                                })
                              }
                              defaultValue="100"
                            >
                              <option value="20">Startup · 20</option>
                              <option value="100">SMB · 100</option>
                              <option value="250">Mid-market · 250</option>
                              <option value="1000">Enterprise · 1,000</option>
                            </select>
                          </label>
                          <label>
                            Employees
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              value={config.employees}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  employees: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Years of history
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={config.historyYears}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  historyYears: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Region
                            <input
                              value={config.regions[0]}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  regions: [e.target.value],
                                })
                              }
                            />
                          </label>
                          <label>
                            Seed
                            <input
                              value={config.seed}
                              onChange={(e) =>
                                setConfig({ ...config, seed: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <p>
                          Departments, teams, reporting lines and an Austin
                          headquarters are generated automatically.
                        </p>
                        <div className="grid">
                          <label>
                            Customers
                            <input
                              type="number"
                              min="1"
                              value={config.customers}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  customers: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Projects
                            <input
                              type="number"
                              min="1"
                              value={config.projects}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  projects: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <label>
                          Density
                          <select
                            value={config.density}
                            onChange={(e) =>
                              setConfig({ ...config, density: e.target.value })
                            }
                          >
                            <option value="low">Low · quick sandbox</option>
                            <option value="medium">
                              Medium · richer knowledge
                            </option>
                            <option value="high">
                              High · dense environment
                            </option>
                          </select>
                        </label>
                        <div className="grid">
                          {Object.entries(config.features).map(
                            ([name, value]) => (
                              <label className="check" key={name}>
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) =>
                                    setConfig({
                                      ...config,
                                      features: {
                                        ...config.features,
                                        [name]: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                {name}
                              </label>
                            ),
                          )}
                        </div>
                      </>
                    )}
                    {step === 3 && ai}
                    {step === 4 && (
                      <>
                        <p>
                          A coherent, fictional {config.employees}-person
                          organization, with reproducible seed{" "}
                          <code>{config.seed}</code>.
                        </p>
                        <PlanReview preview={preview} />
                        <p>
                          {provider === "none"
                            ? "No provider keys or model network access required."
                            : "Structure is generated first. Start optional enrichment from Settings after reviewing the company."}
                        </p>
                      </>
                    )}
                    <div className="actions wizard-actions">
                      {step > 0 && (
                        <button onClick={() => setStep(step - 1)}>Back</button>
                      )}
                      {step < 4 ? (
                        <button
                          className="primary"
                          onClick={() =>
                            void guard(async () => {
                              if (step === 3) {
                                await configureProvider();
                                setPreview(
                                  await api(
                                    "/api/control/generation/plan",
                                    "POST",
                                    config,
                                  ),
                                );
                              }
                              setStep(step + 1);
                            })
                          }
                        >
                          Continue <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          className="primary"
                          onClick={() =>
                            void guard(async () => {
                              await api(
                                "/api/control/generation/start",
                                "POST",
                                config,
                              );
                              setProgress(
                                await api<Progress>(
                                  "/api/control/generation/status",
                                ),
                              );
                            })
                          }
                        >
                          Create Company{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      )}
                      <label className="upload">
                        Import Company
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) =>
                            void guard(async () => {
                              const f = e.target.files?.[0];
                              if (f) {
                                await api(
                                  "/api/control/import",
                                  "POST",
                                  JSON.parse(await f.text()),
                                );
                                await refresh();
                              }
                            })
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <CompanyBlueprint
                    name={config.name}
                    employees={config.employees}
                    customers={config.customers}
                    projects={config.projects}
                  />
                </div>
              )}
              {company && page === "Overview" && (
                <>
                  <div className="summary">
                    <span className="status-dot" />
                    {String(stats.person ?? 0)} people · Founded{" "}
                    {String(company.foundedDate).slice(0, 4)} · One persisted
                    company across every interface
                  </div>
                  <div className="cards">
                    {[
                      "person",
                      "department",
                      "customer",
                      "project",
                      "document",
                      "message",
                      "ticket",
                    ].map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setPage(
                            t === "person"
                              ? "People"
                              : t[0].toUpperCase() + t.slice(1) + "s",
                          )
                        }
                      >
                        <span className="metric-icon" aria-hidden="true">
                          {t === "person" ? (
                            <Users size={18} />
                          ) : t === "document" ? (
                            <FileText size={18} />
                          ) : (
                            <Layers size={18} />
                          )}
                        </span>
                        <span>{t === "person" ? "Employees" : t + "s"}</span>
                        <strong>
                          {Number(stats[t] ?? 0).toLocaleString()}
                        </strong>
                        <small>
                          Explore <ArrowUpRight size={14} aria-hidden="true" />
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="overview-bottom">
                    <section className="connect-card">
                      <div className="section-icon">
                        <Terminal size={21} />
                      </div>
                      <span className="eyebrow">BUILT TO CONNECT</span>
                      <h2>
                        Your next idea has
                        <br />a company to work with.
                      </h2>
                      <p>
                        Give your app or AI agent a connected world of people,
                        projects and knowledge.
                      </p>
                      <div className="actions">
                        <button
                          className="primary"
                          onClick={() => setPage("Developer")}
                        >
                          Connect with REST or MCP <ArrowUpRight size={16} />
                        </button>
                        <button onClick={() => setPage("People")}>
                          Explore people
                        </button>
                      </div>
                    </section>
                    <section className="environment-card">
                      <div className="section-heading">
                        <h2>Environment</h2>
                        <Database size={18} />
                      </div>
                      <div className="environment-row">
                        <span>Storage</span>
                        <strong>Local SQLite</strong>
                      </div>
                      <div className="environment-row">
                        <span>Data API</span>
                        <strong>
                          <span className="status-dot" />
                          REST v1
                        </strong>
                      </div>
                      <div className="environment-row">
                        <span>Agent access</span>
                        <strong>HTTP + stdio</strong>
                      </div>
                      <div className="environment-row">
                        <span>Data ownership</span>
                        <strong>100% yours</strong>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setPage("Snapshots")}
                      >
                        Save a snapshot <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                </>
              )}
              {company && entities.includes(page) && (
                <section>
                  <h2>{page}</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void guard(() => load());
                    }}
                  >
                    <div className="actions">
                      <input
                        aria-label="Filter entities"
                        placeholder="Filter this collection…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <button>Filter</button>
                    </div>
                  </form>
                  <div className="table">
                    <div className="table-heading">
                      <span>Name</span>
                      <span>Identifier</span>
                      <span />
                    </div>
                    {rows.map((r, index) => (
                      <button
                        className="row"
                        key={String(r.id)}
                        onClick={() =>
                          void guard(async () => {
                            const d = await api(
                              "/api/v1/" + page.toLowerCase() + "/" + r.id,
                            );
                            const rel = await api(
                              "/api/v1/relationships?sourceId=" + r.id,
                            );
                            setDetail({ ...d, relationships: rel.items });
                          })
                        }
                      >
                        <span className="entity-name">
                          <EntityAvatar
                            index={index}
                            name={String(
                              r.displayName ??
                                r.name ??
                                r.title ??
                                r.subject ??
                                r.eventType ??
                                r.type,
                            )}
                          />
                          <span>
                            {String(
                              r.displayName ??
                                r.name ??
                                r.title ??
                                r.subject ??
                                r.eventType ??
                                r.id,
                            )}
                            <small>
                              {String(r.email ?? r.status ?? r.type)}
                            </small>
                          </span>
                        </span>
                        <code>{String(r.id)}</code>
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  {!rows.length && (
                    <EmptyState>
                      Try another filter to find what you’re looking for.
                    </EmptyState>
                  )}
                  <div className="actions">
                    <button onClick={() => void guard(() => load())}>
                      First page
                    </button>
                    <button
                      disabled={!cursor}
                      onClick={() => void guard(() => load(cursor!))}
                    >
                      Next page
                    </button>
                  </div>
                </section>
              )}
              {company && page === "Search" && (
                <section>
                  <h2>Search your company</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void guard(async () => {
                        const r = await api<{ results: Row[] }>(
                          "/api/v1/search",
                          "POST",
                          { query },
                        );
                        setSearchResults(r.results);
                      });
                    }}
                  >
                    <div className="actions">
                      <input
                        aria-label="Search company"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Try Atlas Migration"
                      />
                      <button className="primary">Search</button>
                    </div>
                  </form>
                  {(!searchResults || !searchResults.length) && (
                    <EmptyState
                      title={
                        searchResults
                          ? "No results found"
                          : "Find anything in your company"
                      }
                    >
                      {searchResults
                        ? "Try a different name, project or keyword."
                        : "Search people, documents, messages and more from one place."}
                    </EmptyState>
                  )}
                  {(searchResults ?? []).map((r) => (
                    <article key={String(r.entityId)}>
                      <small>{String(r.entityType)}</small>
                      <h3>{String(r.title)}</h3>
                      <p>{String(r.snippet ?? "")}</p>
                    </article>
                  ))}
                </section>
              )}
              {company && page === "Developer" && (
                <section>
                  <h2>Connect to CompanySim</h2>
                  <AgentGuide />
                  {[
                    ["REST", "/api/v1"],
                    ["MCP Streamable HTTP", "/mcp"],
                  ].map(([label, path]) => (
                    <article key={label}>
                      <h3>{label}</h3>
                      <code>{location.origin + path}</code>
                      <button
                        onClick={() =>
                          void guard(async () => {
                            await navigator.clipboard.writeText(
                              location.origin + path,
                            );
                            setNotice("Endpoint copied.");
                          })
                        }
                      >
                        Copy endpoint
                      </button>
                    </article>
                  ))}
                  <p>
                    <a href="/docs" target="_blank" rel="noopener noreferrer">
                      Open interactive API docs ↗
                    </a>{" "}
                    · <a href="/openapi.json">OpenAPI schema</a>
                  </p>
                  <h3>MCP configuration</h3>
                  <pre>
                    {JSON.stringify(
                      {
                        mcpServers: {
                          companysim: { url: location.origin + "/mcp" },
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                  <button
                    onClick={() =>
                      void guard(async () => {
                        await navigator.clipboard.writeText(
                          JSON.stringify(
                            {
                              mcpServers: {
                                companysim: { url: location.origin + "/mcp" },
                              },
                            },
                            null,
                            2,
                          ),
                        );
                        setNotice("MCP configuration copied.");
                      })
                    }
                  >
                    Copy MCP configuration
                  </button>
                  <h3>Stdio</h3>
                  <code>company mcp --data-dir ./company-data</code>
                  <p>
                    REST, MCP, CLI and this UI read the same persisted state.
                  </p>
                </section>
              )}
              {company && page === "Scenarios" && (
                <>
                  <section className="scenario-intro">
                    <div>
                      <span className="eyebrow">
                        SAFE, REPEATABLE TEST CASES
                      </span>
                      <h2>Scenario Lab</h2>
                      <p>
                        Apply a realistic change to this company, inspect the
                        exact diff, then give an agent a grounded investigation
                        prompt. Create a snapshot first if you want a one-click
                        way back.
                      </p>
                    </div>
                    <button onClick={() => setPage("Snapshots")}>
                      <Database size={15} aria-hidden="true" /> Save baseline
                    </button>
                  </section>
                  <div className="scenario-grid">
                    {scenarios.map((scenario) => (
                      <article
                        className={
                          scenarioPreview?.id === scenario.id
                            ? "scenario-card selected"
                            : "scenario-card"
                        }
                        key={String(scenario.id)}
                      >
                        <span className="scenario-icon" aria-hidden="true">
                          <FlaskConical size={18} />
                        </span>
                        <small>{String(scenario.focus)}</small>
                        <h3>{String(scenario.title)}</h3>
                        <p>{String(scenario.description)}</p>
                        <div className="scenario-card-footer">
                          <span>
                            {String(scenario.affectedCount)} connected records
                          </span>
                          <button
                            onClick={() =>
                              void guard(async () => {
                                setScenarioPreview(
                                  await api<Row>(
                                    "/api/control/scenarios/" +
                                      scenario.id +
                                      "/preview",
                                  ),
                                );
                                setScenarioEvaluation(null);
                              })
                            }
                          >
                            Preview <ArrowRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {scenarioPreview && (
                    <section className="scenario-workbench">
                      <div className="scenario-workbench-heading">
                        <div>
                          <span className="eyebrow">CHANGE PREVIEW</span>
                          <h2>{String(scenarioPreview.title)}</h2>
                          <p>{String(scenarioPreview.description)}</p>
                        </div>
                        <span className="badge">
                          {String(scenarioPreview.focus)}
                        </span>
                      </div>
                      <div
                        className="scenario-diff"
                        aria-label="Scenario changes"
                      >
                        {(
                          (scenarioPreview.changes as Row[] | undefined) ?? []
                        ).map((change, index) => (
                          <div key={String(change.entityId ?? "event") + index}>
                            <span>{String(change.entityType)}</span>
                            <strong>{String(change.field)}</strong>
                            <code>
                              {change.before == null
                                ? "new"
                                : String(change.before)}
                            </code>
                            <ArrowRight size={14} aria-hidden="true" />
                            <code>{String(change.after)}</code>
                          </div>
                        ))}
                      </div>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              title: "Apply scenario?",
                              description:
                                "CompanySim will write the displayed changes and add one scenario event. A snapshot lets you restore the previous state.",
                              action: "Apply scenario",
                              run: async () => {
                                const result = await api<Row>(
                                  "/api/control/scenarios/" +
                                    scenarioPreview.id +
                                    "/apply",
                                  "POST",
                                );
                                setScenarioPreview(result);
                                const catalog = await api<{ history: Row[] }>(
                                  "/api/control/scenarios",
                                );
                                setScenarioHistory(catalog.history);
                                setNotice(
                                  "Scenario applied. The change is now visible through REST and MCP.",
                                );
                                await refresh();
                              },
                            })
                          }
                        >
                          Apply to company{" "}
                          <ArrowRight size={15} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() =>
                            void guard(async () => {
                              setScenarioEvaluation(
                                await api<Row>(
                                  "/api/control/scenarios/" +
                                    scenarioPreview.id +
                                    "/evaluate",
                                  "POST",
                                ),
                              );
                            })
                          }
                        >
                          <ClipboardCheck size={15} aria-hidden="true" /> Run
                          readiness check
                        </button>
                      </div>
                    </section>
                  )}
                  {scenarioEvaluation && (
                    <section className="scenario-evaluation">
                      <div className="scenario-workbench-heading">
                        <div>
                          <span className="eyebrow">AGENT RETRIEVAL CHECK</span>
                          <h2>
                            {scenarioEvaluation.passed
                              ? "Ready for an agent"
                              : "Needs attention"}
                          </h2>
                          <p>
                            This local check verifies the scenario’s records can
                            be resolved and retrieved. It does not run or score
                            an external agent.
                          </p>
                        </div>
                        {Boolean(scenarioEvaluation.passed) && (
                          <Check className="check-icon" size={23} />
                        )}
                      </div>
                      <div className="evaluation-checks">
                        {(
                          (scenarioEvaluation.checks as Row[] | undefined) ?? []
                        ).map((check) => (
                          <div key={String(check.id)}>
                            <Check size={15} aria-hidden="true" />
                            <span>
                              <strong>{String(check.label)}</strong>
                              <small>{String(check.detail)}</small>
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          void guard(async () => {
                            await navigator.clipboard.writeText(
                              String(scenarioEvaluation.agentPrompt),
                            );
                            setNotice("Agent evaluation prompt copied.");
                          })
                        }
                      >
                        Copy agent evaluation prompt
                      </button>
                      <button
                        onClick={() => {
                          const scenario = scenarioEvaluation.scenario as
                            Row | undefined;
                          const replayableScenario =
                            scenarioPreview ?? scenario;
                          downloadText(
                            JSON.stringify(
                              {
                                formatVersion: 1,
                                exportedAt: new Date().toISOString(),
                                purpose:
                                  "Read-only CompanySim agent evaluation fixture",
                                scenario: replayableScenario,
                                checks: scenarioEvaluation.checks,
                                agentPrompt: scenarioEvaluation.agentPrompt,
                              },
                              null,
                              2,
                            ),
                            `companysim-${String(replayableScenario?.id ?? "scenario")}-test-pack.json`,
                            "application/json",
                          );
                          setNotice("Scenario test pack downloaded.");
                        }}
                      >
                        Download test pack
                      </button>
                    </section>
                  )}
                  {scenarioHistory.length > 0 && (
                    <section className="scenario-history">
                      <div className="scenario-workbench-heading">
                        <div>
                          <span className="eyebrow">RUN HISTORY</span>
                          <h2>Changes already in this company</h2>
                          <p>
                            These scenario events persist with the company and
                            are included in snapshots and exports.
                          </p>
                        </div>
                        <button onClick={() => setPage("Events")}>
                          Open events{" "}
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="scenario-history-list">
                        {scenarioHistory
                          .slice()
                          .reverse()
                          .map((run) => (
                            <div key={String(run.id)}>
                              <span
                                className="scenario-icon"
                                aria-hidden="true"
                              >
                                <Check size={16} />
                              </span>
                              <span>
                                <strong>{String(run.title)}</strong>
                                <small>
                                  {String(
                                    run.affectedIds instanceof Array
                                      ? run.affectedIds.length
                                      : 0,
                                  )}{" "}
                                  records changed
                                </small>
                              </span>
                              <time dateTime={String(run.appliedAt)}>
                                {new Date(
                                  String(run.appliedAt),
                                ).toLocaleString()}
                              </time>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}
                </>
              )}
              {company && page === "Snapshots" && (
                <section>
                  <h2>Snapshots</h2>
                  <p>
                    Save a baseline, experiment, then restore. Snapshots exclude
                    provider credentials.
                  </p>
                  <div className="actions">
                    <input
                      aria-label="Snapshot name"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                    />
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void guard(async () => {
                          await api("/api/control/snapshots", "POST", {
                            name: snapshotName,
                          });
                          setSnapshots(
                            await api<Row[]>("/api/control/snapshots"),
                          );
                          setNotice("Snapshot created.");
                        })
                      }
                    >
                      Create snapshot
                    </button>
                  </div>
                  {!snapshots.length && (
                    <EmptyState
                      title="Your first restore point"
                      icon={Database}
                    >
                      Create a snapshot above to save your company before
                      experimenting.
                    </EmptyState>
                  )}
                  {snapshots.map((s) => (
                    <article key={String(s.id)}>
                      <strong>{String(s.id)}</strong>
                      <div className="actions">
                        <button
                          disabled={busy}
                          onClick={() => {
                            setConfirmation({
                              title: "Restore snapshot?",
                              description: `Restore “${s.id}”? Your current company state will be replaced.`,
                              action: "Restore snapshot",
                              run: async () => {
                                await api(
                                  "/api/control/snapshots/" + s.id + "/restore",
                                  "POST",
                                );
                                await refresh();
                                setNotice("Snapshot restored.");
                              },
                            });
                          }}
                        >
                          Restore
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setConfirmation({
                              title: "Delete snapshot?",
                              description: `“${s.id}” will be permanently deleted. Your active company stays unchanged.`,
                              action: "Delete snapshot",
                              run: async () => {
                                await api(
                                  "/api/control/snapshots/" + s.id,
                                  "DELETE",
                                );
                                setSnapshots(
                                  await api<Row[]>("/api/control/snapshots"),
                                );
                              },
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              )}
              {page === "Settings" && (
                <section>
                  <h2>Settings & providers</h2>
                  {ai}
                  <ProviderStatus providers={providerStatus} />
                  {company && (
                    <>
                      <h3>Data controls</h3>
                      <button
                        onClick={() =>
                          void guard(async () => {
                            const data = await api("/api/control/export");
                            downloadText(
                              JSON.stringify(data, null, 2),
                              "company-export.json",
                              "application/json",
                            );
                            setNotice("Company export downloaded.");
                          })
                        }
                      >
                        Export CompanySim JSON
                      </button>
                      <p>
                        Enriching imported data transmits its selected content
                        to your chosen provider.
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setConfirmation({
                            title: "Reset company?",
                            description:
                              "The active company will be deleted. Saved snapshots remain available.",
                            action: "Reset company",
                            run: async () => {
                              await api("/api/control/reset", "POST");
                              await refresh();
                              setPage("Overview");
                              setStep(0);
                            },
                          });
                        }}
                      >
                        Reset company
                      </button>
                    </>
                  )}
                  <h3>Local API token</h3>
                  <label>
                    Optional runtime token
                    <input
                      type="password"
                      autoComplete="off"
                      onBlur={(e) => {
                        sessionStorage.setItem("localToken", e.target.value);
                        void guard(refresh);
                      }}
                    />
                  </label>
                  <p>Version 0.1.0-alpha.1 · SQLite · Local-only defaults</p>
                </section>
              )}
            </>
          )}
          {confirmation && (
            <ConfirmDialog
              request={confirmation}
              onClose={() => setConfirmation(null)}
            />
          )}
          {detail && <DetailPanel detail={detail} onClose={closeDetail} />}
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
