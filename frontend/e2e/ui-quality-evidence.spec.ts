import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_VERSION = readFileSync(resolve(REPO_ROOT, "VERSION"), "utf8").trim();

/**
 * Visual and language evidence for the UI quality pass.
 *
 * Two jobs, deliberately in one spec:
 *
 * 1. It captures the screenshots the change fragment needs, at 390 and 1440,
 *    in both languages, for every screen the change touched.
 * 2. It asserts what the screenshots are supposed to show — that an English
 *    session contains no Spanish string and vice versa, that no screen scrolls
 *    horizontally, and that the assistant has exactly one entry point. A
 *    screenshot nobody reads proves nothing; these assertions are what make the
 *    run a gate rather than a gallery.
 *
 * The language check is a word list, not a translation check. It looks for
 * words that exist in one language and not the other and would only appear on
 * screen if a string leaked — the timeline entries, the evidence checklist and
 * the assistant's greeting, which are exactly where the leaks were.
 */

const EVIDENCE_DIR = "test-results/ui-quality-evidence";

/** Words that can only be on screen if Spanish copy leaked into an English session. */
const SPANISH_ONLY = [
  "Solicitud",
  "Talones",
  "Identificación",
  "Estados bancarios",
  "Documentos de respaldo",
  "Próximos pasos",
  "Expediente",
  "Asistente",
];

/** And the reverse. "Chapter" is excluded: it is a proper noun in both. */
const ENGLISH_ONLY = [
  "Request started",
  "Pay stubs",
  "Valid photo ID",
  "Recent bank statements",
  "Supporting documents",
  "Next steps",
  "Attorney review",
];

async function signIn(page: Page, language: "es" | "en", role: "client" | "attorney") {
  await page.addInitScript((code) => {
    window.localStorage.setItem("freshstart.language", code);
  }, language);
  await page.goto("/login");
  const label =
    role === "client"
      ? /Entrar como cliente|Sign in as client/i
      : /Entrar como abogad|Sign in as attorney/i;
  await page.getByRole("button", { name: label }).click();
  await expect(page.getByRole("banner")).toBeVisible();
}

/**
 * The page must not scroll sideways at any width.
 *
 * Read off the document rather than the body: `overflow-x: clip` on the root
 * hides the scrollbar without removing the overflow, so a body-only check
 * passes on a page that is genuinely too wide.
 */
async function expectNoHorizontalOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${where} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
}

async function expectNoForeignCopy(page: Page, language: "es" | "en", where: string) {
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const forbidden = language === "en" ? SPANISH_ONLY : ENGLISH_ONLY;
  for (const word of forbidden) {
    expect(text, `${where} (${language}) contains "${word}"`).not.toContain(word);
  }
}

async function capture(page: Page, name: string, language: "es" | "en") {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}.png`, fullPage: true });
  await expectNoHorizontalOverflow(page, name);
  await expectNoForeignCopy(page, language, name);
}

for (const viewport of [
  { width: 390, height: 844, tag: "mobile" },
  { width: 1440, height: 900, tag: "desktop" },
]) {
  for (const language of ["es", "en"] as const) {
    test(`client screens are clean at ${viewport.tag} in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page, language, "client");

      await capture(page, `${viewport.tag}-${language}-client-home`, language);

      await page.getByRole("button", { name: /^(Continuar|Continue)$/ }).first().click();
      await expect(page.getByTestId("completion-score")).toBeVisible();
      await capture(page, `${viewport.tag}-${language}-case-overview`, language);

      const caseBase = page.url().replace(/\/[^/]*$/, "");

      await page.goto(`${caseBase}/documents`);
      await expect(page.getByText(/Lista inteligente|Smart evidence/)).toBeVisible();
      await capture(page, `${viewport.tag}-${language}-documents`, language);

      await page.goto(`${caseBase}/activity`);
      await expect(page.getByRole("heading", { name: /Proceso del caso|Case process/ })).toBeVisible();
      // The screen the language leak was reported on: an English session read
      // "Solicitud iniciada / Se creó un expediente privado" under an English
      // heading, because the entries were persisted as prose at creation time.
      await capture(page, `${viewport.tag}-${language}-activity`, language);
    });
  }
}

test("the assistant has exactly one entry point, and its panel fills a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "es", "client");

  // Neither navigation surface offers the assistant any more.
  await expect(page.getByRole("link", { name: "Asistente" })).toHaveCount(0);

  const launcher = page.getByRole("button", { name: "Abrir asistente" });
  await expect(launcher).toBeVisible();

  // It must not sit on top of the bottom bar it shares the corner with.
  const bar = page.getByRole("navigation", { name: "Navegación principal" });
  const launcherBox = await launcher.boundingBox();
  const barBox = await bar.boundingBox();
  expect(launcherBox && barBox && launcherBox.y + launcherBox.height).toBeLessThanOrEqual(
    (barBox?.y ?? 0) + 1,
  );

  await launcher.click();
  const panel = page.getByRole("dialog", { name: "Asistente de preparación" });
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  expect(panelBox?.width).toBeGreaterThanOrEqual(389);
  expect(panelBox?.height).toBeGreaterThanOrEqual(700);
  // The launcher hides itself while the panel is open — one control, not two.
  await expect(launcher).toHaveCount(0);

  await page.screenshot({ path: `${EVIDENCE_DIR}/mobile-es-assistant.png` });
});

test("the footer reports the version this tree was built from", async ({ page }) => {
  // Reported as "the front says 4.10.1 while the API says 4.11.0". It was a
  // browser holding a page from before the deploy — production rendered
  // v4.11.0 and served the HTML with `max-age=0, must-revalidate`. Pinned here
  // anyway, because "the build is a release behind" is the kind of thing that
  // should fail a suite rather than be noticed on a screen.
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "es", "client");

  const footer = await page.locator("footer").innerText();
  expect(footer).toContain(`v${REPO_VERSION}`);
});

/**
 * First visit: no stored preference, one browser locale, both directions.
 *
 * This is the case that shipped broken. The UI and the seeded demo content each
 * resolved the language their own way — the UI through `resolveLanguage`
 * (profile → persisted → browser → default), the seed through a private rule
 * that fell back to Spanish — and production rendered an English UI around a
 * Spanish case file for anyone arriving with nothing stored.
 *
 * It survived a green suite because the Playwright config pinned every run to
 * `es-PR`, so no test ever arrived the way a first-time visitor does. Both
 * directions are asserted now, and neither inherits a locale from the config.
 */
/**
 * A first visit is defined by what this function does *not* do: it never calls
 * `addInitScript` to seed `freshstart.language`, which is what every other test
 * in this file does and exactly the step that hid the defect.
 *
 * It cannot be asserted at runtime that storage is empty — `LanguageProvider`
 * persists the resolved language in its first effect, so by the time any page
 * has rendered the preference exists. An earlier version of this helper checked
 * for `null` and failed against a perfectly correct app. What the caller asserts
 * instead is that the *persisted* value matches the browser's locale, which is
 * the observable proof that resolution went through the browser step.
 */
async function firstVisitAsClient(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByRole("button", { name: /Entrar como cliente|Sign in as client/i }).click();
  await expect(page.getByRole("banner")).toBeVisible();
}

test.describe("first visit in an English browser", () => {
  test.use({ locale: "en-US" });

  test("the UI and the seeded case file are both English", async ({ page }) => {
    await firstVisitAsClient(page);

    expect(await page.evaluate(() => localStorage.getItem("freshstart.language"))).toBe("en");
    const main = await page.locator("main").innerText();
    expect(main).toContain("Organize my finances");
    expect(main).not.toContain("Organizar mis finanzas");
    // The chrome resolved the same way, from the same rule.
    await expect(page.getByRole("navigation").first()).toContainText(/Home|My case/);
  });
});

test.describe("first visit in a Spanish browser", () => {
  test.use({ locale: "es-PR" });

  test("the UI and the seeded case file are both Spanish", async ({ page }) => {
    await firstVisitAsClient(page);

    expect(await page.evaluate(() => localStorage.getItem("freshstart.language"))).toBe("es");
    const main = await page.locator("main").innerText();
    expect(main).toContain("Organizar mis finanzas");
    expect(main).not.toContain("Organize my finances");
    await expect(page.getByRole("navigation").first()).toContainText(/Inicio|Mi caso/);
  });
});

test("attorney home is clean at desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "en", "attorney");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await capture(page, "desktop-en-attorney-home", "en");
});
