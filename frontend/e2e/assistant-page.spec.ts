import { expect, test, type Page } from "@playwright/test";

/**
 * This suite asserts Spanish copy, so it declares the locale it needs.
 *
 * The config used to pin `es-PR` globally, which made Spanish the invisible
 * default and left the English first-visit path untested — that is how an
 * English UI shipped around a Spanish case file. A spec that depends on a
 * language now says so where the dependency is.
 */
test.use({ locale: "es-PR" });


/**
 * The preparation assistant, and the one control that opens it.
 *
 * It has been three things across three releases: a floating button opening a
 * Drawer, then a route (`/assistant`) with a page of its own, and now a panel
 * over the current screen with `/assistant` kept as a redirect.
 *
 * The route was adopted to give the conversation a URL, and it did — at the
 * cost of taking the user off the section they were asking about, and of
 * leaving the product with two entry points that behaved differently. What
 * these specs pin now is what the panel has to guarantee: exactly one control
 * opens it, the composer stays on screen at every width rather than being
 * pushed below the fold, the old URL still works, and a navigating suggestion
 * gets the panel out of the way of the section it just opened.
 */

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar como cliente" }).click();
  await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();
}

async function openAssistant(page: Page) {
  await page.getByRole("button", { name: "Abrir asistente" }).click();
  await expect(page.getByRole("dialog", { name: "Asistente de preparación" })).toBeVisible();
}

test.describe("Assistant panel", () => {
  for (const viewport of VIEWPORTS) {
    test(`keeps complete avatars and the composer on screen at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on("console", (entry) => {
        if (entry.type() === "error") consoleErrors.push(entry.text());
      });
      await page.setViewportSize(viewport);
      await loginAsClient(page);
      await openAssistant(page);
      const documentScrollBeforeMessage = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));

      const assistantAvatar = page.getByRole("img", { name: "Asistente" }).first();
      await expect(assistantAvatar).toBeVisible();

      await page.getByLabel("Mensaje").fill("¿Qué me falta?");
      const sendButton = page.getByRole("button", { name: "Enviar", exact: true });
      await sendButton.click();
      const userAvatar = page.getByRole("img", { name: "Tú" }).last();
      await expect(userAvatar).toBeVisible();

      for (const avatar of [assistantAvatar, userAvatar]) {
        const box = (await avatar.boundingBox())!;
        expect(box.width).toBe(36);
        expect(box.height).toBe(36);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      }

      await expect(page.getByRole("img", { name: "Asistente" })).toHaveCount(2);
      const latestAssistantIsComplete = await page
        .getByRole("img", { name: "Asistente" })
        .last()
        .evaluate((avatar) => {
          const transcript = avatar.closest(".overflow-y-auto");
          if (!transcript) return false;
          const viewportBox = transcript.getBoundingClientRect();
          const box = avatar.getBoundingClientRect();
          return box.top >= viewportBox.top && box.bottom <= viewportBox.bottom;
        });
      expect(latestAssistantIsComplete).toBe(true);
      expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(documentScrollBeforeMessage);

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
      expect(consoleErrors).toEqual([]);
      await page.screenshot({
        path: `test-results/chat-avatar-evidence/chat-avatar-${viewport.width}-es.png`,
      });
    });
  }

  test("the legacy /assistant URL still resolves, into the panel", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);

    await page.goto("/assistant?prompt=%C2%BFQu%C3%A9%20me%20falta%3F");

    // Redirected home, with the panel open and the prompt already written —
    // a link that used to open a page still opens the conversation.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("dialog", { name: "Asistente de preparación" })).toBeVisible();
    await expect(page.getByLabel("Mensaje")).toHaveValue("¿Qué me falta?");
  });

  test("renders the same complete avatar treatment in English", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsClient(page);
    await page.getByRole("button", { name: "Cambiar a English" }).click();
    await page.getByRole("button", { name: "Open assistant" }).click();

    const assistantAvatar = page.getByRole("img", { name: "Assistant" }).first();
    await expect(assistantAvatar).toBeVisible();
    await page.getByLabel("Message").fill("What am I missing?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("img", { name: "You" }).last()).toBeVisible();

    await page.screenshot({ path: "test-results/chat-avatar-evidence/chat-avatar-390-en.png" });
  });

  test("answers a question and holds the composer in place", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await openAssistant(page);

    await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    // The reply names uncovered *requirements*, not "pending documents".
    //
    // That distinction is the change: `pending_documents` holds documents an
    // attorney explicitly requested and is empty on almost every case, so this
    // question used to be answered "no hay documentos pendientes" — true about
    // requests, useless about evidence. Matched on the requirement vocabulary
    // rather than a full sentence, so a copy edit does not fail the journey.
    await expect(
      page.getByText(/requisito\(s\)|respaldo|No falta evidencia/i).first(),
    ).toBeVisible();

    // Two new bubbles arrived. If the panel grew instead of the transcript, the
    // input the user is typing into would have walked down the screen.
    const composerAfter = (await page.getByLabel("Mensaje").boundingBox())!;
    expect(composerAfter.y + composerAfter.height).toBeLessThanOrEqual(768 + 1);

    const transcriptScrolls = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll<HTMLElement>(".overflow-y-auto"));
      return boxes.some((box) => box.scrollHeight > box.clientHeight);
    });
    expect(transcriptScrolls).toBe(true);
  });

  test("a suggested navigation action opens the section and gets out of its way", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await openAssistant(page);

    await page.getByLabel("Mensaje").fill("¿Qué documentos me faltan?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    // The label comes from the backend, not the frontend's locale files:
    // AgentRuntime._draft_as_answer emits this `open_page` action whenever the
    // deterministic draft answers.
    await page.getByRole("button", { name: "Abrir la sección recomendada" }).click();

    await expect(page).toHaveURL(/\/case\/[^/]+\/[a-z-]+$/);
    // Minimized rather than closed: the panel would otherwise cover the section
    // it just opened, and on a phone it would cover all of it. The conversation
    // is still there behind the launcher.
    await expect(page.getByRole("dialog", { name: "Asistente de preparación" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Retomar conversación" })).toBeVisible();
  });

  test("carries no drawer-era upload placeholder and no second navigation button", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsClient(page);
    await openAssistant(page);

    await expect(page.getByRole("button", { name: "Subir documento" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir sección recomendada" })).toHaveCount(0);
  });
});
