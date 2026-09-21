import { Hono, type Handler } from "hono";
import { isIP } from "node:net";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
  AppError,
  routes,
  safeError,
  VERSION,
  enrichmentSchema,
  types,
  type EntityType,
} from "../../schema/src/index.js";
import type { Services } from "../../core/src/index.js";

const entityProperties: Record<string, unknown> = {
  id: { type: "string" },
  type: { type: "string" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
  name: { type: "string" },
  title: { type: "string" },
  body: { type: "string" },
  description: { type: "string" },
  firstName: { type: "string" },
  lastName: { type: "string" },
  displayName: { type: "string" },
  email: { type: "string", format: "email" },
  industry: { type: "string", examples: ["saas"] },
  foundedDate: { type: "string", format: "date-time" },
  websiteDomain: { type: "string" },
  defaultTimezone: { type: "string" },
  employeeCountTarget: { type: "integer" },
  companySizeProfile: { type: "string" },
  country: { type: "string" },
  city: { type: "string" },
  timezone: { type: "string" },
  kind: { type: "string" },
  code: { type: "string" },
  level: { type: "number" },
  jobFamily: { type: "string" },
  isManager: { type: "boolean" },
  memberCount: { type: "integer" },
  status: { type: "string" },
  employmentType: { type: "string" },
  locale: { type: "string" },
  priority: { type: "string" },
  health: { type: "number", minimum: 0, maximum: 100 },
  annualValue: { type: "number" },
  currency: { type: "string" },
  startDate: { type: "string", format: "date-time" },
  endDate: { type: "string", format: "date-time" },
  targetDate: { type: "string", format: "date-time" },
  renewalDate: { type: "string", format: "date-time" },
  timestamp: { type: "string", format: "date-time" },
  startedAt: { type: "string", format: "date-time" },
  completedAt: { type: "string", format: "date-time" },
  resolvedAt: { type: "string", format: "date-time" },
  effectiveFrom: { type: "string", format: "date-time" },
  effectiveTo: { type: "string", format: "date-time" },
  category: { type: "string" },
  vendor: { type: "string" },
  mimeType: { type: "string" },
  subject: { type: "string" },
  occurredAt: { type: "string", format: "date-time" },
  eventType: { type: "string" },
  visibility: { type: "string" },
  access: { type: "string", enum: ["view", "edit", "admin"] },
  sourceType: { type: "string", enum: types },
  targetType: { type: "string", enum: types },
  subjectType: { type: "string", enum: types },
  resourceType: { type: "string", enum: types },
  actorType: { type: "string", enum: types },
  relationType: { type: "string" },
  validFrom: { type: "string", format: "date-time" },
  validTo: { type: "string", format: "date-time" },
  metadata: { type: "object", additionalProperties: true },
  payload: { type: "object", additionalProperties: true },
};
for (const field of [
  "locationId",
  "headquartersLocationId",
  "departmentId",
  "leaderPersonId",
  "parentDepartmentId",
  "managerPersonId",
  "currentRoleId",
  "currentDepartmentId",
  "currentTeamId",
  "accountOwnerPersonId",
  "customerId",
  "ownerPersonId",
  "projectId",
  "assigneePersonId",
  "reporterPersonId",
  "folderId",
  "authorPersonId",
  "channelId",
  "teamId",
  "conversationId",
  "senderPersonId",
  "requesterPersonId",
  "ownerDepartmentId",
  "ownedByDepartmentId",
  "parentFolderId",
  "replyToMessageId",
  "sourceId",
  "targetId",
  "subjectId",
  "resourceId",
  "actorId",
] as const)
  entityProperties[field] = { type: "string" };
for (const field of [
  "teamIds",
  "participantPersonIds",
  "adminPersonIds",
  "regions",
  "skills",
] as const)
  entityProperties[field] = { type: "array", items: { type: "string" } };

const requiredByType: Partial<Record<EntityType, string[]>> = {
  company: ["name", "industry", "foundedDate", "websiteDomain"],
  location: ["name", "country", "timezone", "kind"],
  department: ["name", "code"],
  team: ["name", "departmentId", "memberCount"],
  role: ["title", "level", "jobFamily", "isManager"],
  person: ["firstName", "lastName", "displayName", "email", "status"],
  customer: ["name", "industry", "status"],
  customerContact: ["customerId", "name", "email"],
  project: ["name", "ownerPersonId", "status", "startDate"],
  task: ["title", "status", "priority"],
  folder: ["name", "visibility"],
  document: ["title", "body", "mimeType", "visibility"],
  channel: ["name", "kind"],
  conversation: ["participantPersonIds", "startedAt"],
  message: ["conversationId", "senderPersonId", "timestamp", "body"],
  ticket: ["title", "description", "status", "priority"],
  policy: ["title", "body", "effectiveFrom", "visibility"],
  tool: ["name", "category", "status"],
  permission: ["subjectType", "subjectId", "resourceType", "resourceId", "access"],
  relationship: [
    "sourceType",
    "sourceId",
    "targetType",
    "targetId",
    "relationType",
  ],
  event: ["eventType", "occurredAt", "payload"],
};
const schemaName = (type: EntityType) => type[0].toUpperCase() + type.slice(1);
const componentSchemas: Record<string, unknown> = {
  Entity: {
    type: "object",
    required: ["id", "type", "createdAt", "updatedAt"],
    properties: entityProperties,
    additionalProperties: false,
  },
  EntityList: {
    type: "object",
    required: ["items", "hasMore", "nextCursor"],
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/Entity" } },
      hasMore: { type: "boolean" },
      nextCursor: { type: ["string", "null"] },
    },
  },
  SimulationMetadata: {
    type: "object",
    required: ["asOf", "generatorVersion"],
    properties: {
      asOf: { type: ["string", "null"], format: "date-time" },
      generatorVersion: { type: "integer" },
    },
  },
  CompanyStats: {
    type: "object",
    properties: {
      simulation: { $ref: "#/components/schemas/SimulationMetadata" },
    },
    additionalProperties: { type: "integer" },
  },
  SearchResult: {
    type: "object",
    required: [
      "entityType",
      "entityId",
      "title",
      "score",
      "relationshipContext",
    ],
    properties: {
      entityType: { type: "string", enum: types },
      entityId: { type: "string" },
      title: { type: "string" },
      snippet: { type: "string" },
      score: { type: "number" },
      relationshipContext: {
        type: "array",
        items: { $ref: "#/components/schemas/Relationship" },
      },
    },
  },
  SearchResponse: {
    type: "object",
    required: ["results", "nextCursor"],
    properties: {
      results: {
        type: "array",
        items: { $ref: "#/components/schemas/SearchResult" },
      },
      nextCursor: { type: ["string", "null"] },
    },
  },
  EntryPoints: {
    type: "object",
    required: [
      "company",
      "simulation",
      "activeProjects",
      "atRiskCustomers",
      "keyPeople",
    ],
    properties: {
      company: { $ref: "#/components/schemas/Company" },
      simulation: { $ref: "#/components/schemas/SimulationMetadata" },
      activeProjects: {
        type: "array",
        items: { $ref: "#/components/schemas/Project" },
      },
      atRiskCustomers: {
        type: "array",
        items: { $ref: "#/components/schemas/Customer" },
      },
      keyPeople: {
        type: "array",
        items: { $ref: "#/components/schemas/Person" },
      },
    },
  },
};
for (const type of types)
  componentSchemas[schemaName(type)] = {
    allOf: [
      { $ref: "#/components/schemas/Entity" },
      {
        type: "object",
        required: requiredByType[type] ?? [],
        properties: { type: { const: type } },
      },
    ],
  };

const listParameters = [
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 200, default: 25 },
  },
  { name: "cursor", in: "query", schema: { type: "string" } },
  { name: "q", in: "query", schema: { type: "string", maxLength: 200 } },
  { name: "actorId", in: "query", schema: { type: "string" } },
];
export function createRest(s: Services, dataApi = true) {
  const app = new Hono();
  const paths: Record<string, unknown> = {};
  if (!dataApi) app.use("/api/v1/*", async (c) => c.notFound());
  app.use("*", bodyLimit({ maxSize: 20 * 1024 * 1024 }));
  app.use("*", async (c, next) => {
    const hostname = new URL(c.req.url).hostname.replace(/^\[|\]$/g, "");
    if (
      hostname !== "localhost" &&
      !isIP(hostname) &&
      !process.env.COMPANYSIM_API_TOKEN
    )
      return c.json(
        {
          error: {
            code: "HOST_DENIED",
            message: "Use a local IP address or localhost.",
          },
        },
        403,
      );
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin)
      return c.json(
        {
          error: {
            code: "ORIGIN_DENIED",
            message: "Cross-origin requests are not allowed.",
          },
        },
        403,
      );
    if (
      process.env.COMPANYSIM_API_TOKEN &&
      c.req.path !== "/health" &&
      c.req.path !== "/" &&
      !c.req.path.startsWith("/assets/") &&
      c.req.header("authorization") !==
        `Bearer ${process.env.COMPANYSIM_API_TOKEN}`
    )
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Local API token required." },
        },
        401,
      );
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
  });
  app.onError((e, c) =>
    c.json(
      { error: safeError(e) },
      e instanceof AppError
        ? (e.status as 400)
        : e instanceof z.ZodError || e instanceof SyntaxError
          ? 400
          : 500,
    ),
  );
  const get = (
    path: string,
    handler: Handler,
    options: { schema?: unknown; parameters?: unknown[] } = {},
  ) => {
    app.get(path, handler);
    paths[path.replace(/:([a-zA-Z]+)/g, "{$1}")] = {
      get: {
        summary: path,
        parameters: [
          ...[...path.matchAll(/:([a-zA-Z]+)/g)].map((m) => ({
            name: m[1],
            in: "path",
            required: true,
            schema: { type: "string" },
          })),
          ...(options.parameters ?? []),
        ],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: options.schema ?? { type: "object" },
              },
            },
          },
        },
      },
    };
  };
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      database: "ready",
      schemaVersion: 1,
      worker: s.running ? "busy" : "ready",
      version: VERSION,
    }),
  );
  get("/api/v1/company", (c) => c.json(s.company()), {
    schema: { $ref: "#/components/schemas/Company" },
  });
  get("/api/v1/stats", (c) => c.json(s.stats()), {
    schema: { $ref: "#/components/schemas/CompanyStats" },
  });
  get(
    "/api/v1/entry-points",
    (c) => c.json(s.entryPoints(c.req.header("X-CompanySim-Actor"))),
    { schema: { $ref: "#/components/schemas/EntryPoints" } },
  );
  for (const [route, type] of Object.entries(routes)) {
    get(
      "/api/v1/" + route,
      (c) =>
        c.json(
          s.list(type, {
            ...c.req.query(),
            ...(c.req.header("X-CompanySim-Actor")
              ? { actorId: c.req.header("X-CompanySim-Actor") }
              : {}),
          }),
        ),
      {
        schema: {
          allOf: [
            { $ref: "#/components/schemas/EntityList" },
            {
              properties: {
                items: {
                  type: "array",
                  items: { $ref: `#/components/schemas/${schemaName(type)}` },
                },
              },
            },
          ],
        },
        parameters: listParameters,
      },
    );
    get(
      "/api/v1/" + route + "/:id",
      (c) =>
        c.json(
          s.get(type, c.req.param("id")!, c.req.header("X-CompanySim-Actor")),
        ),
      { schema: { $ref: `#/components/schemas/${schemaName(type)}` } },
    );
  }
  const relations = {
    people: ["relationships", "projects", "documents", "messages"],
    teams: ["members"],
    customers: ["projects", "tickets"],
    projects: ["people", "documents", "tickets"],
  };
  for (const [route, targets] of Object.entries(relations))
    for (const target of targets)
      get(
        `/api/v1/${route}/:id/${target}`,
        (c) =>
          c.json(
            s.related(
              routes[route],
              c.req.param("id")!,
              target === "members" ? "person" : routes[target],
              c.req.header("X-CompanySim-Actor"),
            ),
          ),
        {
          schema: {
            allOf: [
              { $ref: "#/components/schemas/EntityList" },
              {
                properties: {
                  items: {
                    type: "array",
                    items: {
                      $ref: `#/components/schemas/${schemaName(
                        target === "members" ? "person" : routes[target],
                      )}`,
                    },
                  },
                },
              },
            ],
          },
        },
      );
  app.get("/api/v1/search", (c) =>
    c.json(
      s.search({
        query: c.req.query("query") ?? c.req.query("q") ?? "",
        limit: Number(c.req.query("limit") ?? 25),
        ...(c.req.query("types")
          ? { types: c.req.query("types")!.split(",") }
          : {}),
        ...(c.req.header("X-CompanySim-Actor")
          ? { actorId: c.req.header("X-CompanySim-Actor") }
          : {}),
      }),
    ),
  );
  app.post("/api/v1/search", async (c) => {
    const body = await c.req.json();
    const actor = c.req.header("X-CompanySim-Actor");
    if (actor && body.actorId && body.actorId !== actor)
      throw new AppError("VALIDATION", "Actor header and body must match.");
    return c.json(s.search({ ...body, ...(actor ? { actorId: actor } : {}) }));
  });
  const searchPath: Record<string, Record<string, unknown>> = {
    post: {
      summary: "Search the company using FTS5 with relationship expansion",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["query"],
              properties: {
                query: { type: "string" },
                limit: { type: "integer", minimum: 1, maximum: 200 },
                actorId: { type: "string" },
                types: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Search results" } },
    },
  };
  paths["/api/v1/search"] = searchPath;
  searchPath.get = {
    summary: "Search the company using query parameters",
    parameters: [
      {
        name: "query",
        in: "query",
        schema: { type: "string" },
      },
      {
        name: "q",
        in: "query",
        schema: { type: "string", description: "Alias for query" },
      },
      {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 200, default: 25 },
      },
      {
        name: "types",
        in: "query",
        schema: { type: "string", description: "Comma-separated entity types" },
      },
    ],
    responses: {
      200: {
        description: "Search results",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SearchResponse" },
          },
        },
      },
    },
  };
  const searchPost = searchPath.post;
  searchPost.responses = {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/SearchResponse" },
        },
      },
    },
  };
  app.get("/openapi.json", (c) =>
    c.json({
      openapi: "3.1.0",
      info: { title: "CompanySim", version: VERSION },
      paths,
      components: { schemas: componentSchemas },
    }),
  );
  app.get("/docs", (c) =>
    c.html(
      `<!doctype html><html><head><title>CompanySim API</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;background:#101820;color:#eee}button,input,select{padding:10px}pre{white-space:pre-wrap}</style></head><body><h1>CompanySim API explorer</h1><p>Live local requests. <a href="/openapi.json">OpenAPI document</a></p><select id="route">${Object.keys(
        paths,
      )
        .filter((p) => !p.includes("{"))
        .map((p) => `<option>${p}</option>`)
        .join(
          "",
        )}</select><input id="query" placeholder="Search query"><button id="run">Run request</button><pre id="result"></pre><script>document.getElementById('run').onclick=async()=>{let p=document.getElementById('route').value;let r=await fetch(p,p.endsWith('/search')?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:document.getElementById('query').value})}:{});document.getElementById('result').textContent=JSON.stringify(await r.json(),null,2)}</script></body></html>`,
    ),
  );
  app.post("/api/control/generation/plan", async (c) =>
    c.json(s.plan(await c.req.json())),
  );
  app.post("/api/control/generation/start", async (c) =>
    c.json(s.start(await c.req.json()), 202),
  );
  app.get("/api/control/generation/status", (c) => c.json(s.status()));
  app.post("/api/control/generation/cancel", (c) => c.json(s.cancel()));
  app.post("/api/control/generation/resume", async (c) => {
    s.assertIdle();
    const body = await c.req.text();
    if (body) enrichmentSchema.parse(JSON.parse(body));
    void s.resume(body ? JSON.parse(body) : undefined).catch(() => {});
    return c.json(s.status(), 202);
  });
  app.post("/api/control/generation/enrich", async (c) => {
    s.assertIdle();
    s.company();
    const body = enrichmentSchema.parse(await c.req.json());
    const task = s.enrich(body);
    void task.catch(() => {});
    return c.json(s.status(), 202);
  });
  app.get("/api/control/snapshots", (c) => c.json(s.snapshots()));
  app.post("/api/control/snapshots", async (c) =>
    c.json(
      s.snapshot(z.object({ name: z.string() }).parse(await c.req.json()).name),
    ),
  );
  app.post("/api/control/snapshots/:id/restore", (c) =>
    c.json(s.restore(c.req.param("id"))),
  );
  app.delete("/api/control/snapshots/:id", (c) =>
    c.json(s.deleteSnapshot(c.req.param("id"))),
  );
  app.post("/api/control/reset", (c) => c.json(s.reset()));
  app.get("/api/control/export", (c) => c.json(s.export()));
  app.post("/api/control/import", async (c) =>
    c.json(s.import(await c.req.json())),
  );
  app.get("/api/control/validation", (c) => c.json(s.validate()));
  app.get("/api/control/scenarios", (c) => c.json(s.scenarios()));
  app.get("/api/control/scenarios/:id/preview", (c) =>
    c.json(s.scenarioPreview(c.req.param("id"))),
  );
  app.post("/api/control/scenarios/:id/apply", (c) =>
    c.json(s.applyScenario(c.req.param("id"))),
  );
  app.post("/api/control/scenarios/:id/evaluate", (c) =>
    c.json(s.evaluateScenario(c.req.param("id"))),
  );
  app.get("/api/control/providers", (c) => c.json(s.providers.status()));
  const provider = z.enum(["openai", "anthropic"]);
  app.get("/api/control/providers/:provider/models", async (c) =>
    c.json({
      models: await s.providers.models(provider.parse(c.req.param("provider"))),
    }),
  );
  app.post("/api/control/providers/test", async (c) =>
    c.json(
      await s.providers.test(provider.parse((await c.req.json()).provider)),
    ),
  );
  app.post("/api/control/providers/session-key", async (c) => {
    const data = z
      .object({ provider, key: z.string().min(1).max(1000) })
      .strict()
      .parse(await c.req.json());
    s.providers.set(data.provider, data.key);
    return c.json({ configured: true });
  });
  app.delete("/api/control/providers/session-key/:provider", (c) => {
    s.providers.remove(provider.parse(c.req.param("provider")));
    return c.json({ removed: true });
  });
  return app;
}
