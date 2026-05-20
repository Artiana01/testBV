const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  async function inspectPage(url, label) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const items = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select, button, [role="combobox"], [role="dialog"] input')).map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        testid: el.getAttribute('data-testid'),
        text: el.tagName === 'BUTTON' ? el.textContent.trim().substring(0, 100) : undefined,
        ariaLabel: el.getAttribute('aria-label'),
      }));
    });
    console.log(`\n=== ${label} (${page.url()}) ===`);
    console.log(JSON.stringify(items, null, 2));

    // Also get nav links
    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('nav a, aside a, [role="navigation"] a')).map(el => ({
        href: el.getAttribute('href'),
        text: el.textContent.trim().substring(0, 60),
      }));
    });
    if (navLinks.length) {
      console.log(`=== ${label} NAV LINKS ===`);
      console.log(JSON.stringify(navLinks, null, 2));
    }

    // Also get page title/h1
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent.trim().substring(0, 80));
    });
    console.log(`=== ${label} HEADINGS ===`, JSON.stringify(headings));
  }

  // Login first to get authenticated pages
  await page.goto('https://dev.bluevalorisportage.com/fr/connexion');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', 'agency@bluevaloris.test');
  await page.fill('input[name="password"]', 'Agency123!');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  console.log('After login URL:', page.url());

  await inspectPage(page.url(), 'DASHBOARD after login');

  // Try client page
  const currentUrl = page.url();
  const baseUrl = 'https://dev.bluevalorisportage.com';
  
  // Look for client links in dashboard nav
  const dashboardLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(el => ({
      href: el.getAttribute('href'),
      text: el.textContent.trim().substring(0, 60),
    })).filter(l => l.href && (l.text.toLowerCase().includes('client') || l.text.toLowerCase().includes('mission') || l.text.toLowerCase().includes('team') || l.text.toLowerCase().includes('quipe') || l.text.toLowerCase().includes('profil') || l.text.toLowerCase().includes('kyc') || l.text.toLowerCase().includes('contract') || l.text.toLowerCase().includes('facture') || l.text.toLowerCase().includes('revers')));
  });
  console.log('\n=== DASHBOARD ALL RELEVANT LINKS ===');
  console.log(JSON.stringify(dashboardLinks, null, 2));

  await browser.close();
})();
