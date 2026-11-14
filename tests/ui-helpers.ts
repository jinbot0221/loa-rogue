import { expect, type Page } from "@playwright/test";
export async function enterRoom(page: Page, type: string) {
  await page.locator(`.map-node.reachable.${type}`).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/select-event") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "이 방으로 이동", exact: true })
    .click();
  expect((await response).status()).toBe(200);
}
