import { test, expect } from "@playwright/test";
test("signup, party validation and ordering, reload recovery, logout and login on mobile landscape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "여정을 준비하세요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  const username = `p${Date.now()}`;
  await page.getByLabel("아이디", { exact: true }).fill(username);
  await page.getByLabel("닉네임").fill("브라우저원정대");
  await page.getByLabel("비밀번호").fill("browser-secure-password");
  await page.getByRole("button", { name: "회원가입 →" }).click();
  await expect(
    page.getByRole("heading", { name: "원정대 로비" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "파티 저장", exact: true }),
  ).toBeDisabled();
  const cards = page.locator(".hero-card");
  await cards
    .filter({ has: page.getByRole("heading", { name: "샨디", exact: true }) })
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("button", { name: "파티 저장", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".validation")).toContainText("15");
  await cards
    .filter({ has: page.getByRole("heading", { name: "샨디", exact: true }) })
    .getByRole("button")
    .click();
  await cards
    .filter({ has: page.getByRole("heading", { name: "니나브", exact: true }) })
    .getByRole("button")
    .click();
  await page
    .getByRole("button", { name: "바훈투르 앞으로", exact: true })
    .click();
  await page
    .getByRole("button", { name: "바훈투르 앞으로", exact: true })
    .click();
  await page.getByRole("button", { name: "파티 저장", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "파티 편성을 서버에 저장했습니다." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".party-slots li").first()).toContainText(
    "바훈투르",
  );
  await expect(page.locator(".party-slots li")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/loa-phase1-landscape.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "영웅 도감" }).click();
  await expect(page.getByText("기본 코스트 3 · 최소 1").first()).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(
    page.getByRole("heading", { name: "여정을 준비하세요" }),
  ).toBeVisible();
  await page.getByLabel("아이디", { exact: true }).fill(username);
  await page.getByLabel("비밀번호").fill("browser-secure-password");
  await page.getByRole("button", { name: "로비 입장 →" }).click();
  await expect(
    page.getByRole("heading", { name: "원정대 로비" }),
  ).toBeVisible();
  await expect(page.locator(".party-slots li").first()).toContainText(
    "바훈투르",
  );
  expect(errors).toEqual([]);
});
test("portrait form stays usable with rotation guidance and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByText("가로 화면에서 더 넓게 플레이할 수 있습니다.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "로비 입장 →" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
