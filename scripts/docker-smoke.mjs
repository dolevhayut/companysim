import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const tag = "companysim:local",
  name = "companysim-smoke-" + process.pid,
  volume = name + "-data";
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let base;
async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base + "/health");
      if (r.ok) return;
    } catch {}
    await delay(500);
  }
  throw Error("Container did not become ready");
}
try {
  docker("build", "-f", "docker/Dockerfile", "-t", tag, ".");
  docker(
    "run",
    "-d",
    "--name",
    name,
    "-p",
    "127.0.0.1::4545",
    "-v",
    volume + ":/data",
    tag,
  );
  const port = docker("port", name, "4545/tcp").split(":").at(-1);
  base = "http://127.0.0.1:" + port;
  await ready();
  assert.match(await (await fetch(base)).text(), /CompanySim/);
  const create = await fetch(base + "/api/control/generation/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Docker Acceptance",
      employees: 100,
      seed: 42,
    }),
  });
  assert.equal(create.status, 202);
  let state;
  for (let i = 0; i < 100; i++) {
    state = await (await fetch(base + "/api/control/generation/status")).json();
    if (state.state === "completed") break;
    await delay(100);
  }
  assert.equal(state.state, "completed");
  const before = await (await fetch(base + "/api/v1/people?limit=200")).json();
  assert.equal(before.items.length, 100);
  const cli = (...args) =>
    docker(
      "exec",
      name,
      "node",
      "dist/packages/cli/src/index.js",
      ...args,
      "--data-dir",
      "/data",
      "--json",
    );
  assert.equal(
    JSON.parse(cli("branch", "create", "docker-agent")).name,
    "docker-agent",
  );
  assert.equal(
    JSON.parse(cli("status", "--branch", "docker-agent")).counts.person,
    100,
  );
  assert.equal(
    JSON.parse(cli("branch", "delete", "docker-agent", "--yes")).deleted,
    true,
  );
  const client = new Client({ name: "docker-smoke", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(base + "/mcp")),
  );
  assert.equal(
    (await client.callTool({ name: "get_company", arguments: {} })).isError,
    undefined,
  );
  await client.close();
  docker("restart", name);
  base =
    "http://127.0.0.1:" + docker("port", name, "4545/tcp").split(":").at(-1);
  await ready();
  assert.deepEqual(
    await (await fetch(base + "/api/v1/people?limit=200")).json(),
    before,
  );
  for (let i = 0; i < 20; i++) {
    if (
      docker("inspect", "--format", "{{.State.Health.Status}}", name) ===
      "healthy"
    )
      break;
    await delay(500);
  }
  assert.equal(
    docker("inspect", "--format", "{{.State.Health.Status}}", name),
    "healthy",
  );
  const uid = docker("exec", name, "id", "-u");
  assert.notEqual(uid, "0");
  console.log(
    "PASS: Docker UI, healthy non-root runtime, volume writes, isolated branch, 100 people, MCP HTTP and restart persistence.",
  );
} catch (error) {
  try {
    console.error(docker("logs", name));
  } catch {}
  throw error;
} finally {
  try {
    docker("rm", "-f", name);
  } catch {}
  try {
    docker("volume", "rm", volume);
  } catch {}
}
