import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "companysim-e2e-"));
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4587", trace: "retain-on-failure" },
  webServer: {
    command: `node dist/packages/cli/src/index.js serve --port 4587 --data-dir ${dir}`,
    url: "http://127.0.0.1:4587/health",
    reuseExistingServer: false,
  },
});
