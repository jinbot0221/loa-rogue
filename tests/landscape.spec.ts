import { test, expect, type Page, type Locator } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { HEROES } from "@loa/shared";
import { enterRoom } from "./ui-helpers";
async function inside(page: Page, locator: Locator) {
  const size = page.viewportSize()!;
  const boxes = await locator.evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return {
        text: n.textContent,
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.x, b.text ?? "").toBeGreaterThanOrEqual(0);
    expect(b.y, b.text ?? "").toBeGreaterThanOrEqual(0);
    expect(b.right, b.text ?? "").toBeLessThanOrEqual(size.width + 1);
    expect(b.bottom, b.text ?? "").toBeLessThanOrEqual(size.height + 1);
    expect(b.width, b.text ?? "").toBeGreaterThanOrEqual(44);
    expect(b.height, b.text ?? "").toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);
}
test("640x360 and 844x390 keep lobby actions, path selection, five combat actions and six party slots in one viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.getByLabel("아이디", { exact: true }).fill(`screen${Date.now()}`);
  await page.getByLabel("닉네임").fill("가로원정대");
  await page.getByLabel("비밀번호").fill("landscape-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await expect(
    page.getByRole("heading", { name: "원정대 로비" }),
  ).toBeVisible();
  const me = (await (await page.request.get("/api/auth/me")).json()).account;
  const db = new DatabaseSync(process.env.LOA_E2E_DATABASE!);
  try {
    db.prepare("UPDATE hero_upgrades SET cost_reduction=1 WHERE user_id=?").run(
      me.id,
    );
  } finally {
    db.close();
  }
  const saved = await page.request.put("/api/party", {
    headers: { Origin: "http://127.0.0.1:3002" },
    data: {
      actionId: randomUUID(),
      revision: me.revision,
      heroIds: HEROES.slice(0, 6).map((h) => h.id),
    },
  });
  expect(saved.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".party-slots li")).toHaveCount(6);
  const portraits = page.locator(".hero-art img");
  await expect(portraits).toHaveCount(17);
  await expect
    .poll(() =>
      portraits.evaluateAll((nodes) =>
        nodes.every((node) => (node as HTMLImageElement).naturalWidth > 0),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: "/tmp/loa-lobby-640.png", fullPage: true });
  await inside(
    page,
    page.locator(".hero-card:nth-child(-n+6) .hero-info button"),
  );
  await inside(
    page,
    page.getByRole("button", { name: "파티 저장", exact: true }),
  );
  await inside(
    page,
    page.getByRole("button", { name: "도전 시작", exact: true }),
  );
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  await expect(page.locator(".map-node.reachable")).toHaveCount(3);
  await inside(page, page.locator(".map-node.reachable"));
  await inside(
    page,
    page.getByRole("button", { name: "이 방으로 이동", exact: true }),
  );
  await page.screenshot({ path: "/tmp/loa-route-640.png", fullPage: true });
  await enterRoom(page, "battle");
  await expect(page.locator(".scene-wrapper canvas")).toBeVisible();
  for (const viewport of [
    { width: 640, height: 360 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      page.locator(".combat-commands .action-grid>button"),
    ).toHaveCount(5);
    await expect(page.locator(".battle-party button")).toHaveCount(6);
    await inside(page, page.locator(".combat-commands .action-grid>button"));
    await inside(page, page.locator(".battle-party button"));
    await page.screenshot({
      path: `/tmp/loa-combat-${viewport.width}.png`,
      fullPage: true,
    });
  }
  await expect(
    page.locator('.sd-battle-overlay[data-hero="wei"] img'),
  ).toBeVisible();
  const oldTurn = await page.locator(".battle-heading .muted").innerText();
  await page.getByRole("button", { name: "가방", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "장비 가방" })).toBeVisible();
  await expect(page.locator(".inventory-panel")).toContainText(
    "전투/종료 중에는 변경 불가",
  );
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  expect(await page.locator(".battle-heading .muted").innerText()).toBe(
    oldTurn,
  );
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page.getByRole("button", { name: /기본 공격/ }).click();
  expect((await (await response).json()).run.battle.turn).toBe(1);
  for (const [id, name] of [
    ["nineveh", "니나브"],
    ["thirain", "실리안"],
    ["azena_inanna", "아제나"],
    ["balthorr", "바훈투르"],
  ]) {
    const swapped = page.waitForResponse((r) =>
      r.url().endsWith("/battle-action"),
    );
    await page
      .locator(".battle-party")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    expect((await swapped).status()).toBe(200);
    const art = page.locator(`.sd-battle-overlay[data-hero="${id}"] img`);
    await expect(art).toBeVisible();
    await expect
      .poll(() =>
        art.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    if (id === "azena_inanna")
      await page.screenshot({ path: "/tmp/loa-sd-duo.png" });
  }
  const swapped = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page
    .locator(".battle-party")
    .getByRole("button", { name: /샨디/ })
    .click();
  expect((await swapped).status()).toBe(200);
  const shandiArt = page.locator('.sd-battle-overlay[data-hero="shandi"] img');
  await expect(shandiArt).toBeVisible();
  await expect
    .poll(() =>
      shandiArt.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "/tmp/loa-shandi-combat.png" });
  await expect(page.locator(".scene-wrapper canvas")).toBeVisible();
  await page.route("**/art/heroes/wei.webp", (route) => route.abort());
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
  const fallbackSwap = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page
    .locator(".battle-party")
    .getByRole("button", { name: /웨이/ })
    .click();
  expect((await fallbackSwap).status()).toBe(200);
  await expect(page.locator(".sd-battle-overlay")).toHaveCount(0);
  await expect(page.locator(".scene-wrapper canvas")).toBeVisible();
  const fallbackAttack = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page.getByRole("button", { name: /기본 공격/ }).click();
  expect((await fallbackAttack).status()).toBe(200);
});
