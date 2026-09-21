import {
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  lstatSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  AppError,
  entitySchema,
  configSchema,
  listSchema,
  searchSchema,
  enrichmentSchema,
  GENERATOR_VERSION,
  type Entity,
  type EntityType,
  type ListInput,
  type Config,
  type Enrichment,
} from "../../schema/src/index.js";
import { generate, plan, hash, validate } from "../../generator/src/index.js";
import type { Database } from "../../database/src/index.js";
import { Providers, providerError } from "../../providers/src/index.js";
export interface Progress {
  state: string;
  stage: string;
  completed: number;
  total: number;
  error?: string;
  reservedCostUsd?: number;
}
const scenarioIds = ["delivery-risk", "renewal-risk", "security-review"] as const;
type ScenarioId = (typeof scenarioIds)[number];
type ScenarioHistory = {
  id: string;
  scenarioId: ScenarioId;
  title: string;
  appliedAt: string;
  affectedIds: string[];
};
type ScenarioChange = {
  entityId?: string;
  entityType: string;
  field: string;
  before: unknown;
  after: unknown;
};
function projectChange(
  entity: Entity | undefined,
  field: "status" | "priority",
  after: string,
): ScenarioChange[] {
  if (!entity) return [];
  return [
    {
      entityId: entity.id,
      entityType: entity.type,
      field,
      before: entity[field],
      after,
    },
  ];
}
export class Services {
  running: Promise<void> | undefined;
  constructor(
    readonly db: Database,
    readonly providers = new Providers(),
    recover = false,
  ) {
    if (!recover) return;
    const p = this.status();
    if (["running", "cancel_requested"].includes(p.state))
      this.db.setMeta("progress", {
        ...p,
        state: "interrupted",
        error: "Runtime stopped. Resume generation.",
      });
    this.db.sql
      .prepare("UPDATE jobs SET state='pending' WHERE state='running'")
      .run();
  }
  company() {
    const c = this.db.all("company")[0];
    if (!c)
      throw new AppError("NOT_INITIALIZED", "Create a company first.", 404);
    return c;
  }
  stats() {
    return Object.fromEntries(
      this.db.sql
        .prepare("SELECT type,count(*) AS count FROM entities GROUP BY type")
        .all()
        .map((r) => [String(r.type), Number(r.count)]),
    );
  }
  assertIdle() {
    if (this.running)
      throw new AppError(
        "CONFLICT",
        "Generation is running. Cancel and wait before changing state.",
        409,
      );
  }
  create(input: unknown, force = false) {
    this.assertIdle();
    if (this.db.all("company").length && !force)
      throw new AppError(
        "CONFLICT",
        "A company already exists. Use force or reset.",
        409,
      );
    const result = generate(input);
    this.db.transaction(() => {
      this.db.clear();
      for (const e of result.entities) this.db.put(e);
      this.db.setMeta("config", result.config);
      this.db.setMeta("generatorVersion", GENERATOR_VERSION);
      this.db.setMeta("progress", {
        state: "completed",
        stage: "Indexed",
        completed: result.entities.length,
        total: result.entities.length,
      });
      this.planJobs();
    });
    return this.company();
  }
  plan(input: unknown) {
    return plan(input);
  }
  start(input: unknown, force = false) {
    this.assertIdle();
    if (this.db.all("company").length && !force)
      throw new AppError("CONFLICT", "A company already exists.", 409);
    const p = plan(input);
    this.db.setMeta("pendingConfig", p.config);
    this.db.setMeta("progress", {
      state: "running",
      stage: "Building organization",
      completed: 0,
      total: Object.values(p.counts).reduce((a, b) => a + b, 0),
    });
    this.running = new Promise<void>((resolve) =>
      setImmediate(() => {
        this.running = undefined;
        try {
          if (this.status().state === "cancel_requested") {
            this.db.setMeta("progress", {
              ...this.status(),
              state: "cancelled",
            });
          } else this.create(p.config, force);
        } catch (e) {
          this.db.setMeta("progress", {
            ...this.status(),
            state: "failed",
            error:
              e instanceof AppError
                ? e.message
                : "Generation failed validation.",
          });
        } finally {
          resolve();
        }
      }),
    );
    return this.status();
  }
  status(): Progress {
    return (
      this.db.meta<Progress>("progress") ?? {
        state: "idle",
        stage: "Ready",
        completed: 0,
        total: 0,
      }
    );
  }
  actor(actorId?: string) {
    if (!actorId) return;
    const a = this.db.get(actorId);
    if (a?.type !== "person")
      throw new AppError("INVALID_ACTOR", "Actor must identify a person.", 400);
    return a;
  }
  visible(e: Entity, actorId?: string): boolean {
    const a = this.actor(actorId);
    if (!a) return true;
    if (e.type === "relationship" || e.type === "permission") {
      const ids =
        e.type === "relationship"
          ? [e.sourceId, e.targetId]
          : [e.subjectId, e.resourceId];
      return ids.every((id) => {
        const target = this.db.get(id ?? "");
        return (
          !!target &&
          !["relationship", "permission"].includes(target.type) &&
          this.visible(target, actorId)
        );
      });
    }
    const owner = e.authorPersonId ?? e.ownerPersonId ?? e.senderPersonId;
    if (!e.visibility || ["public", "company"].includes(e.visibility))
      return true;
    if (owner === a.id) return true;
    if (
      e.visibility === "team" &&
      (e.teamId === a.currentTeamId ||
        this.db.get(owner ?? "")?.currentTeamId === a.currentTeamId)
    )
      return true;
    if (
      e.visibility === "department" &&
      (e.ownerDepartmentId === a.currentDepartmentId ||
        this.db.get(owner ?? "")?.currentDepartmentId === a.currentDepartmentId)
    )
      return true;
    const now = this.db.meta<Config>("config")?.asOf ?? "";
    return this.db
      .all("permission")
      .some(
        (p) =>
          p.resourceId === e.id &&
          (p.subjectId === a.id ||
            p.subjectId === a.currentTeamId ||
            p.subjectId === a.currentDepartmentId) &&
          (!p.validFrom || p.validFrom <= now) &&
          (!p.validTo || p.validTo > now),
      );
  }
  get(type: EntityType, id: string, actorId?: string) {
    this.actor(actorId);
    const e = this.db.get(id);
    if (!e || e.type !== type)
      throw new AppError("ENTITY_NOT_FOUND", `${type} was not found.`, 404);
    if (!this.visible(e, actorId))
      throw new AppError(
        "PERMISSION_DENIED",
        "This actor cannot view the entity.",
        403,
      );
    return e;
  }
  list(type: EntityType, input: ListInput = {}) {
    const q = listSchema.parse(input);
    this.actor(q.actorId);
    let after = "";
    if (q.cursor) {
      try {
        const c = JSON.parse(Buffer.from(q.cursor, "base64url").toString()) as {
          type: string;
          id: string;
        };
        if (c.type !== type || typeof c.id !== "string") throw Error();
        after = c.id;
      } catch {
        throw new AppError("VALIDATION", "Invalid pagination cursor.");
      }
    }
    const aliases: Record<string, string> = {
      departmentId: "currentDepartmentId",
      teamId: "currentTeamId",
      managerId: "managerPersonId",
    };
    const query = (q.q ?? q.query)?.toLowerCase();
    const items = this.db
      .all(type)
      .filter(
        (e) =>
          e.id > after &&
          this.visible(e, q.actorId) &&
          (!query || JSON.stringify(e).toLowerCase().includes(query)) &&
          Object.entries(q).every(
            ([k, v]) =>
              ["limit", "cursor", "q", "query", "actorId", "at"].includes(k) ||
              String(
                e[
                  (type === "person" && aliases[k]
                    ? aliases[k]
                    : k) as keyof Entity
                ],
              ) === String(v),
          ) &&
          (!q.at ||
            ((!e.validFrom || e.validFrom <= q.at) &&
              (!e.validTo || e.validTo > q.at))),
      )
      .slice(0, q.limit + 1);
    const hasMore = items.length > q.limit;
    if (hasMore) items.pop();
    return {
      items,
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(JSON.stringify({ type, id: items.at(-1)!.id })).toString(
            "base64url",
          )
        : null,
    };
  }
  related(type: EntityType, id: string, target: EntityType, actorId?: string) {
    const e = this.get(type, id, actorId);
    const edges = this.db
      .all("relationship")
      .filter((r) => r.sourceId === id || r.targetId === id);
    const linked = new Set(edges.flatMap((r) => [r.sourceId, r.targetId]));
    const items = this.db
      .all(target)
      .filter(
        (x) =>
          this.visible(x, actorId) &&
          (target === "relationship"
            ? x.sourceId === id || x.targetId === id
            : linked.has(x.id) ||
              Object.entries(x).some(
                ([k, v]) => k.endsWith("Id") && v === id,
              ) ||
              Object.entries(e).some(
                ([k, v]) => k.endsWith("Id") && v === x.id,
              )),
      );
    return {
      items: items.slice(0, 200),
      hasMore: items.length > 200,
      nextCursor: null,
    };
  }
  search(input: unknown) {
    const q = searchSchema.parse(input);
    this.actor(q.actorId);
    const words = q.query.match(/[\p{L}\p{N}_]+/gu) ?? [];
    if (!words.length) return { results: [], nextCursor: null };
    const match = words.map((w) => '"' + w + '"').join(" OR ");
    const hits = this.db.sql
      .prepare(
        "SELECT id,bm25(search) AS score FROM search WHERE search MATCH ? ORDER BY score LIMIT 1000",
      )
      .all(match);
    const scores = new Map(hits.map((h) => [String(h.id), Number(h.score)]));
    const edges = this.db.all("relationship");
    for (const h of hits.slice(0, 20)) {
      const entity = this.db.get(String(h.id));
      if (!entity || !this.visible(entity, q.actorId)) continue;
      for (const [k, v] of Object.entries(entity))
        if (k.endsWith("Id") && typeof v === "string" && !scores.has(v))
          scores.set(v, 0);
      for (const edge of edges)
        if (edge.sourceId === h.id || edge.targetId === h.id) {
          const id = edge.sourceId === h.id ? edge.targetId : edge.sourceId;
          if (id && !scores.has(id)) scores.set(id, 0);
        }
    }
    const results = [...scores]
      .flatMap(([id, score]) => {
        const e = this.db.get(id);
        if (
          !e ||
          !this.visible(e, q.actorId) ||
          (q.types?.length && !q.types.includes(e.type))
        )
          return [];
        return [
          {
            entityType: e.type,
            entityId: e.id,
            title: e.title ?? e.name ?? e.displayName ?? e.subject ?? e.id,
            snippet: (e.body ?? e.description ?? e.email ?? "").slice(0, 300),
            score,
            relationshipContext: edges
              .filter(
                (r) =>
                  (r.sourceId === id || r.targetId === id) &&
                  this.visible(this.db.get(r.sourceId!)!, q.actorId) &&
                  this.visible(this.db.get(r.targetId!)!, q.actorId),
              )
              .slice(0, 10),
          },
        ];
      })
      .slice(0, q.limit);
    return { results, nextCursor: null };
  }
  at(personId: string, at: string) {
    z.iso.datetime().parse(at);
    const p = this.get("person", personId);
    if (p.startDate! > at)
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Person was not employed at this time.",
        404,
      );
    const role = this.db
      .all("relationship")
      .find(
        (r) =>
          r.sourceId === personId &&
          r.relationType === "has_role" &&
          r.validFrom! <= at &&
          (!r.validTo || r.validTo > at),
      );
    return {
      ...p,
      currentRoleId: role?.targetId,
      role: role ? this.db.get(role.targetId!) : undefined,
    };
  }
  validate() {
    return {
      invalidReferences: validate(this.db.all()),
      foreignKeys: this.db.sql.prepare("PRAGMA foreign_key_check").all(),
      entityCount: this.db.all().length,
      searchIndexCount: Number(
        this.db.sql.prepare("SELECT count(*) AS n FROM search").get()?.n,
      ),
    };
  }
  canonicalHash() {
    return hash(this.db.all());
  }
  export() {
    return {
      formatVersion: 1,
      generatorVersion: GENERATOR_VERSION,
      config: this.db.meta("config"),
      entities: this.db.all(),
      jobs: this.db.sql.prepare("SELECT * FROM jobs ORDER BY id").all(),
      progress: this.status(),
      enrichment: this.db.meta("enrichment"),
      scenarioHistory: this.db.meta("scenarioHistory"),
    };
  }
  import(input: unknown) {
    this.assertIdle();
    const data = z
      .object({
        formatVersion: z.literal(1),
        generatorVersion: z.literal(1),
        config: configSchema,
        entities: z.array(entitySchema).max(1000000),
        jobs: z
          .array(
            z.object({ id: z.string(), state: z.string(), data: z.string() }),
          )
          .default([]),
        enrichment: enrichmentSchema.optional(),
        scenarioHistory: z
          .array(
            z.object({
              id: z.string(),
              scenarioId: z.enum(scenarioIds),
              title: z.string(),
              appliedAt: z.string(),
              affectedIds: z.array(z.string()),
            }),
          )
          .optional(),
        progress: z
          .object({
            state: z.string(),
            stage: z.string(),
            completed: z.number(),
            total: z.number(),
            reservedCostUsd: z.number().optional(),
            error: z.string().optional(),
          })
          .optional(),
      })
      .strict()
      .parse(input);
    const entityMap = new Map(data.entities.map((e) => [e.id, e]));
    for (const job of data.jobs) {
      const content = z
        .object({
          entityId: z.string(),
          type: z.enum(["document", "message", "ticket"]),
          timestamp: z.iso.datetime(),
          promptVersion: z.literal("1"),
          targetSchemaVersion: z.literal(1),
        })
        .strict()
        .parse(JSON.parse(job.data));
      if (
        content.entityId !== job.id ||
        entityMap.get(job.id)?.type !== content.type ||
        !["pending", "running", "completed", "failed", "cancelled"].includes(
          job.state,
        )
      )
        throw new AppError("VALIDATION", "Invalid imported content job.");
    }
    const errors = validate(data.entities);
    if (errors.length)
      throw new AppError("VALIDATION", "Import contains invalid references.");
    if (data.entities.filter((e) => e.type === "company").length !== 1)
      throw new AppError(
        "VALIDATION",
        "Import must contain exactly one company.",
      );
    this.db.transaction(() => {
      this.db.clear();
      for (const e of data.entities) this.db.put(e);
      this.db.setMeta("config", data.config);
      this.db.setMeta("generatorVersion", data.generatorVersion);
      if (data.enrichment) this.db.setMeta("enrichment", data.enrichment);
      if (data.scenarioHistory)
        this.db.setMeta("scenarioHistory", data.scenarioHistory);
      for (const j of data.jobs)
        this.db.sql
          .prepare("INSERT INTO jobs VALUES(?,?,?)")
          .run(j.id, j.state === "running" ? "pending" : j.state, j.data);
      this.db.setMeta(
        "progress",
        data.progress ?? {
          state: "completed",
          stage: "Imported",
          completed: 0,
          total: 0,
        },
      );
    });
    return this.company();
  }
  private snapshotPath(name: string) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name))
      throw new AppError(
        "VALIDATION",
        "Snapshot name must contain only letters, numbers, underscores and hyphens.",
      );
    const dir = join(this.db.dir, "snapshots");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (lstatSync(dir).isSymbolicLink())
      throw new AppError(
        "VALIDATION",
        "Snapshot directory cannot be a symlink.",
      );
    return join(dir, name + ".json");
  }
  snapshots() {
    const path = this.snapshotPath("unused");
    return readdirSync(join(path, ".."))
      .filter((f) => /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.json$/.test(f))
      .map((f) => ({ id: f.slice(0, -5) }));
  }
  snapshot(name: string) {
    this.assertIdle();
    this.company();
    const path = this.snapshotPath(name);
    try {
      writeFileSync(path, JSON.stringify(this.export()), {
        flag: "wx",
        mode: 0o600,
      });
    } catch {
      throw new AppError(
        "CONFLICT",
        "Snapshot already exists or is not writable.",
        409,
      );
    }
    return { id: name };
  }
  restore(name: string) {
    const path = this.snapshotPath(name);
    try {
      if (lstatSync(path).isSymbolicLink()) throw Error();
    } catch {
      throw new AppError("ENTITY_NOT_FOUND", "Snapshot not found.", 404);
    }
    return this.import(JSON.parse(readFileSync(path, "utf8")));
  }
  deleteSnapshot(name: string) {
    unlinkSync(this.snapshotPath(name));
    return { deleted: true };
  }
  private scenarioTargets() {
    const project = this.db.all("project")[0];
    const customer = project?.customerId
      ? this.db.get(project.customerId)
      : this.db.all("customer")[0];
    const ticket = project
      ? this.db.all("ticket").find((item) => item.projectId === project.id) ??
        this.db.all("ticket")[0]
      : this.db.all("ticket")[0];
    return { project, customer, ticket };
  }
  private scenario(id: string) {
    if (!scenarioIds.includes(id as ScenarioId))
      throw new AppError("ENTITY_NOT_FOUND", "Scenario was not found.", 404);
    const targets = this.scenarioTargets();
    const all = Object.values(targets).filter(Boolean) as Entity[];
    const data: Record<ScenarioId, { title: string; description: string; focus: string }> = {
      "delivery-risk": {
        title: "Delivery risk",
        description: "A project is slipping and needs a connected customer, owner and support trail.",
        focus: "project delivery",
      },
      "renewal-risk": {
        title: "Renewal at risk",
        description: "A customer’s renewal needs context across its account, projects and tickets.",
        focus: "customer health",
      },
      "security-review": {
        title: "Security review",
        description: "A priority support issue requires an agent to retrieve the relevant company context.",
        focus: "support triage",
      },
    };
    const changes =
      id === "delivery-risk"
        ? projectChange(targets.project, "status", "at_risk")
        : id === "renewal-risk"
          ? projectChange(targets.customer, "status", "at_risk")
          : [
              ...projectChange(targets.ticket, "priority", "urgent"),
              ...projectChange(targets.ticket, "status", "open"),
            ];
    return { id: id as ScenarioId, ...data[id as ScenarioId], targets: all, changes };
  }
  scenarios() {
    this.company();
    return {
      scenarios: scenarioIds.map((id) => {
        const scenario = this.scenario(id);
        return {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          focus: scenario.focus,
          affectedCount: scenario.targets.length,
        };
      }),
      history: this.db.meta<ScenarioHistory[]>("scenarioHistory") ?? [],
    };
  }
  scenarioPreview(id: string) {
    this.company();
    const scenario = this.scenario(id);
    return {
      ...scenario,
      changes: [
        ...scenario.changes,
        { entityType: "event", field: "eventType", before: null, after: "scenario_applied" },
      ],
    };
  }
  applyScenario(id: string) {
    this.assertIdle();
    const preview = this.scenarioPreview(id);
    const now = new Date().toISOString();
    const history = this.db.meta<ScenarioHistory[]>("scenarioHistory") ?? [];
    const runId = `scenario_${preview.id.replace(/-/g, "_")}_${history.length + 1}`;
    this.db.transaction(() => {
      for (const change of preview.changes) {
        if (!change.entityId) continue;
        const entity = this.db.get(change.entityId)!;
        this.db.put({
          ...entity,
          [change.field]: change.after,
          updatedAt: now,
          metadata: { ...entity.metadata, scenario: preview.id, scenarioAppliedAt: now },
        } as Entity);
      }
      this.db.put({
        id: runId,
        type: "event",
        createdAt: now,
        updatedAt: now,
        eventType: "scenario_applied",
        occurredAt: now,
        actorType: "company",
        actorId: this.company().id,
        payload: { scenarioId: preview.id, title: preview.title, affectedIds: preview.targets.map((item) => item.id) },
      });
      this.db.setMeta("scenarioHistory", [
        ...history,
        { id: runId, scenarioId: preview.id, title: preview.title, appliedAt: now, affectedIds: preview.targets.map((item) => item.id) },
      ]);
    });
    return { ...this.scenarioPreview(id), applied: true, runId };
  }
  evaluateScenario(id: string) {
    const preview = this.scenarioPreview(id);
    const first = preview.targets[0];
    const searchable = first
      ? this.search({ query: first.name ?? first.title ?? first.id }).results
      : [];
    const checks = [
      { id: "targets", label: "Scenario targets resolve", passed: preview.targets.length > 0, detail: `${preview.targets.length} connected records available.` },
      { id: "search", label: "Search returns scenario context", passed: searchable.length > 0, detail: `${searchable.length} result${searchable.length === 1 ? "" : "s"} returned for the primary target.` },
      { id: "relationships", label: "Connected context is present", passed: preview.targets.length >= 2, detail: `${preview.targets.length} records can be inspected through REST or MCP.` },
    ];
    const prompt = `Use the CompanySim MCP server to investigate the ${preview.title.toLowerCase()} scenario. Start by calling get_company and search_company for ${JSON.stringify(first?.name ?? first?.title ?? first?.id ?? "the scenario target")}. Then inspect every returned project, customer, ticket and person that is relevant. Give a concise risk summary, cite the entity IDs used, and recommend the next action. Do not mutate, reset, restore or enrich the company.`;
    return { scenario: preview, checks, passed: checks.every((check) => check.passed), agentPrompt: prompt };
  }
  reset() {
    this.assertIdle();
    this.db.transaction(() => this.db.clear());
    return { reset: true };
  }
  private planJobs() {
    for (const e of this.db
      .all()
      .filter((e) => ["document", "message", "ticket"].includes(e.type)))
      this.db.sql.prepare("INSERT OR IGNORE INTO jobs VALUES(?,?,?)").run(
        e.id,
        "pending",
        JSON.stringify({
          entityId: e.id,
          type: e.type,
          timestamp: e.timestamp ?? e.createdAt,
          promptVersion: "1",
          targetSchemaVersion: 1,
        }),
      );
  }
  cancel() {
    const p = this.status();
    if (["running", "cancel_requested"].includes(p.state))
      this.db.setMeta("progress", { ...p, state: "cancel_requested" });
    return this.status();
  }
  async enrich(input: unknown) {
    this.assertIdle();
    this.company();
    const options = enrichmentSchema.parse(input);
    this.db.setMeta("enrichment", options);
    this.planJobs();
    if (options.force)
      this.db.sql.prepare("UPDATE jobs SET state='pending'").run();
    const task = this.runJobs(options);
    this.running = task;
    try {
      await task;
    } finally {
      this.running = undefined;
    }
    return this.status();
  }
  async resume(input?: unknown) {
    if (!this.db.all("company").length)
      return this.start(this.db.meta("pendingConfig"));
    return this.enrich(input ?? this.db.meta("enrichment"));
  }
  private async runJobs(options: Enrichment) {
    const jobs = this.db.sql
      .prepare("SELECT * FROM jobs WHERE state!='completed' ORDER BY id")
      .all()
      .filter(
        (j) =>
          !options.only ||
          options.only.includes(JSON.parse(String(j.data)).type),
      );
    let spent = this.status().reservedCostUsd ?? 0;
    this.db.setMeta("progress", {
      state: "running",
      stage: "Enriching content",
      completed: 0,
      total: jobs.length,
      reservedCostUsd: spent,
    });
    for (const j of jobs) {
      if (this.status().state === "cancel_requested") {
        this.db.setMeta("progress", { ...this.status(), state: "cancelled" });
        return;
      }
      if (spent + options.costPerJobUsd > options.maxCostUsd) {
        this.db.setMeta("progress", {
          ...this.status(),
          state: "budget_exceeded",
          error:
            "Approximate per-job budget reservation exceeds the remaining budget. Increase budget to resume.",
        });
        return;
      }
      spent += options.costPerJobUsd;
      this.db.transaction(() => {
        this.db.sql
          .prepare("UPDATE jobs SET state='running' WHERE id=?")
          .run(String(j.id));
        this.db.setMeta("progress", {
          ...this.status(),
          reservedCostUsd: spent,
        });
      });
      try {
        const e = this.db.get(String(j.id))!;
        const author = e.authorPersonId ?? e.senderPersonId;
        const context = author
          ? this.at(author, e.timestamp ?? e.createdAt)
          : {};
        const prompt =
          'All identities are fictional. Use only the supplied identities and historical roles. Do not invent IDs or change references. Return only a JSON object {"body":"prose"}, at most 2000 characters, no hidden reasoning. Context: ' +
          JSON.stringify({ entity: e, context });
        const raw = await this.providers
          .get(options.provider)
          .generate(prompt, options.model);
        const result = z
          .object({ body: z.string().min(1).max(10000) })
          .strict()
          .parse(JSON.parse(raw));
        const body = this.providers.redact(result.body);
        this.db.transaction(() => {
          this.db.put({
            ...e,
            ...(e.type === "ticket" ? { description: body } : { body }),
            metadata: {
              ...e.metadata,
              provider: options.provider,
              model: options.model,
              promptVersion: "1",
              contentJobId: j.id,
            },
          });
          this.db.sql
            .prepare("UPDATE jobs SET state='completed' WHERE id=?")
            .run(String(j.id));
          this.db.setMeta("progress", {
            ...this.status(),
            completed: this.status().completed + 1,
          });
        });
      } catch (e) {
        const error = providerError(e);
        this.db.sql
          .prepare("UPDATE jobs SET state='failed' WHERE id=?")
          .run(String(j.id));
        this.db.setMeta("progress", {
          ...this.status(),
          state: "failed",
          error: error.message,
        });
        return;
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    this.db.setMeta("progress", {
      ...this.status(),
      state: "completed",
      stage: "Enrichment complete",
    });
  }
}
