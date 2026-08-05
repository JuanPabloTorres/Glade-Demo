import { expect, test } from "@playwright/test";

test("authenticates and completes the persistent guided review workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to the reviewer workspace" })).toBeVisible();
  await page.getByLabel("Email").fill("reviewer@matterready.app");
  await page.getByLabel("Password").fill("MatterReady!2026");
  await page.getByRole("button", { name: "Open reviewer workspace" }).click();

  await expect(
    page.getByRole("heading", { name: "Turn one incomplete case into a review-ready matter." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open guided example" }).click();

  await expect(page.getByRole("heading", { name: "Elena Rivera" })).toBeVisible();
  await expect(page.getByText("Next action: Review document findings.", { exact: false })).toBeVisible();

  await page.getByRole("tab", { name: "Review decisions" }).click();
  const emailReview = page.getByTestId("conflict-email");
  await expect(emailReview).toBeVisible();
  await emailReview.getByRole("button", { name: "Keep client record" }).click();
  await expect(emailReview).toContainText("Decision recorded");

  await page.getByRole("tab", { name: "Documents" }).click();
  await page.getByLabel("Document name").fill("utility-bill.txt");
  await page.getByLabel("Document type").selectOption("proof_of_address");
  await page
    .getByLabel("Document text")
    .fill("Address: 125 Example Street, Ponce, PR 00730");
  await page.getByRole("button", { name: "Analyze document" }).click();
  await expect(page.getByText("Document analysis completed.")).toBeVisible();

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByTestId("matter-status")).toContainText("Ready for review");
  await expect(page.getByText("Matter ready for professional review.", { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Elena Rivera" })).toBeVisible();
  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByTestId("matter-status")).toContainText("Ready for review");
  await expect(page.getByText("This matter could not be found.")).toHaveCount(0);
});
