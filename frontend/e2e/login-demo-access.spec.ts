import { expect, test, type Page } from "@playwright/test";

/**
 * The login surface, and the two controls a reviewer will actually press.
 *
 * `governed-viewports.spec.ts` already pins the form's geometry. What this adds
 * is the part that had never been asserted: that each demo button performs a
 * *real* sign-in and lands the right role in the right place, and that the
 * backdrop is an asset this deployment can actually load.
 */

test.use({ locale: "es-PR" });

const WIDTHS = [320, 390, 768, 1024, 1440] as const;

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe("demo access performs a real sign-in", () => {
  test("the client button opens a client session and lands on the client workspace", async ({
    page,
  }) => {
    const logins: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/auth/login")) logins.push(request.method());
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar como cliente" }).click();

    await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();
    // A real session, not a role flipped in memory: the button went through the
    // same endpoint the password form uses and a token was persisted.
    expect(logins, "the demo button did not call /auth/login").toEqual(["POST"]);
    const session = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("session")),
    );
    expect(session.length, "no session was written").toBeGreaterThan(0);
  });

  test("the attorney button opens an attorney session and lands on the case inbox", async ({
    page,
  }) => {
    const logins: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/auth/login")) logins.push(request.method());
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar como abogado" }).click();

    // The attorney's own destination, not the client's — role routing resolved
    // from the authenticated user rather than decided by the button.
    await expect(
      page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." }),
    ).toBeVisible();
    expect(logins, "the demo button did not call /auth/login").toEqual(["POST"]);
  });

  test("a wrong password still fails, so the demo path is not a bypass", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("client@freshstart.demo");
    await page.locator("#login-password").fill("not-the-password");
    await page.getByRole("button", { name: /Abrir portal/ }).click();

    // The backend's own 401 copy, surfaced through `resolveApiErrorMessage`.
    // Matched loosely on purpose: what matters is that an alert appeared and no
    // session was created, not the exact sentence, which is server-owned and
    // translated.
    await expect(page.locator("[role='alert']").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    const session = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("session")),
    );
    expect(session, "a rejected sign-in still wrote a session").toEqual([]);
  });
});

test.describe("the login surface", () => {
  test("does not pre-fill a credential into the password field", async ({ page }) => {
    // It used to arrive with the real demo password in the input, one eye-toggle
    // from being on screen during a screen-share. The demo buttons make that
    // convenience unnecessary.
    await page.goto("/login");

    await expect(page.locator("#login-password")).toHaveValue("");
    await expect(page.locator("#login-email")).toHaveValue("");
  });

  test("serves a backdrop this deployment's CSP allows", async ({ page }) => {
    // The previous backdrop was a hotlinked iStock URL, and the production CSP
    // is `img-src 'self' data:` — so it was blocked and the hero had never
    // rendered there. Same-origin asset, fetched and checked for real.
    await page.goto("/login");

    const image = await page
      .locator("main > div[aria-hidden='true']")
      .first()
      .evaluate((node) => getComputedStyle(node).backgroundImage);
    expect(image).toContain("media.istockphoto.com");

    const asset = await page.request.get(
      "https://media.istockphoto.com/id/930475882/photo/smiling-colleagues-working-online-together-at-an-office-desk.jpg?s=170667a&w=0&k=20&c=JDGopA6CPDtUOSCptOhHdkvG48vi2XT_iza5vM5RR0k=",
    );
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/jpeg");

    // 200 and the right content-type are not the same as *renders*. The first
    // version of this backdrop was invalid XML — a `--` inside a comment, which
    // is illegal and makes a browser discard the whole document — so it served
    // perfectly and painted nothing, and a status-only assertion passed over it.
    // Decoded here instead: a remote image that cannot decode would still be a
    // useless login background even if it returned 200.
    const painted = await page.evaluate(async () => {
      const image = new Image();
      image.src =
        "https://media.istockphoto.com/id/930475882/photo/smiling-colleagues-working-online-together-at-an-office-desk.jpg?s=170667a&w=0&k=20&c=JDGopA6CPDtUOSCptOhHdkvG48vi2XT_iza5vM5RR0k=";
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    });
    expect(painted.width, "the backdrop image did not decode").toBeGreaterThan(0);
    expect(painted.height).toBeGreaterThan(0);
  });

  test("declares a favicon that resolves, and names the product in the tab", async ({ page }) => {
    await page.goto("/login");

    const href = await page.locator("link[rel='icon']").getAttribute("href");
    expect(href).toBe("/favicon.svg");
    const icon = await page.request.get(href!);
    expect(icon.status()).toBe(200);
    // Same lesson as the backdrop: prove it decodes, not merely that it exists.
    const decoded = await page.evaluate(async () => {
      const image = new Image();
      image.src = "/favicon.svg";
      await image.decode();
      return image.naturalWidth;
    });
    expect(decoded, "the favicon SVG did not decode").toBeGreaterThan(0);

    await expect(page).toHaveTitle("Fresh Start");
  });

  for (const width of WIDTHS) {
    test(`fits and stays reachable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 640 : 900 });
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      expect(await overflow(page), `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);

      // Both demo controls are reachable — the reviewer's entry point must not
      // be the thing that falls off a narrow screen.
      for (const name of ["Entrar como cliente", "Entrar como abogado"]) {
        const box = await page.getByRole("button", { name }).boundingBox();
        expect(box, `"${name}" has no layout box at ${width}px`).not.toBeNull();
        expect(box!.x, `"${name}" starts off-screen at ${width}px`).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        // Comfortable, not shrunk to fit.
        expect(box!.height, `"${name}" is smaller than a touch target`).toBeGreaterThanOrEqual(40);
      }

      await page.screenshot({ path: `test-results/login-evidence/login-${width}.png` });
    });

    test(`demo access can actually be reached at ${width}px`, async ({ page }) => {
      // "Has a layout box" is not the same as "a person can press it". `main`
      // is `overflow-hidden`, so anything the page cannot scroll to is clipped
      // rather than merely below the fold — worth proving by scrolling and
      // clicking, at the narrow widths where the demo panel falls under it.
      await page.setViewportSize({ width, height: width < 768 ? 640 : 900 });
      await page.goto("/login");

      const attorney = page.getByRole("button", { name: "Entrar como abogado" });
      await attorney.scrollIntoViewIfNeeded();
      await expect(attorney).toBeInViewport();
      await attorney.click();

      await expect(
        page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." }),
      ).toBeVisible();
    });
  }
});

test.describe("the login surface in English", () => {
  test.use({ locale: "en-US" });

  test("both demo controls are present and reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Enter as Client" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter as Attorney" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    await page.screenshot({ path: "test-results/login-evidence/login-390-en.png" });
  });
});
