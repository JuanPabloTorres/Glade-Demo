import { expect, test, type Page } from "@playwright/test";

/**
 * Two gates the suite did not have: the sidebar's collapse toggle, and the
 * login form's geometry.
 *
 * Everything adjacent to these is already covered elsewhere and is deliberately
 * not repeated here. `responsive-overflow.spec.ts` gates horizontal overflow
 * across nine widths including 320 and 390; `shell-overlays-language.spec.ts`
 * gates the sidebar staying pinned on a long page, the mobile shell contract,
 * overlay stacking and the absence of cross-language residue. What neither
 * asserts is that the collapse control *does* anything, or that a phone user can
 * reach the sign-in button without scrolling.
 */

const GOVERNED_WIDTHS = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

/** `frontend/CLAUDE.md`'s desktop breakpoint: below this the sidebar is absent. */
const DESKTOP = { width: 1440, height: 900 };

async function signIn(page: Page, role: "cliente" | "abogado" = "cliente") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Entrar como ${role}` }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"));
}

/**
 * The sidebar animates its width, so a box measured immediately after the click
 * is the *old* width mid-transition — which is how the first version of these
 * tests reported 241px for a rail that settles at 80px. Poll until it stops
 * moving rather than sleeping a guessed interval.
 */
async function settledWidth(page: Page, selector: string): Promise<number> {
  let previous = -1;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const width = (await page.locator(selector).first().boundingBox())?.width ?? 0;
    if (Math.abs(width - previous) < 0.5) return width;
    previous = width;
    await page.waitForTimeout(60);
  }
  return previous;
}

test.describe("the sidebar collapse control does something", () => {
  test.use({ viewport: DESKTOP });

  test("collapsing narrows the rail and expanding restores it", async ({ page }) => {
    await signIn(page);

    const expandedWidth = await settledWidth(page, "aside");
    expect(expandedWidth).toBeGreaterThan(120);

    await page.getByRole("button", { name: "Contraer menú lateral" }).click();

    const collapsedWidth = await settledWidth(page, "aside");
    // A rail, not a hidden sidebar: the icons stay reachable.
    expect(collapsedWidth).toBeGreaterThan(0);
    expect(collapsedWidth).toBeLessThan(expandedWidth);

    await page.getByRole("button", { name: "Expandir menú lateral" }).click();
    expect(await settledWidth(page, "aside")).toBeCloseTo(expandedWidth, 0);
  });

  test("the main content takes the width the collapsed rail gives back", async ({ page }) => {
    await signIn(page);

    const before = await settledWidth(page, "main");

    await page.getByRole("button", { name: "Contraer menú lateral" }).click();

    // The reason to collapse at all. A toggle that narrows the rail without
    // widening the content is a control with no effect.
    expect(await settledWidth(page, "main")).toBeGreaterThan(before);
  });

  test("every navigation entry keeps an accessible name while collapsed", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Contraer menú lateral" }).click();

    const links = page.locator("aside a");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      const label = (await link.getAttribute("aria-label")) ?? (await link.innerText());
      expect(label.trim(), `sidebar link ${index} lost its name when collapsed`).not.toBe("");
    }
  });

  test("the choice survives a reload", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Contraer menú lateral" }).click();
    const collapsedWidth = await settledWidth(page, "aside");

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Persisted in localStorage; a preference that resets on every navigation
    // is worse than no preference.
    expect(await settledWidth(page, "aside")).toBeCloseTo(collapsedWidth, 0);
    await expect(page.getByRole("button", { name: "Expandir menú lateral" })).toBeVisible();
  });
});

test.describe("the login form is usable without scrolling", () => {
  for (const viewport of GOVERNED_WIDTHS) {
    test(`sign-in is reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const email = page.locator("#login-email");
      const password = page.locator("#login-password");
      const submit = page.getByRole("button", { name: /Abrir portal/ });

      // Geometry, not pixels: every control a person needs in order to sign in
      // has to be inside the first screen. Asserted against bounding boxes so a
      // layout change that keeps the form usable does not fail the gate.
      for (const [name, locator] of [
        ["email", email],
        ["password", password],
        ["submit", submit],
      ] as const) {
        const box = await locator.boundingBox();
        expect(box, `${name} has no layout box at ${viewport.width}px`).not.toBeNull();
        expect(
          box!.y + box!.height,
          `${name} sits below the fold at ${viewport.width}x${viewport.height}`,
        ).toBeLessThanOrEqual(viewport.height);
      }
    });

    test(`the card stays inside the viewport at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // `main` is `overflow-hidden`, so a card wider than the screen is clipped
      // rather than scrollable — the symptom that hid a 47px overhang at 320px
      // until it was measured directly.
      const card = page.locator("form").first();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x, `card starts off-screen at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(
        box!.x + box!.width,
        `card overhangs the right edge at ${viewport.width}px`,
      ).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test("the same holds in English", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    // The switcher names its destination, not its current state — the same
    // locator shell-overlays-language.spec.ts uses.
    await page.getByRole("button", { name: /Cambiar a English|Switch to English/ }).click();
    await page.waitForLoadState("networkidle");

    const submit = page.getByRole("button", { name: /Open portal/i });
    const box = await submit.boundingBox();
    expect(box, "the English submit button has no layout box").not.toBeNull();
    expect(box!.y + box!.height, "English pushes sign-in below the fold").toBeLessThanOrEqual(844);
  });
});
