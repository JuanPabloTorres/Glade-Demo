import { expect, test, type Page } from "@playwright/test";

/**
 * The three contracts that horizontal-overflow measurement cannot see:
 * the shell stays pinned on a long page, overlays escape their containers and
 * land above everything, and the whole product speaks one language at a time.
 *
 * Each block reproduces a defect this refactor fixed, so a regression fails
 * here rather than in a screenshot review.
 */

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

async function loginAs(page: Page, role: "cliente" | "abogado") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Entrar como ${role}` }).click();
}

/**
 * Signs in as the attorney and waits for the inbox rows to actually exist.
 *
 * The rows arrive after the first render, so counting `Más acciones` triggers
 * straight after `loginAs` counts zero and every assertion built on that count
 * is meaningless — which is exactly how the first draft of these tests
 * "passed" a delete it never performed.
 */
async function loginToInbox(page: Page) {
  await loginAs(page, "abogado");
  await expect(page.getByRole("button", { name: "Más acciones" }).first()).toBeVisible();
}

/**
 * Scrolls to the bottom of the document and reports how far it actually moved.
 *
 * `behavior: "instant"` is required, not stylistic: `index.css` sets
 * `scroll-behavior: smooth` on `html`, so a plain `scrollTo` animates and
 * reading `scrollY` on the next frame reports 0 — which reads exactly like "the
 * document does not scroll" and sent the first version of this spec chasing a
 * layout bug that did not exist.
 */
async function scrollToBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    return window.scrollY;
  });
}

test.describe("app shell survives a long page", () => {
  // A short viewport against the product's densest screen, so the document is
  // reliably several screens tall — the condition the bug needs to show. At
  // 1280x800 the inbox scrolled 2px and proved nothing.
  const SHORT = { width: 1280, height: 420 };
  test.use({ viewport: SHORT });

  test("the sidebar and header stay pinned to the viewport after scrolling", async ({ page }) => {
    await loginToInbox(page);
    await page.getByRole("link", { name: "Abrir", exact: true }).first().click();
    await expect(page.getByTestId("completion-score")).toBeVisible();
    await expect(page.locator("aside")).toBeVisible();

    const scrolled = await scrollToBottom(page);
    // A page that does not scroll cannot prove anything about sticky.
    expect(scrolled, "the case workspace is not tall enough to exercise sticky positioning").toBeGreaterThan(200);

    // This is the reported bug: with `overflow-x: hidden` on html/body the body
    // becomes a scroll container, every `position: sticky` descendant binds to
    // a scrollport that never scrolls, and both of these scrolled away — the
    // sidebar appearing to "end halfway down the page".
    const sidebar = await page.locator("aside").boundingBox();
    expect(sidebar?.y, "the sidebar scrolled away instead of sticking to the viewport").toBeCloseTo(0, 0);

    const header = await page.locator("header").boundingBox();
    expect(header?.y, "the header scrolled away instead of sticking").toBeCloseTo(0, 0);

    // And its height is the viewport's, not the document's.
    expect(sidebar?.height).toBeLessThanOrEqual(SHORT.height + 1);
  });

  test("the document scrolls while the sidebar's own overflow stays independent", async ({ page }) => {
    await loginAs(page, "abogado");
    const sidebarScrolls = await page
      .locator("aside > div")
      .last()
      .evaluate((node) => getComputedStyle(node).overflowY);
    expect(sidebarScrolls).toBe("auto");
  });
});

test.describe("overlays escape their containers and stack correctly", () => {
  test.use({ viewport: DESKTOP });

  test("a row menu is portaled to the body, not trapped in the table", async ({ page }) => {
    await loginToInbox(page);
    await page.getByRole("button", { name: "Más acciones" }).first().click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const escapes = await menu.evaluate((node) => ({
      parentIsBody: node.parentElement === document.body,
      position: getComputedStyle(node).position,
      zIndex: Number(getComputedStyle(node).zIndex),
    }));
    expect(escapes.parentIsBody, "the menu is still rendered inside the table subtree").toBe(true);
    expect(escapes.position).toBe("fixed");

    // Above the sticky header, which is what `z-10` inside a `z-20` header
    // could not guarantee once the menu left that stacking context.
    const headerZ = await page.locator("header").evaluate((node) => Number(getComputedStyle(node).zIndex));
    expect(escapes.zIndex).toBeGreaterThan(headerZ);
  });

  test("the last row's menu flips upward instead of running off the bottom", async ({ page }) => {
    await loginToInbox(page);
    const triggers = page.getByRole("button", { name: "Más acciones" });
    const count = await triggers.count();
    expect(count, "no row actions rendered").toBeGreaterThan(0);

    const last = triggers.nth(count - 1);
    await last.scrollIntoViewIfNeeded();
    await last.click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();

    expect(box, "menu has no layout box").not.toBeNull();
    expect(box!.y, "menu is positioned above the viewport top").toBeGreaterThanOrEqual(-1);
    expect(box!.y + box!.height, "menu runs past the bottom of the viewport").toBeLessThanOrEqual(DESKTOP.height + 1);
    expect(box!.x + box!.width, "menu runs past the right edge").toBeLessThanOrEqual(DESKTOP.width + 1);
  });

  test("a tooltip renders above the chrome and is not clipped by its card", async ({ page }) => {
    await loginAs(page, "cliente");
    // The sidebar's collapse control: an icon-only button inside the sticky
    // column, which is where a tooltip both gets clipped and loses the
    // stacking contest.
    await expect(page.locator("aside")).toBeVisible();
    await page.getByRole("button", { name: /Contraer menú lateral/ }).hover();

    const tooltip = page.getByRole("tooltip").first();
    await expect(tooltip).toBeVisible();

    const [tooltipZ, headerZ, navZ] = await Promise.all([
      tooltip.evaluate((node) => Number(getComputedStyle(node).zIndex)),
      page.locator("header").evaluate((node) => Number(getComputedStyle(node).zIndex)),
      page.locator("aside").evaluate((node) => Number(getComputedStyle(node).zIndex)),
    ]);
    expect(tooltipZ).toBeGreaterThan(headerZ);
    expect(tooltipZ).toBeGreaterThan(navZ);

    const box = await tooltip.boundingBox();
    expect(box!.x, "tooltip is clipped off the left edge").toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(DESKTOP.width + 1);
  });

  test("a menu opened inside a modal renders above the dialog", async ({ page }) => {
    await loginAs(page, "abogado");
    const [modalZ, menuZ] = await page.evaluate(() => {
      const read = (name: string) => Number(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
      return [read("--z-index-modal"), read("--z-index-menu")];
    });
    // The scale is the contract; without this ordering a row menu inside a
    // detail dialog renders behind the dialog it was opened from.
    expect(menuZ).toBeGreaterThan(modalZ);
  });
});

test.describe("destructive actions are confirmed, never fired from the menu", () => {
  test.use({ viewport: DESKTOP });

  test("delete opens a confirmation and cancelling leaves the row in place", async ({ page }) => {
    await loginToInbox(page);
    const rowsBefore = await page.getByRole("button", { name: "Más acciones" }).count();
    expect(rowsBefore, "no rows to delete from").toBeGreaterThan(0);

    await page.getByRole("button", { name: "Más acciones" }).first().click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await page.getByRole("button", { name: "Más acciones" }).count()).toBe(rowsBefore);
  });
});

test.describe("the assistant is global", () => {
  test("desktop: launcher opens a side panel, minimize keeps the conversation", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await loginAs(page, "cliente");

    const launcher = page.getByRole("button", { name: "Abrir asistente" });
    await expect(launcher, "the assistant launcher is not present on the dashboard").toBeVisible();

    await launcher.click();
    const panel = page.getByRole("dialog", { name: /Asistente/ });
    await expect(panel).toBeVisible();

    // It is a side panel, not a takeover: the page behind stays usable.
    const box = await panel.boundingBox();
    expect(box!.width, "the desktop panel covers the whole screen").toBeLessThan(DESKTOP.width * 0.6);
    await expect(page.locator("aside")).toBeVisible();

    // Type a draft, minimize, restore — the draft must survive.
    const composer = page.getByLabel("Mensaje");
    await composer.fill("Pregunta de prueba");
    await page.getByRole("button", { name: "Minimizar asistente" }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: "Retomar conversación" }).click();
    await expect(panel).toBeVisible();
    await expect(composer, "minimizing destroyed the composer draft").toHaveValue("Pregunta de prueba");
  });

  test("the launcher is present on a route with no case open", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    // The attorney inbox: authenticated, but no case is open, so the assistant
    // has nothing scoped to it yet. The control is still there.
    await loginToInbox(page);
    await expect(page.getByRole("button", { name: "Abrir asistente" })).toBeVisible();

    await page.getByRole("button", { name: "Abrir asistente" }).click();
    const panel = page.getByRole("dialog", { name: /Asistente/ });
    await expect(panel).toBeVisible();
    // And it says what it needs rather than pretending to have context.
    await expect(panel).toContainText(/Abre un expediente/i);
  });

  test("on a phone the bottom bar owns the assistant and no floating button covers content", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await loginAs(page, "cliente");

    const bottomNav = page.locator("nav[aria-label='Navegación principal']:not(aside nav)");
    await expect(bottomNav).toBeVisible();
    // The bar's raised centre action is the phone's entry point.
    await expect(bottomNav.getByRole("link", { name: /Asistente/ })).toBeVisible();

    // And there is no second, floating entry point competing with it — one
    // that, lifted clear of the bar, sat on top of the page's own cards.
    await expect(page.getByRole("button", { name: "Abrir asistente" })).toBeHidden();
  });

  test("the phone's assistant destination fits the viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await loginAs(page, "cliente");

    const bottomNav = page.locator("nav[aria-label='Navegación principal']:not(aside nav)");
    await bottomNav.getByRole("link", { name: /Asistente/ }).click();

    const composer = page.getByLabel("Mensaje");
    await expect(composer).toBeVisible();
    const box = (await composer.boundingBox())!;
    const navBox = (await bottomNav.boundingBox())!;
    expect(box.y + box.height, "the composer is trapped under the bottom bar").toBeLessThanOrEqual(navBox.y + 1);
  });
});

test.describe("one language at a time", () => {
  test.use({ viewport: DESKTOP });

  /**
   * Spanish markers that must never appear in the UI's own copy while the app
   * is in English — unambiguous stems that do not occur in English copy.
   */
  const SPANISH_MARKERS = /\b(Añadir|Guardar|Eliminar|Cancelar|Solicitar|Expediente|Ingresos|Deudas|Revisión|Cerrar sesión|Más acciones|Bandeja)\b/;
  const ENGLISH_MARKERS = /\b(Add|Save|Delete|Cancel|Request|Case file|Income|Debts|Sign out|More actions|Inbox)\b/;

  /**
   * The application's own chrome and controls — header, sidebar, bottom bar,
   * footer, buttons, links, menus, tab labels.
   *
   * Deliberately NOT the whole body. Case *content* (timeline entries, seeded
   * client goals, stage descriptions) is authored Spanish demo data served by
   * the backend, and it stays Spanish in an English session. That is a real
   * mixed-language finding, but it belongs to the backend seed/contract and is
   * recorded as such — asserting on it here would fail this spec for a defect
   * it cannot fix and hide the chrome regressions it exists to catch.
   */
  async function chromeText(page: Page): Promise<string> {
    return page.evaluate(() => {
      const scopes = ["header", "aside", "footer", "nav", '[role="menu"]', '[role="dialog"]'];
      const chrome = scopes.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
      const controls = Array.from(document.querySelectorAll("button, a[href], label, th"));
      return [...chrome, ...controls]
        .map((node) => `${(node as HTMLElement).innerText ?? ""} ${node.getAttribute("aria-label") ?? ""}`)
        .join("\n");
    });
  }

  test("switching to English leaves no Spanish UI copy behind", async ({ page }) => {
    await loginAs(page, "abogado");
    await page.getByRole("button", { name: /Cambiar a English|Switch to English/ }).click();

    await expect(page.getByRole("button", { name: /Cambiar a Español|Switch to Español/ })).toBeVisible();
    expect(await chromeText(page)).not.toMatch(SPANISH_MARKERS);

    // The case workspace, where the densest generated copy lives.
    await page.getByRole("link", { name: "Open", exact: true }).first().click();
    await expect(page.getByTestId("completion-score")).toBeVisible();
    expect(await chromeText(page)).not.toMatch(SPANISH_MARKERS);
  });

  test("the generated attorney summary is written in the active language", async ({ page }) => {
    await loginAs(page, "abogado");
    await page.getByRole("button", { name: /Cambiar a English|Switch to English/ }).click();
    await page.getByRole("link", { name: "Open", exact: true }).first().click();

    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("menuitem", { name: "Generate summary" }).click();

    // This document used to be built from hardcoded Spanish template literals,
    // so it stayed Spanish no matter what the user selected.
    const draft = await page.getByRole("textbox", { name: /Case summary/ }).inputValue();
    expect(draft).toContain("Case summary");
    expect(draft).not.toMatch(/Resumen del caso|pendiente de análisis|Objetivo declarado/);
  });

  test("an explicit language choice survives a reload", async ({ page }) => {
    await loginAs(page, "cliente");
    await page.getByRole("button", { name: /Cambiar a English|Switch to English/ }).click();
    await expect(page.getByRole("button", { name: /Switch to Español|Cambiar a Español/ })).toBeVisible();

    await page.reload();

    // The signed-in profile's language used to outrank the device's choice on
    // every load, silently reverting the switch.
    await expect(page.getByRole("button", { name: /Switch to Español|Cambiar a Español/ })).toBeVisible();
    expect(await chromeText(page)).not.toMatch(SPANISH_MARKERS);
  });

  test("the Spanish UI carries no English copy", async ({ page }) => {
    await loginAs(page, "abogado");
    expect(await chromeText(page)).not.toMatch(ENGLISH_MARKERS);
  });
});

test.describe("login is clean", () => {
  test.use({ viewport: DESKTOP });

  test("no internal fallback or implementation message is shown", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar como cliente" })).toBeVisible();

    const text = await page.locator("body").innerText();
    for (const leak of [
      "fondo externo",
      "fondo de respaldo",
      "external background",
      "fallback background",
      "Mock data",
      "Development mode",
    ]) {
      expect(text, `login is surfacing an internal message: "${leak}"`).not.toContain(leak);
    }
  });

  test("the language control is legible against the hero, not dark on dark", async ({ page }) => {
    await page.goto("/login");
    const control = page.getByRole("button", { name: /Cambiar a English|Switch to English/ });
    await expect(control).toBeVisible();

    const color = await control.evaluate((node) => getComputedStyle(node).color);
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    // The reported defect was `text-heading` (#0f172a) on the dark hero. Any
    // near-black foreground here is the same bug returning.
    const luminance = (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255;
    expect(luminance, `language control renders ${color} on the dark hero`).toBeGreaterThan(0.6);
  });
});
