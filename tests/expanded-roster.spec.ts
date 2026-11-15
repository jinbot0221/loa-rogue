import { test, expect } from "@playwright/test";
import { enterRoom } from "./ui-helpers";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
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
  await expect(page.locator(".art-pending")).toHaveCount(4);
  const awaiting = page
    .locator(".hero-card")
    .filter({
      has: page.getByRole("heading", { name: "아브렐슈드", exact: true }),
    });
  await expect(awaiting).toContainText("기본 모델");
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

test("five newly supplied heroes load sprites and persist a full-cost party through combat switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.getByLabel("아이디", { exact: true }).fill(`artfive${Date.now()}`);
  await page.getByLabel("닉네임").fill("새 영웅 원정대");
  await page.getByLabel("비밀번호").fill("five-heroes-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await expect(page.locator(".hero-card")).toHaveCount(20);
  const me = (await (await page.request.get("/api/auth/me")).json()).account;
  const ids = ["kadan", "galatur", "delain_arman", "luterra", "valtan"];
  const db = new DatabaseSync(process.env.LOA_E2E_DATABASE!);
  try {
    for (const id of ids)
      db.prepare(
        "UPDATE hero_upgrades SET cost_reduction=? WHERE user_id=? AND hero_id=?",
      ).run(id === "kadan" ? 2 : 1, me.id, id);
  } finally {
    db.close();
  }
  const saved = await page.request.put("/api/party", {
    headers: { Origin: "http://127.0.0.1:3002" },
    data: { actionId: randomUUID(), revision: me.revision, heroIds: ids },
  });
  expect(saved.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".party-slots li")).toHaveCount(5);
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  await enterRoom(page, "battle");
  await expect(
    page.locator('.sd-battle-overlay[data-hero="kadan"] img'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.sd-battle-overlay[data-hero="kadan"] img')
        .evaluate((n) => (n as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "/tmp/loa-kadan-combat.png" });
  for (const [id, name] of [
    ["galatur", "갈라투르"],
    ["delain_arman", "데런 아만"],
    ["luterra", "루테란"],
    ["valtan", "발탄"],
  ]) {
    const changed = page.waitForResponse((r) =>
      r.url().endsWith("/battle-action"),
    );
    await page
      .locator(".battle-party")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    const response = await changed;
    expect(response.status()).toBe(200);
    expect((await response.json()).run.partyCost).toBe(15);
    const art = page.locator(`.sd-battle-overlay[data-hero="${id}"] img`);
    await expect(art).toBeVisible();
    await expect
      .poll(() => art.evaluate((n) => (n as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.locator(".battle-fx")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/loa-valtan-combat.png" });
  const attack = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page.getByRole("button", { name: /마수의 도끼/ }).click();
  const result = (await (await attack).json()).run;
  expect(
    result.battle.logs.some((l: { text: string }) =>
      l.text.includes("마수의 도끼"),
    ),
  ).toBe(true);
});
