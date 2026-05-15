import { test, expect } from "@playwright/test";

test.describe("Authentication & navigation smoke", () => {
  test("redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Cafe HR/i }).first()).toBeVisible();
  });

  test("rejects invalid credentials with error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@cafe.vn");
    await page.getByLabel("Mật khẩu").fill("wrong");
    await page.getByRole("button", { name: /Đăng nhập/ }).click();
    await expect(page.getByText(/không đúng/i)).toBeVisible();
  });

  test("logs in with default admin and reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    // Defaults are pre-filled to admin@cafe.vn / admin
    await page.getByRole("button", { name: /Đăng nhập/ }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Quản lý nhân sự/i })).toBeVisible();
  });

  test("can navigate to employees after login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Đăng nhập/ }).click();
    await page.waitForURL("/");
    await page.goto("/employees");
    await expect(
      page.getByRole("heading", { name: /Danh sách/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("health endpoint is publicly accessible", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("database");
  });
});
