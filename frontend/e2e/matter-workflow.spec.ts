import { expect, test } from "@playwright/test";

test("client completes the full 10-step preparation flow (master instruction §20)", async ({ page }) => {
  // 1. Login.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();

  // 2. Abrir caso.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Elena Rivera" })).toBeVisible();
  await expect(page.getByTestId("completion-score")).toBeVisible();

  // 3. Ver chat (persistent global panel, Block 7 — not a workspace tab).
  await page.getByRole("button", { name: "Abrir asistente de preparación" }).click();
  await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeVisible();

  // 4. Preguntar qué falta.
  await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("La plantilla financiera está completa.", { exact: false })).toBeVisible();

  // 5. Abrir sección recomendada — this also closes the chat panel.
  await page.getByRole("button", { name: "Abrir sección recomendada" }).click();
  // CaseStageStepper is the single stage-navigation control (no more
  // Tabs/TabItem strip — see docs/ux/UX-SHELL-POLISH-AUDIT-2026-08-06.md
  // §b) — its current step carries aria-current="step", not aria-selected.
  // Locator({ current: "step" }) didn't narrow against this Playwright
  // version's role engine (returned every button on the page), so match
  // the DOM attribute directly instead.
  await expect(page.locator('[aria-current="step"]')).toBeVisible();

  // 6. Añadir ingreso.
  await page.getByRole("button", { name: /Ingresos/ }).click();
  // Stage content now renders conditionally on `activeStage` state (no
  // Tabs, so no stale-tabpanel race to guard against) — the next assertion
  // (the "Añadir ingreso" button only exists on the Ingresos stage) is
  // itself proof the correct stage rendered.
  await page.getByRole("button", { name: "Añadir ingreso" }).click();
  await page.getByLabel("Categoría").selectOption("wages");
  await page.getByLabel("Fuente o patrono").fill("Empleo nuevo E2E");
  await page.getByLabel("Ingreso bruto").fill("1500");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Empleo nuevo E2E").first()).toBeVisible();

  // 7. Añadir gasto.
  await page.getByRole("button", { name: /Gastos/ }).click();
  await page.getByRole("button", { name: "Añadir gasto" }).click();
  await page.getByLabel("Categoría").selectOption("food");
  await page.getByLabel("Descripción").fill("Supermercado E2E");
  await page.getByLabel("Monto mensual").fill("200");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Supermercado E2E").first()).toBeVisible();

  // 8. Subir metadata de documento.
  await page.getByRole("button", { name: /Documentos/ }).click();
  await page.getByRole("button", { name: "Añadir evidencia" }).click();
  await page.getByLabel("Tipo de evidencia").selectOption("Talones de pago");
  await page.getByLabel("Nombre del documento").fill("talon-e2e.pdf");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("talon-e2e.pdf").first()).toBeVisible();

  // 9. Ver resumen actualizado.
  await page.getByRole("button", { name: /Comenzar/ }).click();
  await expect(page.getByText("Ingreso neto mensual")).toBeVisible();
  await expect(page.getByText("Próximos pasos")).toBeVisible();

  // 10. Enviar al abogado.
  await page.getByRole("button", { name: "Enviar al abogado" }).click();
  await expect(page.getByText("Solicitud enviada", { exact: true }).first()).toBeVisible();
});

test("attorney completes the full 9-step review flow (master instruction §20)", async ({ page }) => {
  // 1. Login.
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como abogado" }).click();
  // 2. Ver bandeja.
  await expect(page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." })).toBeVisible();

  // 3. Filtrar caso urgente.
  // Scoped to the results table: ResponsiveDataView (Block 9.5) always
  // renders both a table (lg+) and a card list (mobile), toggled via CSS
  // breakpoint, not removed from the DOM — an unscoped getByText() can
  // resolve to both variants for the same row and hit Playwright's strict
  // mode. toHaveCount(0), not .not.toBeVisible(), is also the correct
  // assertion for "genuinely filtered out" vs. "present but hidden".
  await page.getByRole("button", { name: "Urgentes", exact: false }).click();
  await expect(page.getByRole("table").getByText("Miguel Santos")).toBeVisible();
  await expect(page.getByRole("table").getByText("Elena Rivera")).toHaveCount(0);

  // 4. Abrir caso.
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Miguel Santos" })).toBeVisible();

  // 5. Consultar resumen AI.
  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByRole("heading", { name: "Resumen del caso (borrador)" })).toBeVisible();
  await expect(page.getByText("Borrador generado a partir del expediente", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();

  // 6. Solicitar documento.
  await page.getByRole("button", { name: "Solicitar documento" }).click();
  await page.getByRole("button", { name: "Solicitar", exact: true }).click();
  await page.getByRole("button", { name: /Documentos/ }).click();
  // exact: true — a hidden tooltip elsewhere on the page contains
  // "...documentos solicitados a clientes...", a substring match of
  // "Solicitado" that resolves to a non-visible element first.
  await expect(page.getByText("Solicitado", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Comenzar/ }).click();

  // 7. Añadir nota.
  await page.getByRole("button", { name: "Añadir nota" }).click();
  await page.getByLabel("Nota profesional").fill("Confirmar atrasos de vivienda en la próxima consulta.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  // 8. Cambiar estado.
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.getByRole("button", { name: /Revisión del abogado/ })).toBeVisible();
  await page.getByLabel("Estado del caso").selectOption("consultation_scheduled");
  await expect(page.getByLabel("Notas profesionales")).toHaveValue(/Confirmar atrasos de vivienda/);

  // 9. Ver timeline actualizado.
  await page.getByRole("button", { name: /Seguimiento/ }).click();
  await expect(page.getByRole("heading", { name: "Proceso del caso" })).toBeVisible();
});

test("client flow succeeds on a mobile viewport (§17)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();

  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByTestId("completion-score")).toBeVisible();

  await page.getByRole("button", { name: "Abrir asistente de preparación" }).click();
  await page.getByLabel("Mensaje").fill("¿Qué me falta?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("La plantilla financiera está completa.", { exact: false })).toBeVisible();

  const bodyBox = await page.locator("body").boundingBox();
  expect(bodyBox?.width).toBeLessThanOrEqual(390);
});
