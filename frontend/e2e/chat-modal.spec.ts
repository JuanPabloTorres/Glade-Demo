import { expect, test, type Page } from "@playwright/test";

/**
 * The preparation assistant, now a centred dialog rather than a right-edge
 * Drawer.
 *
 * The Drawer capped itself at `sm:max-w-sm md:max-w-md`, so the assistant's
 * cards were squeezed into ~380px on a 1440px display, and below `sm` it took
 * the full width anyway. These specs pin what the dialog has to guarantee
 * instead: it is centred, the composer never leaves the panel, the transcript
 * is the only thing that scrolls, and the panel's height does not grow as the
 * conversation does.
 */

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

async function openChat(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByTestId("completion-score")).toBeVisible();
  await page.getByRole("button", { name: "Abrir asistente de preparación" }).click();
  await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeVisible();
}

/** The modal's visual panel — the box everything must stay inside. */
function panel(page: Page) {
  return page.locator('[data-testid="modal-overlay"] [role="dialog"] > div').first();
}

test.describe("Preparation assistant dialog", () => {
  for (const viewport of VIEWPORTS) {
    test(`fits the viewport and keeps the composer inside the panel at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openChat(page);

      const box = (await panel(page).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(box.width).toBeLessThanOrEqual(viewport.width);

      // Centred, not edge-anchored: the gaps left and right match. This is the
      // assertion the Drawer could never have passed.
      const leftGap = box.x;
      const rightGap = viewport.width - (box.x + box.width);
      expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);

      // The composer's input and its send button both have to be inside the
      // panel, not merely somewhere on the page.
      for (const control of [page.getByLabel("Mensaje"), page.getByRole("button", { name: "Enviar", exact: true })]) {
        const controlBox = (await control.boundingBox())!;
        expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(box.y + box.height + 1);
        expect(controlBox.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(box.x + box.width + 1);
      }

      // No page-level horizontal scrollbar at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("uses more than the Drawer's width on a desktop display", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openChat(page);

    // The Drawer was `md:max-w-md` — 448px. Anything at or below that would
    // mean the dialog is no better off than what it replaced.
    const box = (await panel(page).boundingBox())!;
    expect(box.width).toBeGreaterThan(600);
  });

  test("holds its height as the conversation grows — only the transcript scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openChat(page);

    const before = (await panel(page).boundingBox())!;

    await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByText("La plantilla financiera está completa.", { exact: false })).toBeVisible();

    const after = (await panel(page).boundingBox())!;

    // A panel that hugged its content would grow by the height of two new
    // bubbles. This is the guarantee `fillHeight` exists for.
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);

    // The composer stays inside the panel. Its exact `y` is deliberately not
    // asserted: answering reveals the suggested-action chips above it and the
    // disclaimer below it, so the input legitimately shifts within a footer
    // that gained controls. What must not happen is the footer leaving the
    // panel, which is what the old `<form>` layout did.
    const composer = (await page.getByLabel("Mensaje").boundingBox())!;
    expect(composer.y).toBeGreaterThanOrEqual(after.y);
    expect(composer.y + composer.height).toBeLessThanOrEqual(after.y + after.height + 1);

    // And the growth went into the transcript's own scrollport, not the page.
    const transcriptScrolls = await page.evaluate(() => {
      const body = document.querySelector('[data-testid="modal-overlay"] .overflow-y-auto');
      return body ? body.scrollHeight > body.clientHeight : false;
    });
    expect(transcriptScrolls).toBe(true);
  });

  test("closes on Escape and returns focus to the launcher", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openChat(page);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("heading", { name: "Asistente de preparación" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir asistente de preparación" })).toBeFocused();
  });

  test("no longer carries the upload placeholder or a second navigation button", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openChat(page);

    // A "coming soon" dialog opened from inside this dialog, and a button that
    // duplicated one of the suggested-action chips. Both are gone.
    await expect(page.getByRole("button", { name: "Subir documento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir sección recomendada" })).toHaveCount(0);
  });
});
