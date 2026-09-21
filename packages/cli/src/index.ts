#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  accessSync,
  constants,
  statfsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { createServer } from "node:net";
import { createInterface } from "node:readline/promises";
import { parse, stringify } from "yaml";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { backup, DatabaseSync } from "node:sqlite";
import { Database } from "../../database/src/index.js";
import { Services } from "../../core/src/index.js";
import { startServer, lock } from "../../server/src/index.js";
import { createMcp } from "../../mcp/src/index.js";
import {
  configSchema,
  entityType,
  safeError,
  AppError,
  VERSION,
} from "../../schema/src/index.js";
const stringFlags = [
  "config",
  "data-dir",
  "industry",
  "employees",
  "history",
  "seed",
  "mode",
  "density",
  "host",
  "port",
  "provider",
  "model",
  "max-cost",
  "cost-per-job",
  "only",
  "type",
  "limit",
  "output",
  "format",
  "snapshot",
];
const boolFlags = [
  "yes",
  "json",
  "force",
  "resume",
  "no-ui",
  "no-rest",
  "no-mcp",
  "open",
  "help",
  "version",
];
async function main() {
  const { values: parsed, positionals: p } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries([
      ...stringFlags.map((k) => [k, { type: "string" as const }]),
      ...boolFlags.map((k) => [k, { type: "boolean" as const }]),
    ]),
  });
  const v = parsed as Record<string, string | boolean | undefined>;
  const command = p[0];
  const text = (key: string) =>
    typeof v[key] === "string" ? (v[key] as string) : undefined;
  const out = (value: unknown) =>
    process.stdout.write(
      (v.json
        ? JSON.stringify(value)
        : typeof value === "string"
          ? value
          : JSON.stringify(value, null, 2)) + "\n",
    );
  if (v.version) {
    out(VERSION);
    return;
  }
  if (v.help || !command) {
    out(
      "CompanySim — Spin up an entire company on your machine.\nCommands: init, create, generate, serve, status, inspect, search, snapshot, restore, reset, provider, doctor, export, import, mcp\nUse --data-dir PATH, --json, --yes for automation. Native server defaults to 127.0.0.1:4545.\nEnrichment requires --provider, --model, --max-cost and --cost-per-job (approximate budget reservation).",
    );
    return;
  }
  const file =
    text("config") ??
    (existsSync("companysim.yaml") ? "companysim.yaml" : undefined);
  const raw = file
    ? (parse(readFileSync(file, "utf8")) as Record<
        string,
        Record<string, unknown>
      >)
    : {};
  const dir = resolve(
    text("data-dir") ??
      process.env.COMPANYSIM_DATA_DIR ??
      String(
        raw.runtime?.dataDir ??
          join(homedir(), ".local", "share", "companysim"),
      ),
  );
  const host = text("host") ?? String(raw.runtime?.host ?? "127.0.0.1"),
    port = Number(text("port") ?? raw.runtime?.port ?? 4545);
  const confirm = async (message: string) => {
    if (v.yes) return;
    if (!process.stdin.isTTY)
      throw new AppError(
        "VALIDATION",
        "Use --yes to confirm this destructive operation in headless mode.",
      );
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    const answer = await rl.question(message + " [y/N] ");
    rl.close();
    if (answer.toLowerCase() !== "y")
      throw new AppError("CANCELLED", "Cancelled.");
  };
  if (command === "init") {
    let name = "Acme";
    if (!v.yes && process.stdin.isTTY) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stderr,
      });
      name = (await rl.question("Company name [Acme]: ")) || name;
      rl.close();
    }
    const config = {
      version: 1,
      company: { name, industry: "saas", employees: 100, historyYears: 5 },
      generation: { mode: "lite", seed: 42, density: "low" },
      runtime: { host: "127.0.0.1", port: 4545, dataDir: "./company-data" },
    };
    const path = text("output") ?? "companysim.yaml";
    writeFileSync(
      path,
      text("format") === "json"
        ? JSON.stringify(config, null, 2)
        : stringify(config),
      { flag: v.force ? "w" : "wx", mode: 0o600 },
    );
    out({ created: path });
    return;
  }
  if (command === "serve") {
    const runtime = await startServer({
      dataDir: dir,
      host,
      port,
      ui: !v["no-ui"],
      rest: !v["no-rest"],
      mcp: !v["no-mcp"],
    });
    process.stderr.write(`CompanySim http://${host}:${port}\n`);
    let closing = false;
    for (const signal of ["SIGTERM", "SIGINT"] as const)
      process.on(signal, () => {
        if (!closing) {
          closing = true;
          void runtime.close().then(() => process.exit(0));
        }
      });
    if (v.open) {
      const { spawn } = await import("node:child_process");
      spawn(
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "explorer"
            : "xdg-open",
        [`http://${host}:${port}`],
        { stdio: "ignore" },
      ).on("error", () => {});
    }
    return;
  }
  if (command === "doctor") {
    let writable = true;
    try {
      accessSync(existsSync(dir) ? dir : resolve(dir, ".."), constants.W_OK);
    } catch {
      writable = false;
    }
    const free = existsSync(dir)
      ? Number(statfsSync(dir).bavail) * Number(statfsSync(dir).bsize)
      : null;
    const portAvailable = await new Promise<boolean>((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen(port, host, () => server.close(() => resolve(true)));
    });
    const report = {
      databasePresent: existsSync(join(dir, "company.db")),
      dataDirectoryWritable: writable,
      portAvailable,
      freeBytes: free,
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      },
      dataDir: dir,
    };
    out(report);
    if (!report.databasePresent || !writable || !portAvailable)
      process.exitCode = 1;
    return;
  }
  const writer = [
    "create",
    "generate",
    "snapshot",
    "restore",
    "reset",
    "import",
  ].includes(command);
  const release = writer ? lock(dir) : () => {};
  const db = new Database(dir);
  const s = new Services(db, undefined, writer);
  let persistent = false;
  try {
    switch (command) {
      case "create": {
        const base = { ...raw.company, ...raw.generation };
        delete base.maxCostUsd;
        const config = configSchema.parse({
          ...base,
          ...(p[1] ? { name: p[1] } : {}),
          ...Object.fromEntries(
            ["industry", "employees", "seed", "mode", "density"]
              .filter((k) => text(k) !== undefined)
              .map((k) => [k, text(k)]),
          ),
          ...(text("history")
            ? { historyYears: Number(text("history")!.replace(/y$/, "")) }
            : {}),
        });
        if (v.force) await confirm("Replace existing company?");
        out(s.create(config, !!v.force));
        break;
      }
      case "status":
        out({
          company: s.company(),
          counts: s.stats(),
          generation: s.status(),
          providers: s.providers.status(),
          endpoints: {
            rest: `http://${host}:${port}/api/v1`,
            mcp: `http://${host}:${port}/mcp`,
          },
        });
        break;
      case "inspect":
        out(s.get(entityType.parse(p[1]), p[2] ?? ""));
        break;
      case "search":
        out(
          s.search({
            query: p.slice(1).join(" "),
            types: text("type")?.split(","),
            limit: Number(text("limit") ?? 25),
          }),
        );
        break;
      case "snapshot": {
        const action = p[1] ?? "list",
          name = p[2] ?? "baseline";
        if (action === "create") out(s.snapshot(name));
        else if (action === "list") out(s.snapshots());
        else if (action === "restore") {
          await confirm("Restore snapshot and replace company?");
          out(s.restore(name));
        } else if (action === "delete") {
          await confirm("Delete snapshot?");
          out(s.deleteSnapshot(name));
        } else throw new AppError("VALIDATION", "Unknown snapshot command.");
        break;
      }
      case "restore":
        await confirm("Restore snapshot and replace company?");
        out(s.restore(p[1] ?? "baseline"));
        break;
      case "reset":
        await confirm("Reset company state?");
        out(text("snapshot") ? s.restore(text("snapshot")!) : s.reset());
        break;
      case "provider":
        if (p[1] === "test")
          out(
            await s.providers.test(
              p[2] === "anthropic" ? "anthropic" : "openai",
            ),
          );
        else out(s.providers.status());
        break;
      case "generate": {
        process.stderr.write(
          "Enrichment sends selected company content to your model provider. Cost reservations are approximate.\n",
        );
        const options = text("provider")
          ? {
              provider: text("provider"),
              model: text("model"),
              maxCostUsd: Number(text("max-cost")),
              costPerJobUsd: Number(text("cost-per-job")),
              only: text("only")
                ?.split(",")
                .map((t) => t.replace(/s$/, "")),
              force: !!v.force,
            }
          : undefined;
        out(v.resume ? await s.resume(options) : await s.enrich(options));
        if (s.status().state !== "completed") process.exitCode = 7;
        break;
      }
      case "export": {
        const format = text("format") ?? "json",
          path = text("output") ?? "company-export." + format;
        if (existsSync(path) && !v.force)
          throw new AppError(
            "CONFLICT",
            "Export file exists. Use --force to replace.",
            409,
          );
        if (format === "sqlite") await backup(db.sql, path);
        else if (format === "json")
          writeFileSync(path, JSON.stringify(s.export()), { mode: 0o600 });
        else if (format === "jsonl")
          writeFileSync(
            path,
            db
              .all()
              .map((e) => JSON.stringify(e))
              .join("\n"),
            { mode: 0o600 },
          );
        else if (format === "csv")
          writeFileSync(
            path,
            "id,type,data\n" +
              db
                .all()
                .map((e) =>
                  [e.id, e.type, JSON.stringify(e)]
                    .map((x) => '"' + x.replaceAll('"', '""') + '"')
                    .join(","),
                )
                .join("\n"),
            { mode: 0o600 },
          );
        else throw new AppError("VALIDATION", "Unsupported export format.");
        out({ exported: path, format });
        break;
      }
      case "import":
        await confirm("Import and replace company state?");
        if (p[1]?.endsWith(".sqlite")) {
          const imported = new DatabaseSync(p[1], { readOnly: true });
          try {
            out(
              s.import({
                formatVersion: 1,
                generatorVersion: 1,
                config: JSON.parse(
                  String(
                    imported
                      .prepare("SELECT value FROM metadata WHERE key='config'")
                      .get()?.value,
                  ),
                ),
                entities: imported
                  .prepare("SELECT data FROM entities")
                  .all()
                  .map((r) => JSON.parse(String(r.data))),
              }),
            );
          } finally {
            imported.close();
          }
        } else out(s.import(JSON.parse(readFileSync(p[1] ?? "", "utf8"))));
        break;
      case "mcp": {
        const server = createMcp(s);
        await server.connect(new StdioServerTransport());
        persistent = true;
        process.stdin.on("end", () => {
          void server.close().finally(() => {
            db.close();
            process.exit(0);
          });
        });
        break;
      }
      default:
        throw new AppError("VALIDATION", "Unknown command. Use --help.");
    }
  } finally {
    if (!persistent) {
      db.close();
      release();
    }
  }
}
main().catch((e) => {
  process.stderr.write(JSON.stringify({ error: safeError(e) }) + "\n");
  process.exitCode =
    e instanceof AppError && e.code === "NOT_INITIALIZED" ? 3 : 2;
});
