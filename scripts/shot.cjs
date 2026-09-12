const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(process.argv[2] || "http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: process.argv[3] || "scripts/shot.png", fullPage: true });
  console.log("saved", process.argv[3] || "scripts/shot.png");
  await browser.close();
})();
