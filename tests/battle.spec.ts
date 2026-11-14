import { test, expect } from "@playwright/test";
test("new run, 3D scene, server actions, reload resume, victory reward and abandon record", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.getByLabel("아이디", { exact: true }).fill(`fight${Date.now()}`);
  await page.getByLabel("닉네임").fill("전투원정대");
  await page.getByLabel("비밀번호").fill("battle-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1층 전투", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const respond = page.waitForResponse(
    (r) =>
      r.url().endsWith("/battle-action") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /파쇄권/ }).click();
  const result = await (await respond).json();
  expect(result.run.revision).toBe(1);
  await expect(page.getByRole("list", { name: "전투 기록" })).toContainText(
    "파쇄권",
  );
  await page.screenshot({
    path: "/tmp/loa-battle-landscape.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "도전 이어하기" }).click();
  await expect(
    page.getByText("턴 1 · 저장 REV 1", { exact: false }),
  ).toBeVisible();
  let run = result.run;
  for (let i = 0; i < 10 && run.stage === "battle"; i++) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/battle-action") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /기본 공격/ }).click();
    run = (await (await response).json()).run;
  }
  expect(run.stage).toBe("reward");
  await expect(
    page.getByRole("heading", { name: "1층 클리어 · 보상 1개 선택" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /휴식의 기운/ }).click();
  await expect(
    page.getByRole("heading", { name: "2층 전투", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "도전 포기", exact: true }).click();
  await page.getByRole("button", { name: "포기 확정", exact: true }).click();
  await expect(page.getByText("아크의 결정 +5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "로비로", exact: true }).click();
  await page.getByText("최근 도전 기록 (1)", { exact: true }).click();
  await expect(page.locator(".records")).toContainText("결정 +5");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("2D low graphics mode still supports switching and server-authoritative combat", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("loa-graphics", "2d"));
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await page.getByLabel("아이디", { exact: true }).fill(`low${Date.now()}`);
  await page.getByLabel("닉네임").fill("저사양원정대");
  await page.getByLabel("비밀번호").fill("battle-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await page.getByRole("button", { name: "도전 시작", exact: true }).click();
  await expect(page.locator(".battle-fallback")).toBeVisible();
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/battle-action"),
  );
  await page
    .locator(".battle-party")
    .getByRole("button", { name: /니나브/ })
    .click();
  expect((await (await response).json()).run.battle.activeHero).toBe(1);
  await expect(page.getByRole("list", { name: "전투 기록" })).toContainText(
    "자발적 교체",
  );
});
