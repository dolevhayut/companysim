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
} from "../../schema/src/index.js";
import type { Services } from "../../core/src/index.js";
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
  const get = (path: string, handler: Handler) => {
    app.get(path, handler);
    paths[path.replace(/:([a-zA-Z]+)/g, "{$1}")] = {
      get: {
        summary: path,
        parameters: [...path.matchAll(/:([a-zA-Z]+)/g)].map((m) => ({
          name: m[1],
          in: "path",
          required: true,
          schema: { type: "string" },
        })),
        responses: {
          200: {
            description: "Successful response",
            content: { "application/json": { schema: { type: "object" } } },
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
  get("/api/v1/company", (c) => c.json(s.company()));
  get("/api/v1/stats", (c) => c.json(s.stats()));
  for (const [route, type] of Object.entries(routes)) {
    get("/api/v1/" + route, (c) =>
      c.json(
        s.list(type, {
          ...c.req.query(),
          ...(c.req.header("X-CompanySim-Actor")
            ? { actorId: c.req.header("X-CompanySim-Actor") }
            : {}),
        }),
      ),
    );
    get("/api/v1/" + route + "/:id", (c) =>
      c.json(
        s.get(type, c.req.param("id")!, c.req.header("X-CompanySim-Actor")),
      ),
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
      get(`/api/v1/${route}/:id/${target}`, (c) =>
        c.json(
          s.related(
            routes[route],
            c.req.param("id")!,
            target === "members" ? "person" : routes[target],
            c.req.header("X-CompanySim-Actor"),
          ),
        ),
      );
  app.post("/api/v1/search", async (c) => {
    const body = await c.req.json();
    const actor = c.req.header("X-CompanySim-Actor");
    if (actor && body.actorId && body.actorId !== actor)
      throw new AppError("VALIDATION", "Actor header and body must match.");
    return c.json(s.search({ ...body, ...(actor ? { actorId: actor } : {}) }));
  });
  paths["/api/v1/search"] = {
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
  app.get("/openapi.json", (c) =>
    c.json({
      openapi: "3.1.0",
      info: { title: "CompanySim", version: VERSION },
      paths,
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
