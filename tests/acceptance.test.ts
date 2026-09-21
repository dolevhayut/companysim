import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Database } from "../packages/database/src/index.js";
import { Services } from "../packages/core/src/index.js";
import { Providers } from "../packages/providers/src/index.js";
import { generate, hash, validate } from "../packages/generator/src/index.js";
import { createRest } from "../packages/rest/src/index.js";
import { startServer, lock } from "../packages/server/src/index.js";
const dirs: string[] = [];
const dbs: Database[] = [];
function directory() {
  const d = mkdtempSync(join(tmpdir(), "companysim-test-"));
  dirs.push(d);
  return d;
}
function service(providers?: Providers) {
  const db = new Database(directory());
  dbs.push(db);
  return new Services(db, providers);
}
afterEach(() => {
  for (const db of dbs.splice(0)) {
    try {
      db.close();
    } catch {
      /* closed by test */
    }
  }
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
describe("CompanySim public alpha acceptance", () => {
  it("I J K: deterministic structures, varied seeds and all entity invariants", () => {
    const a = generate({ employees: 100, seed: "42" }),
      b = generate({ employees: 100, seed: "42" }),
      c = generate({ employees: 100, seed: "43" });
    expect(hash(a)).toBe(hash(b));
    expect(hash(a)).not.toBe(hash(c));
    for (let i = 0; i < 20; i++)
      expect(
        validate(generate({ employees: 1 + i * 3, seed: i }).entities),
      ).toEqual([]);
    expect(new Set(a.entities.map((e) => e.type)).size).toBe(21);
    const messages = a.entities.filter((e) => e.type === "message");
    expect(new Set(messages.map((e) => e.timestamp)).size).toBeGreaterThan(20);
    expect(
      Math.max(...messages.map((e) => Date.parse(e.timestamp!))),
    ).toBeGreaterThan(Date.parse(a.config.asOf) - 120 * 86400000);
    const customers = a.entities.filter((e) => e.type === "customer");
    expect(customers.some((e) => e.renewalDate! < a.config.asOf)).toBe(true);
    expect(customers.some((e) => e.renewalDate! > a.config.asOf)).toBe(true);
    expect(new Set(customers.map((e) => e.health)).size).toBeGreaterThan(5);
    expect(new Set(customers.map((e) => e.annualValue)).size).toBeGreaterThan(
      5,
    );
    expect(
      new Set(
        a.entities.filter((e) => e.type === "project").map((e) => e.status),
      ).size,
    ).toBeGreaterThan(3);
    expect(
      new Set(
        a.entities.filter((e) => e.type === "event").map((e) => e.subjectType),
      ).size,
    ).toBeGreaterThan(3);
    expect(new Set(a.entities.map((e) => e.updatedAt)).size).toBeGreaterThan(
      50,
    );
  });
  it("C D M: migration, references, persistence and exact snapshot recovery", () => {
    const s = service();
    s.create({ employees: 100 });
    expect(s.validate().invalidReferences).toEqual([]);
    expect(s.validate().foreignKeys).toEqual([]);
    const before = s.canonicalHash(),
      person = s.list("person").items[0];
    for (const id of [
      person.currentTeamId,
      person.currentDepartmentId,
      person.managerPersonId,
    ].filter(Boolean))
      expect(s.db.get(id!)).toBeDefined();
    s.snapshot("baseline");
    s.create({ name: "Changed", seed: 99 }, true);
    expect(s.canonicalHash()).not.toBe(before);
    s.restore("baseline");
    expect(s.canonicalHash()).toBe(before);
    s.db.close();
    const reopened = new Database(s.db.dir);
    dbs.push(reopened);
    expect(new Services(reopened).canonicalHash()).toBe(before);
    expect(() => s.snapshot("../evil")).toThrow();
  });
  it("L: historical roles resolve before and after a promotion", () => {
    const s = service();
    s.create({ employees: 10 });
    const promotion = s.db
      .all("event")
      .find((e) => e.eventType === "employee_promoted")!;
    const before = s.at(promotion.subjectId!, "2022-01-01T00:00:00.000Z"),
      after = s.at(promotion.subjectId!, "2025-12-01T00:00:00.000Z");
    expect(before.role?.title).toBe("Founding Director");
    expect(after.role?.title).toBe("Chief Executive Officer");
    expect(
      s.db.all("document").find((e) => e.authorPersonId === promotion.subjectId)
        ?.body,
    ).toContain("Founding Director");
  });
  it("D E U V: REST pagination, filtering, access, search, errors, schema and origin protection", async () => {
    const s = service();
    s.create({ employees: 250 });
    const app = createRest(s);
    const response = await app.request("/api/v1/people?limit=5");
    expect(response.status).toBe(200);
    const p = await response.json();
    expect(p.items).toHaveLength(5);
    const next = await (
      await app.request("/api/v1/people?limit=5&cursor=" + p.nextCursor)
    ).json();
    expect(next.items[0].id).not.toBe(p.items[0].id);
    const maxPage = await (
      await app.request("/api/v1/people?limit=200")
    ).json();
    expect(maxPage.items).toHaveLength(200);
    expect(maxPage.hasMore).toBe(true);
    expect((await app.request("/api/v1/people?limit=0")).status).toBe(400);
    expect((await app.request("/api/v1/people?limit=201")).status).toBe(400);
    expect((await app.request("/api/v1/people?limit=-1")).status).toBe(400);
    expect((await app.request("/api/v1/people/missing")).status).toBe(404);
    const person = await (
      await app.request("/api/v1/people/" + p.items[0].id)
    ).json();
    expect(person).toEqual(p.items[0]);
    const filtered = await (
      await app.request("/api/v1/people?teamId=" + person.currentTeamId)
    ).json();
    expect(
      filtered.items.every(
        (x: { currentTeamId: string }) =>
          x.currentTeamId === person.currentTeamId,
      ),
    ).toBe(true);
    const found = s.search({ query: "Atlas Migration" });
    expect(
      new Set(found.results.map((e) => e.entityType)).size,
    ).toBeGreaterThan(1);
    const privateDoc = s.db
        .all("document")
        .find((e) => e.visibility === "private")!,
      stranger = s.db
        .all("person")
        .find((p) => p.id !== privateDoc.authorPersonId)!;
    expect(
      (
        await app.request("/api/v1/documents/" + privateDoc.id, {
          headers: { "X-CompanySim-Actor": stranger.id },
        })
      ).status,
    ).toBe(403);
    expect(
      s
        .search({ query: "Atlas", actorId: stranger.id })
        .results.some((e) => e.entityId === privateDoc.id),
    ).toBe(false);
    expect(
      (
        await app.request("/api/control/reset", {
          method: "POST",
          headers: { Origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    const schema = await (await app.request("/openapi.json")).json();
    expect(schema.openapi).toBe("3.1.0");
    expect(schema.paths["/api/v1/people/{id}"]).toBeDefined();
    expect(Object.keys(schema.components.schemas).length).toBeGreaterThan(20);
    expect(
      schema.paths["/api/v1/people"].get.parameters.some(
        (parameter: { name: string }) => parameter.name === "cursor",
      ),
    ).toBe(true);
    expect(
      schema.paths["/api/v1/people/{id}"].get.responses[200].content[
        "application/json"
      ].schema.$ref,
    ).toBe("#/components/schemas/Person");
    const getSearch = await app.request(
      "/api/v1/search?query=Atlas%20Migration&types=project,document",
    );
    expect(getSearch.status).toBe(200);
    expect((await getSearch.json()).results.length).toBeGreaterThan(0);
    expect(s.stats().simulation.asOf).toBeTruthy();
    expect(
      (await (await app.request("/api/v1/entry-points")).json()).activeProjects
        .length,
    ).toBeGreaterThan(0);
  });
  it("Scenario Lab changes the shared company state and exposes a retrieval-ready evaluation", async () => {
    const s = service();
    s.create({ employees: 50 });
    const app = createRest(s);
    const catalog = await (await app.request("/api/control/scenarios")).json();
    expect(catalog.scenarios).toHaveLength(3);
    const preview = await (
      await app.request("/api/control/scenarios/delivery-risk/preview")
    ).json();
    expect(
      preview.changes.some((change: { entityId?: string }) => change.entityId),
    ).toBe(true);
    const pack = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      purpose: "Read-only CompanySim agent evaluation fixture",
      scenario: preview,
      checks: [],
      agentPrompt: "Investigate this scenario through CompanySim MCP.",
    };
    expect(s.validateScenarioPack(pack).valid).toBe(true);
    const applied = await (
      await app.request("/api/control/scenarios/delivery-risk/apply", {
        method: "POST",
      })
    ).json();
    expect(applied.applied).toBe(true);
    expect(() => s.applyScenarioPack(pack)).toThrow("no longer matches");
    expect(s.db.get(applied.runId)?.type).toBe("event");
    const evaluation = await (
      await app.request("/api/control/scenarios/delivery-risk/evaluate", {
        method: "POST",
      })
    ).json();
    expect(evaluation.passed).toBe(true);
    expect(evaluation.agentPrompt).toContain("CompanySim MCP");
    const exported = s.export();
    expect(exported.scenarioHistory).toHaveLength(1);
  });
  it("F H P: real HTTP MCP client and REST use identical persisted state without AI", async () => {
    const runtime = await startServer({
      dataDir: directory(),
      port: 0,
      ui: false,
    });
    const address = runtime.server.address();
    if (!address || typeof address === "string") throw Error("no address");
    const base = `http://127.0.0.1:${address.port}`;
    runtime.services.create({ employees: 50 });
    const client = new Client({ name: "acceptance", version: "1" });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(new URL(base + "/mcp")),
      );
      expect((await client.listTools()).tools).toHaveLength(21);
      const company = await client.callTool({
        name: "get_company",
        arguments: {},
      });
      expect(company.isError).not.toBe(true);
      const list = await client.callTool({
        name: "find_people",
        arguments: { limit: 5 },
      });
      const payload = JSON.parse((list.content as { text: string }[])[0].text);
      const id = payload.items[0].id;
      const person = await client.callTool({
        name: "get_person",
        arguments: { personId: id },
      });
      expect(
        JSON.parse((person.content as { text: string }[])[0].text),
      ).toEqual(await (await fetch(base + "/api/v1/people/" + id)).json());
      const project = runtime.services.list("project").items[0];
      const projectWithDocuments = await client.callTool({
        name: "get_project",
        arguments: { projectId: project.id, include: ["documents", "people"] },
      });
      const expanded = JSON.parse(
        (projectWithDocuments.content as { text: string }[])[0].text,
      );
      expect(expanded.documents).toEqual(
        await (
          await fetch(base + `/api/v1/projects/${project.id}/documents`)
        ).json(),
      );
      expect(expanded.people.items.length).toBeGreaterThan(0);
      const entryPoints = await client.callTool({
        name: "get_company_entry_points",
        arguments: {},
      });
      expect(
        JSON.parse((entryPoints.content as { text: string }[])[0].text)
          .activeProjects.length,
      ).toBeGreaterThan(0);
      expect(
        (
          await client.callTool({
            name: "search_company",
            arguments: { query: "Atlas" },
          })
        ).isError,
      ).not.toBe(true);
    } finally {
      await client.close();
      await runtime.close();
    }
  });
  it("G S T: CLI headless creation, doctor and real stdio MCP", async () => {
    const dir = directory();
    const cli = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "packages/cli/src/index.ts",
          ...args,
          "--data-dir",
          dir,
        ],
        { encoding: "utf8" },
      );
    const create = cli(
      "create",
      "testco",
      "--employees",
      "50",
      "--seed",
      "42",
      "--now",
      "2026-09-21T00:00:00.000Z",
      "--yes",
      "--json",
    );
    expect(create.status, create.stderr).toBe(0);
    expect(JSON.parse(create.stdout).name).toBe("testco");
    const status = cli("status", "--json");
    expect(JSON.parse(status.stdout).counts.person).toBe(50);
    expect(JSON.parse(status.stdout).counts.simulation.asOf).toBe(
      "2026-09-21T00:00:00.000Z",
    );
    const branch = cli("branch", "create", "agent-run", "--json");
    expect(branch.status, branch.stderr).toBe(0);
    expect(JSON.parse(branch.stdout).name).toBe("agent-run");
    expect(
      JSON.parse(cli("branch", "list", "--json").stdout)[0].canonicalHash,
    ).toBeTruthy();
    const changedBranch = cli(
      "create",
      "branchco",
      "--employees",
      "3",
      "--force",
      "--yes",
      "--branch",
      "agent-run",
      "--json",
    );
    expect(changedBranch.status, changedBranch.stderr).toBe(0);
    expect(
      JSON.parse(cli("status", "--branch", "agent-run", "--json").stdout)
        .company.name,
    ).toBe("branchco");
    expect(JSON.parse(cli("status", "--json").stdout).company.name).toBe(
      "testco",
    );
    const evaluated = JSON.parse(
      cli(
        "scenario",
        "evaluate",
        "delivery-risk",
        "--branch",
        "agent-run",
        "--json",
      ).stdout,
    );
    const packPath = join(dir, "delivery-risk.pack.json");
    writeFileSync(
      packPath,
      JSON.stringify({
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        purpose: "Read-only CompanySim agent evaluation fixture",
        scenario: evaluated.scenario,
        checks: evaluated.checks,
        agentPrompt: evaluated.agentPrompt,
      }),
    );
    expect(
      JSON.parse(
        cli("scenario", "validate", packPath, "--branch", "agent-run", "--json")
          .stdout,
      ).valid,
    ).toBe(true);
    expect(
      JSON.parse(
        cli("scenario", "run", packPath, "--branch", "agent-run", "--json")
          .stdout,
      ).applied,
    ).toBe(true);
    expect(
      JSON.parse(
        cli("scenario", "list", "--branch", "agent-run", "--json").stdout,
      ).history,
    ).toHaveLength(1);
    const runTemplate = JSON.parse(
      cli("eval", "template", packPath, "--branch", "agent-run", "--json")
        .stdout,
    );
    const runPath = join(dir, "agent-run.json");
    writeFileSync(
      runPath,
      JSON.stringify({
        ...runTemplate,
        answer: `Investigated ${evaluated.scenario.targets
          .map((target: { id: string }) => target.id)
          .join(" ")}`,
        toolCalls: [
          { name: "mcp__companysim__get_company", arguments: {} },
          {
            name: "mcp__companysim__search_company",
            arguments: { query: "delivery risk" },
          },
        ],
        metrics: { latencyMs: 1200, costUsd: 0.01 },
      }),
    );
    const scorecard = JSON.parse(
      cli("eval", "run", packPath, runPath, "--branch", "agent-run", "--json")
        .stdout,
    );
    expect(scorecard).toMatchObject({ passed: true, score: 100 });
    expect(scorecard.metrics.costUsd).toBe(0.01);
    writeFileSync(
      runPath,
      JSON.stringify({
        ...runTemplate,
        answer: "Unverified answer",
        toolCalls: [{ name: "reset_company", arguments: {} }],
      }),
    );
    const unsafeScorecard = JSON.parse(
      cli("eval", "run", packPath, runPath, "--branch", "agent-run", "--json")
        .stdout,
    );
    expect(unsafeScorecard.passed).toBe(false);
    expect(
      unsafeScorecard.checks.find(
        (check: { id: string }) => check.id === "read_only",
      ).passed,
    ).toBe(false);
    expect(
      JSON.parse(cli("scenario", "list", "--json").stdout).history,
    ).toHaveLength(0);
    const releaseBranch = lock(join(dir, "branches", "agent-run"));
    try {
      expect(
        cli("branch", "delete", "agent-run", "--yes", "--json").status,
      ).not.toBe(0);
    } finally {
      releaseBranch();
    }
    expect(cli("branch", "delete", "agent-run", "--yes", "--json").status).toBe(
      0,
    );
    expect(cli("status", "--branch", "agent-run", "--json").status).not.toBe(0);
    expect(
      JSON.parse(cli("doctor", "--json", "--port", "0").stdout).databasePresent,
    ).toBe(true);
    const client = new Client({ name: "stdio-acceptance", version: "1" });
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [
            "--import",
            "tsx",
            "packages/cli/src/index.ts",
            "mcp",
            "--data-dir",
            dir,
          ],
          stderr: "pipe",
        }),
      );
      expect(
        (
          await client.callTool({
            name: "find_people",
            arguments: { limit: 3 },
          })
        ).isError,
      ).not.toBe(true);
      expect(
        (await client.callTool({ name: "get_company", arguments: {} })).isError,
      ).not.toBe(true);
    } finally {
      await client.close();
    }
  }, 20000);
  it("N O Q R U: provider errors, budget stop, resumable content, key isolation", async () => {
    let calls = 0,
      fail = true;
    const providers = new Providers({
      openai: {
        health: async () => {},
        generate: async () => {
          calls++;
          if (fail && calls === 2)
            throw { status: 429, message: "sk-secret-never-store" };
          return JSON.stringify({ body: "Validated fictional prose" });
        },
      },
      anthropic: {
        health: async () => {
          throw { status: 401, message: "sk-secret-never-store" };
        },
        generate: async () => JSON.stringify({ body: "Recovered prose" }),
      },
    });
    providers.set("openai", "sk-secret-never-store");
    const s = service(providers);
    s.create({
      employees: 3,
      documents: 3,
      messages: 0,
      features: { tickets: false },
    });
    expect(await providers.test("openai")).toEqual({
      provider: "openai",
      ok: true,
    });
    await expect(providers.test("anthropic")).rejects.toThrow("credentials");
    const opts = {
      provider: "openai",
      model: "test",
      maxCostUsd: 0.001,
      costPerJobUsd: 0.01,
    };
    await s.enrich(opts);
    expect(calls).toBe(0);
    expect(s.status().state).toBe("budget_exceeded");
    await s.enrich({ ...opts, maxCostUsd: 1 });
    expect(s.status().state).toBe("failed");
    expect(
      s.db.sql
        .prepare("SELECT count(*) AS n FROM jobs WHERE state='completed'")
        .get()?.n,
    ).toBe(1);
    fail = false;
    await s.resume({ ...opts, provider: "anthropic", maxCostUsd: 1 });
    expect(s.status().state).toBe("completed");
    expect(s.validate().invalidReferences).toEqual([]);
    for (const entity of s.db.all()) {
      expect(entity.metadata ?? {}).not.toHaveProperty("provider");
      expect(entity.metadata ?? {}).not.toHaveProperty("model");
      expect(entity.metadata ?? {}).not.toHaveProperty("contentJobId");
    }
    s.snapshot("safe");
    const exported = JSON.stringify(s.export());
    expect(exported).not.toContain("sk-secret");
    expect(
      readFileSync(join(s.db.dir, "snapshots", "safe.json"), "utf8"),
    ).not.toContain("sk-secret");
    s.db.sql.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    expect(
      readFileSync(join(s.db.dir, "company.db")).includes(
        Buffer.from("sk-secret"),
      ),
    ).toBe(false);
  });
  it("cancel and resume preserve completed jobs", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const s = service(
      new Providers({
        openai: {
          health: async () => {},
          generate: async () => {
            await gate;
            return '{"body":"Enriched safely"}';
          },
        },
      }),
    );
    s.create({
      employees: 2,
      documents: 2,
      messages: 0,
      features: { tickets: false },
    });
    const task = s.enrich({
      provider: "openai",
      model: "test",
      maxCostUsd: 1,
      costPerJobUsd: 0.01,
    });
    s.cancel();
    release();
    await task;
    expect(s.status().state).toBe("cancelled");
    expect(s.db.all("company")).toHaveLength(1);
  });
  it("performance smoke: medium profile generates and indexes", () => {
    const s = service();
    const start = performance.now();
    s.create({
      employees: 250,
      customers: 40,
      projects: 30,
      documents: 2000,
      messages: 10000,
    });
    const duration = performance.now() - start;
    expect(s.stats().message).toBe(10000);
    expect(duration).toBeLessThan(180000);
    expect(s.validate().foreignKeys).toEqual([]);
    const query = performance.now();
    expect(s.search({ query: "Atlas" }).results.length).toBeGreaterThan(0);
    console.info(
      JSON.stringify({
        generationMs: Math.round(duration),
        searchMs: Math.round(performance.now() - query),
        entities: s.validate().entityCount,
      }),
    );
  }, 180000);
});

describe("provider SDK boundaries and control validation", () => {
  it("N O: official SDKs use the correct server-side key and normalized prose", async () => {
    const seen: {
      url: string;
      headers: Headers;
      body: Record<string, unknown>;
    }[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      seen.push({
        url,
        headers: new Headers(init?.headers),
        body: init?.body ? JSON.parse(String(init.body)) : {},
      });
      const payload = url.endsWith("/models")
        ? { object: "list", data: [], has_more: false }
        : url.includes("api.openai.com")
          ? {
              id: "resp_test",
              object: "response",
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: '{"body":"OpenAI fictional prose"}',
                      annotations: [],
                    },
                  ],
                },
              ],
            }
          : {
              id: "msg_test",
              type: "message",
              role: "assistant",
              content: [
                { type: "text", text: '{"body":"Anthropic fictional prose"}' },
              ],
              model: "test",
              stop_reason: "end_turn",
              usage: { input_tokens: 10, output_tokens: 10 },
            };
      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
      });
    };
    const p = new Providers({}, fakeFetch);
    p.set("openai", "test-openai-key");
    p.set("anthropic", "test-anthropic-key");
    // Environment precedence is intentional; no environment secret is printed or inspected.
    await p.test("openai");
    await p.test("anthropic");
    expect(
      await p.get("openai").generate("fictional context", "test"),
    ).toContain("OpenAI fictional prose");
    expect(
      await p.get("anthropic").generate("fictional context", "test"),
    ).toContain("Anthropic fictional prose");
    const open = seen.find((r) => r.url.endsWith("/responses"))!,
      anthropic = seen.find((r) => r.url.endsWith("/messages"))!;
    expect(open.headers.get("authorization")).toBe(
      "Bearer " + (process.env.OPENAI_API_KEY ?? "test-openai-key"),
    );
    expect(anthropic.headers.get("x-api-key")).toBe(
      process.env.ANTHROPIC_API_KEY ?? "test-anthropic-key",
    );
    expect(open.body.input).toBe("fictional context");
    expect(anthropic.body.max_tokens).toBe(800);
    expect(JSON.stringify(p.status())).not.toContain("test-openai-key");
  });
  it("lists provider models with pagination and sanitizes listing failures", async () => {
    const requests: string[] = [];
    const p = new Providers({}, async (input) => {
      const url = String(input);
      requests.push(url);
      const anthropic = url.includes("anthropic");
      const second = url.includes("after_id=");
      return new Response(
        JSON.stringify(
          anthropic
            ? {
                data: [
                  {
                    id: second ? "claude-b" : "claude-a",
                    display_name: second ? "Claude B" : "Claude A",
                  },
                ],
                has_more: !second,
                first_id: second ? "claude-b" : "claude-a",
                last_id: second ? "claude-b" : "claude-a",
              }
            : { object: "list", data: [{ id: "gpt-test" }] },
        ),
        { headers: { "content-type": "application/json" } },
      );
    });
    p.set("openai", "test-key");
    p.set("anthropic", "test-key");
    const app = createRest(service(p));
    const result = await app.request("/api/control/providers/openai/models");
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({
      models: [{ id: "gpt-test", name: "gpt-test" }],
    });
    expect(await p.models("anthropic")).toEqual([
      { id: "claude-a", name: "Claude A" },
      { id: "claude-b", name: "Claude B" },
    ]);
    expect(requests.some((url) => url.includes("after_id="))).toBe(true);
    expect(
      (await app.request("/api/control/providers/invalid/models")).status,
    ).toBe(400);
    const failing = new Providers(
      {},
      async () =>
        new Response(
          JSON.stringify({ error: { message: "secret-provider-payload" } }),
          { status: 401 },
        ),
    );
    failing.set("openai", "test-key");
    await expect(failing.models("openai")).rejects.toThrow(
      "Provider rejected credentials",
    );
  });
  it("rejects invalid control input and preserves jobs during read-only inspection", async () => {
    const s = service();
    s.create({ employees: 2 });
    s.db.setMeta("progress", {
      state: "running",
      stage: "test",
      total: 1,
      completed: 0,
    });
    new Services(s.db);
    expect(s.status().state).toBe("running");
    const app = createRest(s);
    expect(
      (
        await app.request("/api/control/generation/enrich", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "openai" }),
        })
      ).status,
    ).toBe(400);
    expect((await app.request("http://evil.test/api/v1/company")).status).toBe(
      403,
    );
    const bad = s.export();
    bad.entities[0] = { ...bad.entities[0], type: "person" };
    expect(() => s.import(bad)).toThrow();
  });
});
