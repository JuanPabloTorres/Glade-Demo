import { expect, test } from "@playwright/test";

test.use({ locale: "es-PR" });

const ORPHAN_CASE_ID = "case-2c7c3a36-8ba4-4fc2-8036-bd9dfb504262";

test("the attorney queue never opens a browser-only case", async ({ page, request }) => {
  const apiBase = process.env.E2E_API_PORT
    ? `http://127.0.0.1:${process.env.E2E_API_PORT}`
    : "http://127.0.0.1:8000";
  const login = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email: "attorney@freshstart.demo", password: "Counsel!2026" },
  });
  expect(login.status()).toBe(200);
  const token = (await login.json()) as { access_token: string };
  const reset = await request.post(`${apiBase}/api/v1/admin/demo/reset`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  expect(reset.status()).toBe(200);

  await page.goto("/login");
  const initialPortfolioResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/bankruptcy/portfolio"),
  );
  await page.getByRole("button", { name: "Entrar como abogado" }).click();
  const portfolioResponse = await initialPortfolioResponse;
  expect(portfolioResponse.status()).toBe(200);
  const portfolio = (await portfolioResponse.json()) as Array<{ case_id: string }>;
  expect(portfolio.map((entry) => entry.case_id)).toContain("case-miguel-demo");
  await expect(
    page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." }),
  ).toBeVisible();
  await expect(page.getByRole("table").getByText("Miguel Santos")).toBeVisible();

  await page.evaluate((orphanCaseId) => {
    const storageKey = "freshstart-bankruptcy-workspace-v3";
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) throw new Error("Expected the demo workspace to be persisted after login.");
    const workspace = JSON.parse(raw) as { cases: Array<Record<string, unknown>> };
    const template = workspace.cases[0];
    if (!template) throw new Error("Expected at least one seeded case.");
    workspace.cases.unshift({
      ...template,
      id: orphanCaseId,
      ownerUserId: "client-demo",
      clientName: "Lic. Andrea Morales",
      clientEmail: "attorney@freshstart.demo",
      status: "draft",
      incomes: [],
      expenses: [],
      debts: [],
      assets: [],
      evidence: [],
    });
    window.localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, ORPHAN_CASE_ID);

  await page.reload();
  await expect(page.getByRole("table").getByText("Miguel Santos")).toBeVisible();
  await expect(page.locator(`a[href^="/case/${ORPHAN_CASE_ID}"]`)).toHaveCount(0);
  await expect(page.getByText("attorney@freshstart.demo")).toHaveCount(0);

  const analysisResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/bankruptcy/analyze"),
  );
  await page.getByRole("table").getByRole("link", { name: "Abrir" }).first().click();
  expect((await analysisResponse).status()).toBe(200);
  await expect(page.getByText("Could not refresh the financial analysis.")).toHaveCount(0);
});
