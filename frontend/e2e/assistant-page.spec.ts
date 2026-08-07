import { expect, test, type Page } from "@playwright/test";

/**
 * The preparation assistant as a destination.
 *
 * It used to be a floating button opening a right-edge Drawer, which meant it
 * had no URL: it could not be linked to, did not survive a reload, and on a
 * phone it was a second navigation surface competing with the bottom bar.
 * These specs pin what the route has to guarantee instead — it is reachable
 * from both shells, it survives a reload, and the composer stays put as the
 * conversation grows rather than being pushed below the fold.
 */

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();
}

test.describe("Assistant route", () => {
  for (const viewport of VIEWPORTS) {
    test(`renders and keeps the composer on screen at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAsClient(page);
      await page.goto("/assistant");

      await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeVisible();

      // The composer has to be inside the viewport, not merely on the page —
      // the whole point of sizing the transcript instead of the document.
      for (const control of [page.getByLabel("Mensaje"), page.getByRole("button", { name: "Enviar", exact: true })]) {
        const box = (await control.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("survives a reload, which the drawer could not", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/assistant$/);
    await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeVisible();
  });

  test("answers a question and holds the composer in place", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await page.goto("/assistant");

    await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    // The reply is about documents, because that is what was asked — the
    // deterministic draft branches on the message now, not only on case state.
    await expect(
      page.getByText(/documentos? pendientes?|documento\(s\) pendiente\(s\)/i).first(),
    ).toBeVisible();

    // Two new bubbles arrived. If the page grew instead of the transcript, the
    // input the user is typing into would have walked down the screen.
    const composerAfter = (await page.getByLabel("Mensaje").boundingBox())!;
    expect(composerAfter.y + composerAfter.height).toBeLessThanOrEqual(768 + 1);

    const transcriptScrolls = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll<HTMLElement>(".overflow-y-auto"));
      return boxes.some((box) => box.scrollHeight > box.clientHeight);
    });
    expect(transcriptScrolls).toBe(true);
  });

  test("a suggested navigation action leaves for the case section it names", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await page.goto("/assistant");

    await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    // The label comes from the backend, not the frontend's locale files:
    // AgentRuntime._draft_as_answer emits this `open_page` action whenever the
    // deterministic draft answers.
    await page.getByRole("button", { name: "Abrir la sección recomendada" }).click();

    await expect(page).toHaveURL(/\/case\/[^/]+\/[a-z-]+$/);
  });

  test("no longer carries the drawer-era upload placeholder or a second navigation button", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await page.goto("/assistant");

    await expect(page.getByRole("button", { name: "Subir documento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir sección recomendada" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cerrar" })).toHaveCount(0);
  });
});
