import { expect, test, type Page } from "@playwright/test";

/**
 * Documents -> Add Evidence.
 *
 * The modal previously carried its own copy of Flowbite's dialog markup, and
 * its `<form>` broke the header/body/footer flex column — the footer, and with
 * it both actions, rendered outside the panel on short viewports. These specs
 * pin the structural guarantees that regression would break, rather than the
 * pixel values that produced it.
 */

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

async function openAddEvidence(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByTestId("completion-score")).toBeVisible();
  // Deep-link straight to the Documents stage: the stage lives in the URL
  // (see STAGE_QUERY_PARAM), so this needs no dependency on the stepper.
  await page.goto(`${page.url().split("?")[0]}?focus=evidence`);
  await page.getByRole("button", { name: "Añadir evidencia" }).first().click();
  await expect(modal(page)).toBeVisible();
}

/**
 * The modal itself. Scoped by the overlay's test id rather than by
 * `role="dialog"`, because the app's mobile navigation drawers carry that role
 * too and stay mounted off-canvas — an unscoped dialog query matches them and
 * can never reach zero.
 */
function modal(page: Page) {
  return page.locator('[data-testid="modal-overlay"]');
}

/** The modal's visual panel — the box everything must stay inside. */
function panel(page: Page) {
  return page.locator('[data-testid="modal-overlay"] [role="dialog"] > div').first();
}

test.describe("Documents — Add Evidence", () => {
  for (const viewport of VIEWPORTS) {
    test(`stays inside the viewport and the panel at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openAddEvidence(page);

      const box = (await panel(page).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(box.width).toBeLessThanOrEqual(viewport.width);

      // Both actions must be inside the panel, not merely on the page.
      for (const name of ["Guardar", "Cancelar"]) {
        const button = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
        expect(button.y + button.height).toBeLessThanOrEqual(box.y + box.height + 1);
        expect(button.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(button.x + button.width).toBeLessThanOrEqual(box.x + box.width + 1);
      }

      // No page-level horizontal scrollbar at any width.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    });
  }

  test("scrolls its body while the header and the actions stay put", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openAddEvidence(page);

    const header = page.getByRole("heading", { name: "Añadir evidencia" });
    const save = page.getByRole("button", { name: "Guardar", exact: true });
    const headerBefore = (await header.boundingBox())!;
    const saveBefore = (await save.boundingBox())!;

    const body = page.locator('[data-testid="modal-overlay"] .overflow-y-auto').first();
    await body.evaluate((element) => element.scrollTo(0, element.scrollHeight));

    expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect((await header.boundingBox())!.y).toBeCloseTo(headerBefore.y, 0);
    expect((await save.boundingBox())!.y).toBeCloseTo(saveBefore.y, 0);
    await expect(save).toBeVisible();
  });

  test("reports missing required fields inline and refuses to submit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAddEvidence(page);

    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(modal(page)).toBeVisible();
    await expect(page.getByText("Este campo es obligatorio.").first()).toBeVisible();
    await expect(page.getByLabel("Tipo de evidencia")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Tipo de evidencia")).toBeFocused();

    await page.getByLabel("Tipo de evidencia").selectOption("pay-stubs");
    await expect(page.getByLabel("Tipo de evidencia")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("truncates a long file name instead of widening the modal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openAddEvidence(page);

    const widthBefore = (await panel(page).boundingBox())!.width;
    const name = "estado-bancario-consolidado-corriente-y-ahorros-enero-marzo-2026-final.pdf";
    await page.setInputFiles("#evidence-file", { name, mimeType: "application/pdf", buffer: Buffer.alloc(2_517_000) });

    await expect(page.getByTitle(name)).toBeVisible();
    expect((await panel(page).boundingBox())!.width).toBe(widthBefore);
    // The name is shown, ellipsized — the element is narrower than its text.
    const clipped = await page.getByTitle(name).evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(clipped).toBe(true);
    await expect(page.getByLabel("Nombre del documento")).toHaveValue(name);
  });

  test("is operable by keyboard and returns focus to its trigger", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openAddEvidence(page);

    await expect(modal(page).getByRole("dialog")).toHaveAttribute("aria-modal", "true");

    // Focus never reaches the page behind the dialog. The check excludes
    // `aria-hidden` nodes because the underlying floating-ui trap parks a 1x1
    // `aria-hidden` focus guard just outside the dialog to detect wrap-around,
    // so one tab per cycle legitimately lands there before being sent back in.
    // Such a guard is not in the accessibility tree and has nothing to
    // interact with; a real leak would land on a node the user can perceive,
    // which is what this rules out. Keyed on `aria-hidden` rather than on the
    // element's size — the guard is 1x1, not 0x0.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const escaped = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active.closest('[role="dialog"]')) return null;
        if (active.closest('[aria-hidden="true"]')) return null;
        return active.outerHTML.slice(0, 120);
      });
      expect(escaped, `tab ${i + 1} left the dialog`).toBeNull();
    }

    await page.keyboard.press("Escape");
    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Añadir evidencia" }).first()).toBeFocused();
  });

  test("saves an entry, and discards it on cancel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAddEvidence(page);

    await page.getByLabel("Tipo de evidencia").selectOption("pay-stubs");
    await page.getByLabel("Nombre del documento").fill("talon-abril.pdf");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();

    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByText("talon-abril.pdf").first()).toBeVisible();

    await page.getByRole("button", { name: "Añadir evidencia" }).first().click();
    await page.getByLabel("Tipo de evidencia").selectOption("bank-statement");
    await page.getByLabel("Nombre del documento").fill("descartado.pdf");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();

    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByText("descartado.pdf")).toHaveCount(0);
  });
});
