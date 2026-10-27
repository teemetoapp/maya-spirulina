import { test, expect, type Page } from "@playwright/test";

// The main revenue path: a logged-in customer buys a pack, pays on the
// test gateway, sees the order in «سفارش‌های من», and staff ship it.

async function loginAs(page: Page, role: string) {
  // /api/auth/dev-switch exists only outside production
  await page.goto(`/api/auth/dev-switch?role=${role}`);
  await expect(page).toHaveURL(/\/portal\//);
}

test("customer buys a pack and staff ship it", async ({ page }) => {
  await loginAs(page, "customer");

  // 1. Choose the default pack on the home page and go to checkout
  await page.goto("/");
  await page.getByRole("button", { name: "افزودن به سبد خرید" }).first().click();
  await page.getByRole("link", { name: "ادامه فرآیند خرید و تسویه" }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 2. Shipping form (prices come from the server-side quote)
  await page.locator('input[name="recipientName"]').fill("مشتری آزمایشی");
  await page.locator('input[name="recipientPhone"]').fill("09123456789");
  await page.locator("textarea[name=\"address\"]").fill("تهران، خیابان آزمایش، پلاک ۱");
  await page.locator('input[name="postalCode"]').fill("1234567890");
  await page.locator('button[type="submit"]').click();

  // 3. Test gateway → pay
  await expect(page).toHaveURL(/\/checkout\/gateway/);
  await page.getByRole("button", { name: "پرداخت موفق" }).click();

  // 4. Success page shows the order number
  await expect(page).toHaveURL(/\/checkout\/success/);
  const orderNumber = new URL(page.url()).searchParams.get("order");
  expect(orderNumber).toMatch(/^ORD-\d{6}-\d{4}$/);
  await expect(page.getByText(orderNumber!).first()).toBeVisible();

  // 5. The order is in «سفارش‌های من» as paid
  await page.goto("/portal/my-orders");
  const card = page.locator(".studio-card", { hasText: orderNumber! });
  await expect(card).toBeVisible();
  await expect(card.getByText("پرداخت شده")).toBeVisible();

  // 6. Warehouse ships it with a tracking code
  await page.context().clearCookies();
  await loginAs(page, "warehouse");
  await page.goto("/portal/orders?tab=shipping");
  const row = page.locator("tr", { hasText: orderNumber! });
  await row.locator("input").fill("123456789012345678901234");
  await row.getByRole("button", { name: "ثبت ارسال" }).click();
  await expect(page.getByText("وضعیت سفارش تغییر کرد.")).toBeVisible();

  // 7. Customer sees the tracking code
  await page.context().clearCookies();
  await loginAs(page, "customer");
  await page.goto("/portal/my-orders");
  await expect(page.locator(".studio-card", { hasText: orderNumber! }).getByText("123456789012345678901234")).toBeVisible();
});

test("price tampering is ignored: the server quote decides the amount", async ({ request }) => {
  const res = await request.post("/api/checkout/quote", {
    data: { items: [{ sku: "MAYA-TAB-120", quantity: 1, price: 1 }] },
  });
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.quote.subtotal).toBeGreaterThan(1000);
});

test("a customer cannot open staff sections", async ({ page }) => {
  await loginAs(page, "customer");
  await page.goto("/portal/orders");
  await expect(page).not.toHaveURL(/\/portal\/orders/);
  const api = await page.request.patch("/api/admin/settings", { data: { values: { SHIPPING_FEE_POST: "1" } } });
  expect(api.status()).toBe(403);
});
