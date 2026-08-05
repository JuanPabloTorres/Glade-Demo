import { expect, test } from "@playwright/test";

test("completes intake, document review, and case readiness", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create matter" }).click();

  const modal = page.getByRole("dialog");
  await modal.getByLabel("Client name").fill("Jordan Sample");
  await modal.getByLabel("Email").fill("jordan@example.com");
  await modal.getByLabel("Phone").fill("787-555-0100");
  await modal.getByLabel("Assigned to").fill("A. Rivera");
  await modal.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { name: "Jordan Sample" })).toBeVisible();
  await page.getByLabel("Address").fill("123 Main Street, San Juan, PR");
  await page.getByLabel("Date of birth").fill("1990-05-04");
  await page.getByLabel("Matter summary").fill("Synthetic immigration intake.");
  await page.getByRole("button", { name: "Save canonical intake" }).click();
  await expect(page.getByText("Canonical intake saved.")).toBeVisible();
  await expect(page.getByTestId("matter-status")).toContainText("active");

  await page.getByRole("button", { name: "Process document" }).click();
  await expect(page.getByText("Document processed.")).toBeVisible();

  const nameConflict = page.getByTestId("conflict-display_name");
  const addressConflict = page.getByTestId("conflict-address");
  await expect(nameConflict).toBeVisible();
  await expect(addressConflict).toBeVisible();
  await addressConflict.getByRole("button", { name: "Use document value" }).click();
  await expect(addressConflict).toContainText("resolved");
  await nameConflict.getByRole("button", { name: "Keep canonical value" }).click();
  await expect(nameConflict).toContainText("resolved");

  await expect(page.getByTestId("document-passport.txt")).toContainText("processed");

  await page.getByLabel("File name").fill("utility-bill.txt");
  await page.getByLabel("Document type").selectOption("proof_of_address");
  await page
    .getByLabel("Extractable text")
    .fill("Address: 123 Main St Apt 2, San Juan, PR");
  await page.getByRole("button", { name: "Process document" }).click();

  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByTestId("matter-status")).toContainText("ready for review");
  await expect(page.getByText("ConflictController.resolve_conflict").first()).toBeVisible();
  await expect(page.getByText("true").first()).toBeVisible();
});
