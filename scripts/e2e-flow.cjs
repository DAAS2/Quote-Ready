/* Full E2E: Jordan demo flow + drafts + mobile (robust waits) */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 140)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });

  const jid = "c65c0d27-fc68-423b-8a95-017cf5fba71c";
  await page.goto(`http://localhost:3000/jobs/${jid}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Voice demo note → extract → apply
  await page.getByRole("button", { name: "Use demo note" }).click();
  await page.waitForTimeout(500);
  const taValue = await page.locator("#voice_transcript").inputValue();
  console.log("demo note filled:", taValue.length > 40);
  await page.getByRole("button", { name: "Extract update" }).click();
  console.log("waiting for extraction…");
  await page.waitForSelector("text=Extracted update", { timeout: 30000 });
  console.log("preview visible ✓");
  await page.getByRole("button", { name: /Apply update to job/ }).click();
  await page.waitForTimeout(3000);
  console.log("applied — status:", await page.getByText(/site note applied/i).count() > 0 ? "audit event ✓" : "check");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const versionCount = await page.locator("summary").count();
  console.log("version history rows:", versionCount);

  // 2. Draft: open dialog → save as draft
  await page.getByRole("button", { name: /Draft customer follow-up/ }).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  console.log("draft dialog ✓");
  await page.locator('[role="dialog"]').getByRole("button", { name: "Save as draft" }).click();
  await page.waitForTimeout(1200);
  console.log("draft saved (dialog closed):", (await page.locator('[role="dialog"]').count()) === 0);

  // 3. Edit a draft inline
  const editBtn = page.getByRole("button", { name: "Edit" }).first();
  await editBtn.click();
  await page.waitForTimeout(600);
  const editArea = page.locator("textarea[aria-label='Draft message body']").first();
  await editArea.fill("Hi Jordan — revised by the operator during review.");
  await page.getByRole("button", { name: "Save" }).first().click();
  await page.waitForTimeout(1000);
  console.log("draft edited inline ✓");

  // 4. Briefing (text fallback expected — free plan voice)
  await page.getByRole("button", { name: /Brief me before calling/ }).click();
  await page.waitForTimeout(3000);
  console.log("briefing text:", await page.getByText(/percent quote ready/).first().isVisible().catch(() => false));

  // 5. Mobile
  const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await m.goto(`http://localhost:3000/jobs/${jid}`, { waitUntil: "networkidle" });
  await m.waitForTimeout(1200);
  console.log("mobile hscroll:", await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));
  await m.close();

  console.log("errors:", errors.length ? errors.slice(0, 3) : "none");
  await browser.close();
})();