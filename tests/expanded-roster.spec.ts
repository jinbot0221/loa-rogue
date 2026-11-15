import { test, expect } from "@playwright/test";
import { enterRoom } from "./ui-helpers";
test("20 heroes stay selectable on landscape; added SD heroes save, switch and use server skills", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.getByLabel("아이디", { exact: true }).fill(`roster${Date.now()}`);
  await page.getByLabel("닉네임").fill("확장 원정대");
  await page.getByLabel("비밀번호").fill("expanded-roster-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await expect(page.locator(".hero-card")).toHaveCount(20);
  await expect(page.locator(".art-pending")).toHaveCount(9);
  const kadan = page
    .locator(".hero-card")
    .filter({ has: page.getByRole("heading", { name: "카단", exact: true }) });
  await expect(kadan).toContainText("기본 모델");
  while (await page.locator(".hero-card.selected").count())
    await page.locator(".hero-card.selected button").first().click();
  for (const name of ["에키드나", "카멘", "쿠크세이튼"]) {
    const card = page
      .locator(".hero-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await card.getByRole("button").click();
    await expect(card.locator("img")).toBeVisible();
  }
  const save = page.waitForResponse(
    (r) => r.url().endsWith("/api/party") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "파티 저장", exact: true }).click();
  expect((await save).status()).toBe(200);
  await page.screenshot({ path: "/tmp/loa-expanded-roster.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".party-slots")).toContainText("쿠크세이튼");
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  await enterRoom(page, "battle");
  const art = page.locator('.sd-battle-overlay[data-hero="echidna"] img');
  await expect(art).toBeVisible();
  await expect
    .poll(() => art.evaluate((n) => (n as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const skill = page.waitForResponse((r) => r.url().endsWith("/battle-action"));
  await page.getByRole("button", { name: /가시의 입맞춤/ }).click();
  const run = (await (await skill).json()).run;
  expect(
    run.battle.logs.some((l: { text: string }) =>
      l.text.includes("가시의 입맞춤"),
    ),
  ).toBe(true);
  for (const [id, name] of [
    ["kamen", "카멘"],
    ["kakul_saydon", "쿠크세이튼"],
  ]) {
    const swapped = page.waitForResponse((r) =>
      r.url().endsWith("/battle-action"),
    );
    await page
      .locator(".battle-party")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    expect((await swapped).status()).toBe(200);
    await expect(
      page.locator(`.sd-battle-overlay[data-hero="${id}"] img`),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(`.sd-battle-overlay[data-hero="${id}"] img`)
          .evaluate((n) => (n as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await expect(page.locator(".battle-fx")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/loa-kakul-combat.png" });
});
