const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const email = `alex.miller+${Date.now()}@example.com.au`;

  // 1. Sign up
  await page.goto("http://localhost:3111/signup", { waitUntil: "networkidle" });
  await page.locator("#name").fill("Alex Miller");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("quote-ready-test-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForTimeout(4000);
  console.log("after signup url:", page.url());
  await page.screenshot({ path: "scripts/flow-after-signup.png" });

  // 2. If onboarding, complete business setup
  if (page.url().includes("/onboarding")) {
    await page.getByRole("button", { name: "Set up my workspace" }).click();
    await page.waitForTimeout(500);
    await page.locator("#ob-name").fill("Alex Miller");
    await page.locator("#ob-business").fill("Miller & Co Plumbing");
    await page.locator("#ob-trade").selectOption("Plumbing");
    await page.locator("#ob-area").fill("Melbourne North, VIC");
    await page.screenshot({ path: "scripts/flow-onboard-business.png" });
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Open my dashboard" }).click();
    await page.waitForLoadState("networkidle");
    console.log("after onboarding url:", page.url());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "scripts/flow-dashboard-signedin.png", fullPage: false });
  }

  // 3. Open alerts popup
  await page.locator('button[aria-label^="Alerts"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/flow-alerts.png" });
  await page.keyboard.press("Escape");
  await page.mouse.click(400, 400);

  // 4. Sign out via settings
  await page.goto("http://localhost:3111/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/flow-settings.png", fullPage: true });

  await browser.close();
  console.log("done");
})();
