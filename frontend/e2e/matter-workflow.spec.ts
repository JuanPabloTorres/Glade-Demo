import { expect, test } from "@playwright/test";

test("authenticates and completes the human-reviewed matter workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to the reviewer workspace" })).toBeVisible();
  await page.getByLabel("Email").fill("reviewer@matterready.app");
  await page.getByLabel("Password").fill("MatterReady!2026");
  await page.getByRole("button", { name: "Open reviewer workspace" }).click();

  await expect(page.getByRole("heading", { name: "Prepare a matter for professional review." })).toBeVisible();
  await page.getByRole("button", { name: "Start a matter" }).first().click();

  const modal = page.getByRole("dialog");
  await modal.getByLabel("Client or matter name").fill("Jordan Sample");
  await modal.getByLabel("Email").fill("jordan@example.com");
  await modal.getByLabel("Phone").fill("787-555-0100");
  await modal.getByLabel("Assigned professional").fill("A. Rivera");
  await modal.getByRole("button", { name: "Create matter and continue" }).click();

  await expect(page.getByRole("heading", { name: "Jordan Sample" })).toBeVisible();
  await page.getByRole("tab", { name: "Client intake" }).click();
  await page.getByLabel("Address").fill("123 Main Street, San Juan, PR");
  await page.getByLabel("Date of birth").fill("1990-05-04");
  await page.getByLabel("Matter summary").fill("Immigration intake prepared for review.");
  await page.getByRole("button", { name: "Save client information" }).click();
  await expect(page.getByText("Client information saved.")).toBeVisible();
  await expect(page.getByTestId("matter-status")).toContainText("In progress");

  await page.getByRole("tab", { name: "Documents" }).click();
  await page.getByLabel("Document name").fill("passport.txt");
  await page.getByLabel("Document type").selectOption("identity");
  await page.getByLabel("Document text").fill("Name: Jordan A. Sample\nDOB: 1990-05-04\nAddress: 123 Main St Apt 2, San Juan, PR");
  await page.getByRole("button", { name: "Analyze document" }).click();
  await expect(page.getByText("Document analysis completed.")).toBeVisible();

  await page.getByRole("tab", { name: "Review decisions" }).click();
  const nameReview = page.getByTestId("conflict-display_name");
  const addressReview = page.getByTestId("conflict-address");
  await expect(nameReview).toBeVisible();
  await expect(addressReview).toBeVisible();
  await addressReview.getByRole("button", { name: "Accept document value" }).click();
  await expect(addressReview).toContainText("Decision recorded");
  await nameReview.getByRole("button", { name: "Keep client record" }).click();
  await expect(nameReview).toContainText("Decision recorded");

  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.getByTestId("document-passport.txt")).toContainText("Analyzed");
  await page.getByLabel("Document name").fill("utility-bill.txt");
  await page.getByLabel("Document type").selectOption("proof_of_address");
  await page.getByLabel("Document text").fill("Address: 123 Main St Apt 2, San Juan, PR");
  await page.getByRole("button", { name: "Analyze document" }).click();

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByTestId("matter-status")).toContainText("Ready for review");
  await expect(page.getByText("Matter ready for professional review.", { exact: false })).toBeVisible();
  await expect(page.getByText("ConflictController.resolve_conflict")).toHaveCount(0);
});
