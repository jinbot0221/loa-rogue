import { enterRoom } from "./ui-helpers";
import { test, expect, type Page } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { EQUIPMENT_TEMPLATES } from "@loa/shared";
async function start(page: Page, prefix: string) {
  await page.addInitScript(() => localStorage.setItem("loa-graphics", "2d"));
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page
    .getByLabel("아이디", { exact: true })
    .fill(`${prefix}${Date.now()}`);
  await page.getByLabel("닉네임").fill("던전원정대");
  await page.getByLabel("비밀번호").fill("dungeon-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/runs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  const data = await (await response).json();
  return data.run.id as string;
}
function dbUse<T>(fn: (db: DatabaseSync) => T) {
  const db = new DatabaseSync(process.env.LOA_E2E_DATABASE!);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
async function fixtureChoice(page: Page, id: string, type: string) {
  dbUse((db) => {
    const row = db.prepare("SELECT dungeon_json FROM runs WHERE id=?").get(id)!;
    const w = JSON.parse(String(row.dungeon_json));
    w.phase = "choice";
    w.map = undefined;
    w.selected = undefined;
    w.candidates = [
      { id: `ui_${type}`, type },
      { id: "ui_battle", type: "battle" },
      { id: "ui_rest", type: "rest" },
    ];
    db.prepare(
      "UPDATE runs SET dungeon_json=?,stage='battle',gold=500 WHERE id=?",
    ).run(JSON.stringify(w), id);
  });
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
}
function seedGear(runId: string, template: string) {
  const t = EQUIPMENT_TEMPLATES.find((t) => t.id === template)!;
  const id = randomUUID();
  dbUse((db) =>
    db
      .prepare("INSERT INTO run_equipment VALUES (?,?,?,?,?,?,NULL,?)")
      .run(id, runId, t.id, 0, t.slot, JSON.stringify(t.stats), Date.now()),
  );
  return id;
}
test("three saved candidates, treasure item equip/unequip, fixed shop stock and purchase survive refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const id = await start(page, "gear");
  await expect(page.locator(".map-node.reachable")).toHaveCount(3);
  const initial = await page.locator(".route-graph").innerText();
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
  expect(await page.locator(".route-graph").innerText()).toBe(initial);
  await fixtureChoice(page, id, "treasure");
  await enterRoom(page, "treasure");
  await page.getByRole("button", { name: "보물 열기", exact: true }).click();
  await page.getByRole("button", { name: "가방", exact: true }).click();
  await expect(page.locator(".gear-card")).toHaveCount(1);
  await page.getByRole("button", { name: "장착", exact: true }).click();
  await expect(page.locator(".gear-card")).toContainText("장착: 웨이");
  await page.getByRole("button", { name: "장착 해제", exact: true }).click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "다음 층으로" }).click();
  await fixtureChoice(page, id, "shop");
  await enterRoom(page, "shop");
  const offers = await page.locator(".shop-grid").innerText();
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
  expect(await page.locator(".shop-grid").innerText()).toBe(offers);
  await page
    .locator(".shop-grid .event-panel")
    .nth(1)
    .getByRole("button", { name: "구매", exact: true })
    .click();
  await expect(page.locator(".shop-grid .event-panel").nth(1)).toContainText(
    "품절",
  );
  await page.getByRole("button", { name: "가방", exact: true }).click();
  await expect(page.locator(".gear-card")).toHaveCount(2);
  await page.screenshot({
    path: "/tmp/loa-shop-inventory.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("forge selects actual three materials, fuses once and crafts a recipe saved in account book", async ({
  page,
}) => {
  const id = await start(page, "forge");
  const fuseIds = Array.from({ length: 3 }, () => seedGear(id, "hunter_bow"));
  const craftIds = ["bronze_sword", "iron_plate", "ember_ring"].map((t) =>
    seedGear(id, t),
  );
  await fixtureChoice(page, id, "forge");
  await enterRoom(page, "forge");
  await page.getByRole("button", { name: "가방", exact: true }).click();
  for (const itemId of fuseIds)
    await page.getByTestId(`gear-${itemId}`).getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "동급3개 합성 → 다음 등급1개" })
    .click();
  await expect(page.locator(".gear-card")).toHaveCount(4);
  for (const itemId of craftIds)
    await page.getByTestId(`gear-${itemId}`).getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "특수 제작 · 조합법 영구 발견" })
    .click();
  await expect(page.locator(".gear-card")).toHaveCount(2);
  await expect(
    page
      .locator(".gear-card")
      .filter({ has: page.getByRole("heading", { name: "태양의 서약" }) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: /로비로/ }).click();
  await page.getByRole("button", { name: "조합법", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "발견한 조합법" }).locator(".records"),
  ).toContainText("태양의 서약");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "몬스터", exact: true }).click();
  await page
    .getByRole("combobox", { name: "몬스터 분류", exact: true })
    .selectOption("boss");
  await expect(
    page
      .getByRole("dialog", { name: "몬스터 도감" })
      .locator(".monster-grid>.monster-entry"),
  ).toHaveCount(10);
});
test("mystery stays hidden until entry, actual random choice resolves once and survives reconnect", async ({
  page,
}) => {
  const id = await start(page, "rift");
  await fixtureChoice(page, id, "rift");
  await expect(page.locator(".route-graph")).toContainText("???");
  const entry = page.waitForResponse((r) => r.url().endsWith("/select-event"));
  await enterRoom(page, "rift");
  const run = (await (await entry).json()).run;
  expect(run.dungeon.rift).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
  await expect(
    page
      .getByRole("heading", { name: run.dungeon.rift.name, exact: false })
      .first(),
  ).toBeVisible();
  const choice = run.dungeon.rift.choices[0];
  const result = page.waitForResponse((r) =>
    r.url().endsWith("/random-event/choose"),
  );
  await page.getByRole("button", { name: choice.label, exact: true }).click();
  const completed = (await (await result).json()).run;
  expect(completed.dungeon.phase).not.toBe("rift");
});
