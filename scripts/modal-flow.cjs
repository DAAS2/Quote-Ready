const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // find Jordan's job from the dashboard
  await page.goto("http://localhost:3111/dashboard", { waitUntil: "networkidle" });
  await page.getByPlaceholder("Filter by customer, phone or fixture...").fill("Jordan Lee");
  await page.waitForTimeout(600);
  const link = page.locator('a[href^="/jobs/"]:has-text("Review scope")').first();
  await link.click();
  await page.waitForLoadState("networkidle");
  console.log("job url:", page.url());

  // Open record site note modal
  await page.getByRole("button", { name: "Record site note" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "scripts/new-modal-note.png" });

  // Type the transcript → preview extraction
  await page.locator("#transcript-input").fill(
    "I inspected Jordan's bathroom tap. It is a corroded mixer. The isolation valve is accessible, but the cabinet base is damp. I cannot rule out a concealed leak, so book an inspection before providing a fixed price."
  );
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "scripts/new-modal-note-preview.png" });

  // Apply
  await page.getByRole("button", { name: "Apply update to job" }).click();
  await page.waitForURL(/applied=1/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  console.log("after apply:", page.url());
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "scripts/new-detail-v2.png", fullPage: true });

  // Open follow-up modal
  await page.getByRole("button", { name: /Review inspection message|Review follow-up/ }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scripts/new-modal-followup.png" });

  await browser.close();
  console.log("done");
})();
