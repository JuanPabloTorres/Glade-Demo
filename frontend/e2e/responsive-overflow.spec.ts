import { expect, test, type Page } from "@playwright/test";

/**
 * Responsive regression gate for the whole authenticated product.
 *
 * `index.css` clips horizontal overflow at the document level, which is the
 * right behaviour for off-canvas overlays but also *hides the symptom* of a
 * too-wide layout — the pre-existing mobile assertion (`bodyBox.width <= 390`
 * in matter-workflow.spec.ts) passed no matter how far content spilled,
 * because the clip guaranteed it.
 *
 * So this spec does not measure `scrollWidth`. It measures the widest right
 * edge reached by any laid-out element and asserts it fits the viewport,
 * naming the offending nodes when it does not — so the fix lands on the
 * component that owns the size rather than on the page where the symptom
 * happened to be noticed.
 *
 * Deliberately excluded from the measurement:
 *  - subtrees inside an `overflow-x: auto|scroll|hidden` ancestor, which are
 *    allowed to be wider than the screen (that is what a scroll strip is);
 *  - off-canvas overlays — a `position: fixed` subtree carrying a transform,
 *    i.e. a closed Flowbite Drawer parked at `translate-x-full`. An *open*
 *    drawer has no transform and is measured like anything else.
 *
 * Widths are the ones in the responsive audit brief: the common phone widths
 * plus the tablet/desktop steps `frontend/CLAUDE.md` already mandates.
 */
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1440] as const;

/** Sub-pixel layout noise; anything wider than this is a real spill. */
const TOLERANCE = 1;

interface Offender {
  tag: string;
  className: string;
  text: string;
  right: number;
  width: number;
}

/** The widest right edge in the layout, plus the nodes that reach it. */
async function measureOverflow(page: Page): Promise<{ widest: number; offenders: Offender[] }> {
  return page.evaluate((tolerance) => {
    const viewport = document.documentElement.clientWidth;
    const offenders: Offender[] = [];
    let widest = viewport;

    const clipsHorizontally = (element: Element) => {
      const overflowX = getComputedStyle(element).overflowX;
      return overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden" || overflowX === "clip";
    };

    const isMeasurable = (element: Element) => {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return !element.closest('[role="tooltip"]');
    };

    /**
     * A closed off-canvas overlay: a fixed subtree pushed away by a transform.
     * Tailwind v4 emits `translate-x-full` as the standalone `translate`
     * property, not `transform`, so both have to be checked — reading only
     * `transform` reports every closed Drawer as an overflow offender.
     */
    const isOffCanvas = (element: Element) => {
      let node: Element | null = element;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        const shifted = style.transform !== "none" || (style.translate !== "none" && style.translate !== "");
        if (style.position === "fixed" && shifted) return true;
        node = node.parentElement;
      }
      return false;
    };

    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      if (!isMeasurable(element) || isOffCanvas(element)) continue;

      // Inside a scroll/clip container: its width is contained by design.
      // The walk stops *below* <body>, because the document-level clip in
      // index.css is precisely the mask this spec exists to see through.
      let ancestor = element.parentElement;
      let contained = false;
      while (ancestor && ancestor !== document.body) {
        if (clipsHorizontally(ancestor)) {
          contained = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (contained) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      widest = Math.max(widest, rect.right);
      if (rect.right <= viewport + tolerance) continue;

      // Only report the outermost node of an offending subtree.
      const parent = element.parentElement;
      if (parent && parent !== document.body && parent.getBoundingClientRect().right > viewport + tolerance) continue;

      offenders.push({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className.slice(0, 200) : "",
        text: (element.textContent ?? "").trim().slice(0, 80),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    return { widest: Math.round(widest), offenders };
  }, TOLERANCE);
}

async function expectNoHorizontalOverflow(page: Page, label: string, width: number) {
  const { widest, offenders } = await measureOverflow(page);

  expect(
    widest,
    `${label} @ ${width}px overflows by ${widest - width}px. Offenders:\n${
      offenders
        .map((offender) => `  <${offender.tag} class="${offender.className}"> w=${offender.width} right=${offender.right} — ${offender.text}`)
        .join("\n") || "  (none isolated — check a clipped ancestor)"
    }`,
  ).toBeLessThanOrEqual(width + TOLERANCE);
}

async function loginAs(page: Page, role: "cliente" | "abogado") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Entrar como ${role}` }).click();
}

test.describe("no horizontal overflow across the responsive range", () => {
  for (const width of WIDTHS) {
    test(`login page @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Entrar como cliente" })).toBeVisible();
      await expectNoHorizontalOverflow(page, "login", width);
    });

    test(`client journey @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, "cliente");

      await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();
      await expectNoHorizontalOverflow(page, "client home", width);

      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      await expect(page.getByTestId("completion-score")).toBeVisible();
      await expectNoHorizontalOverflow(page, "case workspace", width);

      // Every stage, because each renders a different composition of cards,
      // tables and forms — a shell that fits says nothing about the stage
      // content inside it.
      const stages = ["Ingresos", "Gastos", "Deudas", "Bienes", "Documentos", "Revisión", "Seguimiento"];
      let measuredStages = 0;
      for (const stage of stages) {
        const button = page.getByRole("button", { name: new RegExp(stage) }).first();
        if (!(await button.count())) continue;
        await button.click();
        await expectNoHorizontalOverflow(page, `case stage ${stage}`, width);
        measuredStages += 1;
      }
      // Without this the loop above would report success by skipping — a
      // renamed stage label would silently turn the widest part of the audit
      // into a no-op.
      expect(measuredStages, "stage navigation labels changed; the stage sweep measured nothing").toBe(stages.length);

      // The entry modal is a separate overlay with its own width rules.
      await page.getByRole("button", { name: /Documentos/ }).first().click();
      await page.getByRole("button", { name: "Añadir evidencia" }).click();
      await expect(page.getByLabel("Tipo de evidencia")).toBeVisible();
      await expectNoHorizontalOverflow(page, "entry modal", width);
      await page.getByRole("button", { name: "Cancelar" }).click();

      // The assistant is a route now, not a floating button and a drawer, so
      // it is measured as a page like any other.
      await page.goto("/assistant");
      await expect(page.getByLabel("Mensaje")).toBeVisible();
      await expectNoHorizontalOverflow(page, "assistant page", width);
    });

    test(`attorney journey @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, "abogado");

      await expect(
        page.getByRole("heading", { name: "Revisa solicitudes financieras antes de la consulta." }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page, "attorney inbox", width);

      await page.getByRole("button", { name: "Ver", exact: true }).first().click();
      await expect(page.getByTestId("completion-score")).toBeVisible();
      await expectNoHorizontalOverflow(page, "attorney case workspace", width);

      // CaseActionBar's modals carry the densest footers in the product — two
      // labelled, icon-bearing buttons in one row — so they are where a modal
      // stops fitting first.
      // These modals are not `dismissible`, so they close through their own
      // footer control rather than Escape — leaving one open would hide the
      // next trigger behind the backdrop.
      for (const [trigger, confirm, dismiss] of [
        ["Solicitar documento", "Solicitar", "Cancelar"],
        ["Añadir nota", "Guardar", "Cancelar"],
        ["Generar resumen", "Guardar en notas", "Cerrar"],
      ] as const) {
        await page.getByRole("button", { name: trigger }).first().click();
        await expect(page.getByRole("button", { name: confirm, exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page, `attorney modal "${trigger}"`, width);
        await page.getByRole("button", { name: dismiss, exact: true }).click();
        await expect(page.getByRole("button", { name: confirm, exact: true })).toBeHidden();
      }
    });

    test(`static pages @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, "cliente");

      await page.goto("/about");
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page, "about", width);

      await page.goto("/help");
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page, "help", width);
    });
  }
});

/**
 * The rest of the responsive contract, which fitting the viewport does not
 * prove: that the shell actually *uses* the small screen (no hidden sidebar
 * still reserving a column), that the mobile chrome is reachable by thumb,
 * and that the two navigation surfaces never appear at once.
 */
/**
 * The bottom bar, isolated from the sidebar.
 *
 * Both surfaces expose a `navigation` landmark under the same accessible name,
 * which is correct — they are the same navigation, and only ever one of them is
 * in the accessibility tree at a time (`md:hidden` on one, `hidden md:flex` on
 * the other). But `getByRole` searches the whole DOM, so at desktop the name
 * resolves to the sidebar's `<nav>` and an assertion about the bottom bar
 * silently measures the wrong element. The sidebar's lives inside `<aside>`;
 * this one does not.
 */
const BOTTOM_NAV = "nav[aria-label='Navegación principal']:not(aside nav)";

test.describe("mobile shell contract", () => {
  const MOBILE = 390;
  const DESKTOP = 1024;
  /** WCAG 2.5.5 target size; the design system uses 56px (`min-h-14`). */
  const MIN_TAP_TARGET = 44;

  test(`below md the sidebar reserves no width and main uses the screen`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE, height: 900 });
    await loginAs(page, "cliente");
    await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();

    // The sidebar is `hidden md:block`, so it must contribute no layout box.
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();
    expect(await sidebar.evaluate((node) => node.getBoundingClientRect().width)).toBe(0);

    // Main starts at the left edge (only its own padding) and spans the width.
    const main = page.getByRole("main");
    const box = await main.boundingBox();
    expect(box?.x, "main is pushed right — something is still reserving a column").toBeLessThanOrEqual(1);
    expect(box?.width, "main does not span the viewport").toBe(MOBILE);
  });

  test(`below md the bottom navigation is the only nav and is thumb-reachable`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE, height: 900 });
    await loginAs(page, "cliente");

    const bottomNav = page.locator(BOTTOM_NAV);
    await expect(bottomNav).toBeVisible();

    const targets = bottomNav.locator("a, button");
    const count = await targets.count();
    expect(count, "bottom navigation rendered no destinations").toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await targets.nth(index).boundingBox();
      expect(box?.height, `bottom nav target ${index} is under the ${MIN_TAP_TARGET}px minimum`).toBeGreaterThanOrEqual(
        MIN_TAP_TARGET,
      );
    }

    // Nothing is trapped underneath it: the shell reserves at least the bar's
    // height as padding. Asserted against the reserved space rather than the
    // footer's position, which depends on how far the page happens to be
    // scrolled.
    const navHeight = (await bottomNav.boundingBox())?.height ?? 0;
    const reserved = await page
      .getByRole("main")
      .evaluate((node) => parseFloat(getComputedStyle(node.parentElement as HTMLElement).paddingBottom));
    expect(reserved, "the shell reserves less space than the bottom bar occupies").toBeGreaterThanOrEqual(navHeight);
  });

  test(`at desktop the sidebar returns and the bottom navigation is gone`, async ({ page }) => {
    await page.setViewportSize({ width: DESKTOP, height: 900 });
    await loginAs(page, "cliente");
    await expect(page.getByRole("heading", { name: "Así va tu expediente." })).toBeVisible();

    await expect(page.locator("aside")).toBeVisible();
    await expect(page.locator(BOTTOM_NAV)).toBeHidden();
  });
});
