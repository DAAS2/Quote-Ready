const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    { name: "mobile-375", width: 375, height: 812 },
    { name: "tablet-768", width: 768, height: 1024 },
  ];
  const urls = ["http://localhost:3000/dashboard", process.argv[2] || "http://localhost:3000/"];
  for (const url of urls) {
    for (const s of sizes) {
      const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      // horizontal scroll check
      const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      const label = `${url.split("//")[1].split("/")[0]}${url.split("//")[1].replace(/^[^/]*\/?/, "").replace(/\//g, "_") || "/"}-${s.name}`;
      await page.screenshot({ path: `scripts/resp-${label}.png`, fullPage: false });
      console.log(`${label}: hscroll=${hscroll}`);
      await page.close();
    }
  }
  await browser.close();
})();
