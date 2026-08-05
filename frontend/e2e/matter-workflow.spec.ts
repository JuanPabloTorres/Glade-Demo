import { expect, test } from "@playwright/test";

test("builds a review-ready packet through the AI intake copilot", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill("reviewer@matterready.app");
  await page.getByLabel("Password").fill("MatterReady!2026");
  await page.getByRole("button", { name: "Open reviewer workspace" }).click();

  await expect(
    page.getByRole("heading", { name: "Turn a conversation into a review-ready case packet." }),
  ).toBeVisible();

  const composer = page.getByLabel("Message the intake copilot");
  await composer.fill("I need to prepare an immigration intake");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("What is the client's full name?", { exact: true })).toBeVisible();

  for (const answer of ["Elena Rivera", "elena@example.com", "787-555-0142", "Ponce, Puerto Rico"]) {
    await composer.fill(answer);
    await page.getByRole("button", { name: "Send" }).click();
  }

  await page.getByRole("button", { name: "Analyze document" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Document label").fill("passport.txt");
  await dialog.getByLabel("Document text").fill(
    "Name: Elena Rivera\nEmail: old-email@example.com\nPhone: 787-555-0142\nAddress: Ponce, Puerto Rico",
  );
  await dialog.getByRole("button", { name: "Analyze evidence" }).click();

  const issue = page.getByTestId("issue-conflict:email");
  await expect(issue).toBeVisible();
  await issue.getByRole("button", { name: "Use: elena@example.com" }).click();
  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByText("The intake packet is complete.", { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("readiness-score")).toHaveText("100%");
  await expect(page.getByText("Elena Rivera", { exact: true }).first()).toBeVisible();
});
