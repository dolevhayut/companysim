import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
test("B W M: first-run, dashboard, employee, developer endpoints and snapshot restoration", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Company basics" }),
  ).toBeVisible();
  await page.getByLabel("Company name", { exact: true }).fill("UI Acceptance");
  await page.getByLabel("Employees", { exact: true }).fill("100");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("combobox", { name: "AI provider", exact: true })
    .selectOption("openai");
  const picker = page.getByRole("button", { name: /^AI model/ });
  await picker.click();
  const modelSearch = page.getByRole("searchbox", { name: "Search models" });
  await expect(modelSearch).toBeFocused();
  await modelSearch.fill("GPT-5.4-NANO");
  await expect(
    page.getByRole("menuitemradio", { name: /GPT 5.4 mini/ }),
  ).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("5.4 nano");
  await page.route("**/api/control/providers/openai/models", (route) =>
    route.fulfill({
      json: { models: [{ id: "gpt-5.6-luna", name: "GPT 5.6 Luna" }] },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh models", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("1 curated text models");
  await expect(picker).toContainText("gpt-5.4-nano");
  await picker.click();
  await expect(
    page.getByRole("menuitemradio", { name: /GPT 5.6 Luna/ }),
  ).toBeVisible();
  await modelSearch.fill("missing-model");
  await expect(page.getByText(/No models match/)).toBeVisible();
  await expect(
    page.getByRole("menuitemradio", { name: /Custom model/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear model search" }).click();
  await expect(modelSearch).toBeFocused();
  await modelSearch.fill("luna");
  await expect(
    page.getByRole("menuitemradio", { name: /GPT 5.6 Luna/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeFocused();
  await picker.click();
  await expect(modelSearch).toHaveValue("");
  await page.keyboard.press("Escape");
  await page.route("**/api/control/providers/openai/models", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "Provider rejected credentials." } },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh models", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Provider rejected credentials",
  );
  await page
    .getByRole("combobox", { name: "AI provider", exact: true })
    .selectOption("anthropic");
  await expect(picker).toContainText("Choose a model");
  await picker.click();
  await expect(page.getByRole("menuitemradio", { name: /GPT/ })).toHaveCount(0);
  await page.getByRole("menuitemradio", { name: /Custom model/ }).click();
  await page.getByLabel("Model ID", { exact: true }).fill("my-custom-model");
  await expect(picker).toContainText("my-custom-model");
  await page
    .getByRole("combobox", { name: "AI provider", exact: true })
    .selectOption("none");
  await expect(picker).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create Company", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "UI Acceptance", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Employees 100 Explore/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.locator("button.row").first().click();
  await expect(
    page.getByRole("dialog", { name: "Entity detail" }),
  ).toContainText("currentRoleId");
  await page.getByRole("button", { name: "Close detail" }).click();
  await page.getByRole("button", { name: "Developer", exact: true }).click();
  await expect(
    page.getByText("http://127.0.0.1:4587/api/v1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open interactive API docs ↗" }),
  ).toHaveAttribute("href", "/docs");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copy agent setup prompt", exact: true })
    .click();
  const copiedPrompt = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(copiedPrompt).toContain("http://127.0.0.1:4587/mcp");
  expect(copiedPrompt).toContain("get_company_stats");
  expect(copiedPrompt).not.toContain("{{BASE_URL}}");
  const skillDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download agent skill", exact: true })
    .click();
  const skillFile = await skillDownload;
  expect(skillFile.suggestedFilename()).toBe("SKILL.md");
  expect(await readFile((await skillFile.path())!, "utf8")).toContain(
    "name: companysim",
  );
  await page.getByRole("button", { name: "Snapshots", exact: true }).click();
  await page
    .getByRole("button", { name: "Create snapshot", exact: true })
    .click();
  await expect(
    page.getByText("Snapshot created.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Restore snapshot?",
  });
  await expect(
    confirmation.getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).not.toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await confirmation
    .getByRole("button", { name: "Restore snapshot", exact: true })
    .click();
  await expect(
    page.getByText("Snapshot restored.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Find anything in your company")).toBeVisible();
  await page.getByLabel("Search company").fill("zzzznonexistentzzzz");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await expect(
    page.getByText("No results found", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Provider credentials")).toContainText(
    "Not configured",
  );
  await page.getByLabel("Optional runtime token").fill("local-export-test");
  await page.getByRole("heading", { name: "Data controls" }).click();
  let exportAuthorization = "";
  await page.route("**/api/control/export", (route) => {
    exportAuthorization = route.request().headers()["authorization"];
    return route.continue();
  });
  const exportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CompanySim JSON" }).click();
  const exportFile = await exportDownload;
  const exported = JSON.parse(
    await readFile((await exportFile.path())!, "utf8"),
  );
  expect(exportAuthorization).toBe("Bearer local-export-test");
  expect(exported.formatVersion).toBe(1);
  expect(
    exported.entities.filter(
      (entity: { type: string }) => entity.type === "person",
    ),
  ).toHaveLength(100);
});
