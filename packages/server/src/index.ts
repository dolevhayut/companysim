import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../database/src/index.js";
import { Services } from "../../core/src/index.js";
import { createRest } from "../../rest/src/index.js";
import { createMcp } from "../../mcp/src/index.js";
import { AppError } from "../../schema/src/index.js";
function processIdentity(pid: number) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return (
      readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim() +
      ":" +
      stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19]
    );
  } catch {
    return undefined;
  }
}
export function lock(dir: string) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, "runtime.lock");
  const owner = { pid: process.pid, identity: processIdentity(process.pid) };
  if (existsSync(path)) {
    const raw = JSON.parse(readFileSync(path, "utf8")) as
      number | { pid: number; identity?: string };
    const prior = typeof raw === "number" ? { pid: raw } : raw;
    let alive = true;
    try {
      process.kill(prior.pid, 0);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ESRCH") alive = false;
    }
    if (prior.identity && processIdentity(prior.pid) !== prior.identity)
      alive = false;
    if (alive)
      throw new AppError(
        "CONFLICT",
        "Another CompanySim writer holds this data directory.",
        409,
      );
    unlinkSync(path);
  }
  const content = JSON.stringify(owner);
  writeFileSync(path, content, { flag: "wx", mode: 0o600 });
  return () => {
    try {
      if (readFileSync(path, "utf8") === content) unlinkSync(path);
    } catch {
      /* already released */
    }
  };
}
export async function startServer(options: {
  dataDir: string;
  port?: number;
  host?: string;
  ui?: boolean;
  rest?: boolean;
  mcp?: boolean;
}) {
  const release = lock(options.dataDir);
  let db: Database;
  try {
    db = new Database(options.dataDir);
  } catch (e) {
    release();
    throw e;
  }
  const services = new Services(db, undefined, true);
  const app = createRest(services, options.rest !== false);
  if (options.mcp !== false)
    app.all("/mcp", async (c) => {
      const server = createMcp(services);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      try {
        return await transport.handleRequest(c.req.raw);
      } finally {
        await server.close();
      }
    });
  if (options.ui !== false) {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const root = resolve(
      here,
      here.includes("/dist/")
        ? "../../../../apps/web/dist"
        : "../../../apps/web/dist",
    );
    app.use("/assets/*", serveStatic({ root }));
    app.get("/", serveStatic({ path: join(root, "index.html") }));
  }
  const host = options.host ?? "127.0.0.1";
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    process.stderr.write(
      "Warning: CompanySim is listening beyond loopback. Use a local API token and restrict network access.\n",
    );
  const server = serve({
    fetch: app.fetch,
    hostname: host,
    port: options.port ?? 4545,
  });
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  }).catch((e) => {
    db.close();
    release();
    throw e;
  });
  const close = async () => {
    services.cancel();
    await services.running;
    await new Promise<void>((resolve, reject) => {
      server.close((e) => (e ? reject(e) : resolve()));
      if ("closeAllConnections" in server) server.closeAllConnections();
    });
    db.close();
    release();
  };
  return { server, services, close };
}
