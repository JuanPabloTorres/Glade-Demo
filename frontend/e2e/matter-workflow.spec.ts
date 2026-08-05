import { expect, test } from "@playwright/test";

test("client submits a bankruptcy intake and attorney reviews it", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await expect(
    page.getByRole("heading", { name: "Prepara tu historia financiera paso a paso." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar solicitud" }).click();
  await expect(page.getByRole("heading", { name: "Elena Rivera" })).toBeVisible();
  await expect(page.getByTestId("completion-score")).toBeVisible();

  await page.getByRole("tab", { name: "Guía inteligente" }).click();
  await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    page.getByText("La plantilla financiera está completa.", { exact: false }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Enviar al abogado" }).click();
  await expect(page.getByText("Solicitud enviada", { exact: true }).first()).toBeVisible();

  await page.evaluate(() => sessionStorage.removeItem("matterready.auth.session"));
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como abogado" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revisar" }).first().click();
  await expect(page.getByRole("tab", { name: "Revisión del abogado" })).toBeVisible();
});
