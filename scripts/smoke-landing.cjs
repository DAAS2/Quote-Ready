/* Diagnostic: load landing, scroll to features, dump computed styles + console errors */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 300)));

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const featureY = await page.evaluate(() => {
    const el = document.querySelector("[data-feature-card]");
    return el ? el.getBoundingClientRect().top + window.scrollY - 300 : -1;
  });
  console.log("features Y:", featureY);
  for (let y = 0; y < featureY; y += 300) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  const states = await page.evaluate(() => {
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return "MISSING";
      const cs = getComputedStyle(el);
      return `opacity=${cs.opacity} display=${cs.display} visibility=${cs.visibility}`;
    };
    return {
      featureCard: probe("[data-feature-card]"),
      ba: probe("[data-ba]"),
      pipeStep: probe("[data-pipe-step]"),
      metric: probe("[data-metric]"),
      ctaChild: probe("[data-cta-child]"),
      heroHeadline: probe("[data-hero-headline]"),
      bodyHeight: document.body.scrollHeight,
      scrollY: window.scrollY,
    };
  });
  console.log(JSON.stringify(states, null, 2));
  console.log("console errors:", errors.length ? errors.slice(0, 6) : "none");
  await browser.close();
})();
