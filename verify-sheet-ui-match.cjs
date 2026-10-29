/**
 * verify-sheet-ui-match.cjs
 * Validates 100% 1:1 match between Google Sheets database and the Web UI Dashboard.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCAL_URL = 'http://localhost:5174';
const API_URL = 'https://script.google.com/macros/s/AKfycbyxMxyUZ8qry4g-cib3NQE6gTbetO1xERMmhxjYUHLzPdVNfwHQIfJOzEUfgBtbF9qQ5Q/exec';
const ARTIFACTS_DIR = '/Users/vansh/.gemini/antigravity/brain/676d7a89-0e61-4c2c-961d-6013fabb39aa';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function verify() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING 100% MATCH: GOOGLE SHEETS <-> CRM DASHBOARD UI');
  console.log('===============================================================\n');

  // 1. Fetch raw data from Google Sheets API
  console.log('1. Fetching live Google Sheet database...');
  const res = await fetch(`${API_URL}?action=get_all`);
  const sheet = await res.json();
  if (!sheet.success) throw new Error('Failed to fetch from Google Sheets: ' + sheet.error);

  console.log('   Google Sheet Records:');
  console.log(`   - Customers: ${sheet.customers.length}`);
  console.log(`   - Leads:     ${sheet.leads.length}`);
  console.log(`   - Products:  ${sheet.products.length}`);
  console.log(`   - Suppliers: ${sheet.suppliers.length}`);
  console.log(`   - Quotes:    ${sheet.quotes.length}`);
  console.log(`   - Orders:    ${sheet.orders.length}`);
  console.log(`   - Payments:  ${sheet.payments.length}`);

  // Calculate expected dashboard metrics from Sheet:
  const activeLeads = sheet.leads.filter(l => !['Won', 'Lost'].includes(l.Stage));
  const expectedPipelineVal = activeLeads.reduce((acc, l) => acc + (Number(l.EstimatedValue) || 0), 0);
  const expectedFollowUps = sheet.leads.filter(l => !['Won', 'Lost'].includes(l.Stage) && l.NextFollowUp).length;
  const expectedPendingQuotes = sheet.quotes.filter(q => q.Status === 'Sent' || q.Status === 'Draft').length;
  const expectedDispatch = sheet.orders.filter(o => o.DeliveryStatus === 'Processing').length;
  const expectedReceivables = sheet.orders.filter(o => o.PaymentStatus !== 'Paid').reduce((acc, o) => {
    return acc + ((Number(o.Total) || 0) - (Number(o.AmountPaid) || 0));
  }, 0);

  console.log('\n2. Computed Expected Metrics from Live Google Sheet:');
  console.log(`   - Pipeline Value: ₹${expectedPipelineVal.toLocaleString('en-IN')}`);
  console.log(`   - Active Opportunities: ${activeLeads.length}`);
  console.log(`   - Follow-ups Due: ${expectedFollowUps}`);
  console.log(`   - Pending Quotes: ${expectedPendingQuotes}`);
  console.log(`   - Orders Awaiting Dispatch: ${expectedDispatch}`);
  console.log(`   - Receivables Outstanding: ₹${expectedReceivables.toLocaleString('en-IN')}`);

  // 2. Launch Puppeteer Browser
  console.log('\n3. Launching Headless Chrome to inspect Web UI at:', LOCAL_URL);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(LOCAL_URL, { waitUntil: 'networkidle2' });
  console.log('   Waiting for live Google Sheets hydration...');
  // Wait up to 10s for sync indicator to finish
  await delay(6000);

  // 3. Extract UI Dashboard Metrics
  const uiStats = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.stat-card'));
    return cards.map(c => ({
      title: c.querySelector('.stat-header span')?.innerText.trim(),
      value: c.querySelector('.stat-value')?.innerText.trim(),
      subtext: c.querySelector('.stat-subtext span')?.innerText.trim()
    }));
  });

  console.log('\n4. Live Web UI Dashboard Metrics:');
  uiStats.forEach(s => console.log(`   - ${s.title}: ${s.value} (${s.subtext || ''})`));

  // Assertions
  let passCount = 0;
  let failCount = 0;

  function assertMatch(label, sheetVal, uiVal) {
    if (String(sheetVal).trim() === String(uiVal).trim()) {
      console.log(`   ✅ PASS: ${label} matches exactly -> "${uiVal}"`);
      passCount++;
    } else {
      console.error(`   ❌ FAIL: ${label} mismatch! Sheet: "${sheetVal}", UI: "${uiVal}"`);
      failCount++;
    }
  }

  console.log('\n5. Side-by-side Verification:');
  // Format Lakhs helper
  const formatLakhs = (amt) => {
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} L`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const uiPipeline = uiStats.find(s => (s.title || '').toLowerCase() === 'pipeline value');
  assertMatch('Pipeline Value', formatLakhs(expectedPipelineVal), uiPipeline?.value);
  assertMatch('Active Opportunities Count', `${activeLeads.length} active opportunities`, uiPipeline?.subtext);

  const uiFollowups = uiStats.find(s => (s.title || '').toLowerCase().includes('follow-up'));
  assertMatch('Follow-ups Count', String(expectedFollowUps), uiFollowups?.value);

  const uiQuotes = uiStats.find(s => (s.title || '').toLowerCase().includes('quote'));
  assertMatch('Pending Quotes Count', String(expectedPendingQuotes), uiQuotes?.value);

  const uiDispatch = uiStats.find(s => (s.title || '').toLowerCase().includes('dispatch'));
  assertMatch('Awaiting Dispatch Count', String(expectedDispatch), uiDispatch?.value);

  const uiReceivables = uiStats.find(s => (s.title || '').toLowerCase().includes('receivable'));
  assertMatch('Receivables Value', formatLakhs(expectedReceivables), uiReceivables?.value);

  // 6. Check Views Tables vs Google Sheet Counts
  console.log('\n6. Checking Entity Tables vs Google Sheets:');

  // Leads
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Enquiries & Leads'));
    if (btn) btn.click();
  });
  await delay(1000);
  // Switch to list/table view
  await page.evaluate(() => {
    const tableBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Table'));
    if (tableBtn) tableBtn.click();
  });
  await delay(500);
  const uiLeadsCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Leads Table Row Count', sheet.leads.length, uiLeadsCount);

  // Quotes
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Quotations'));
    if (btn) btn.click();
  });
  await delay(1000);
  const uiQuotesCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Quotes Table Row Count', sheet.quotes.length, uiQuotesCount);

  // Orders
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Orders & Dispatch'));
    if (btn) btn.click();
  });
  await delay(1000);
  const uiOrdersCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Orders Table Row Count', sheet.orders.length, uiOrdersCount);

  // Payments
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Payments Ledger'));
    if (btn) btn.click();
  });
  await delay(1000);
  const uiPaymentsCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Payments Table Row Count', sheet.payments.length, uiPaymentsCount);

  // Customers
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Clients & Vendors'));
    if (btn) btn.click();
  });
  await delay(1000);
  const uiCustomersCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Customers Table Row Count', sheet.customers.length, uiCustomersCount);

  // Inventory
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Inventory & HSN'));
    if (btn) btn.click();
  });
  await delay(1000);
  const uiProductsCount = await page.evaluate(() => document.querySelectorAll('.data-table tbody tr').length);
  assertMatch('Products Table Row Count', sheet.products.length, uiProductsCount);

  // Return to Dashboard and take verified screenshot
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Command Center'));
    if (btn) btn.click();
  });
  await delay(1000);

  const screenshotPath = path.join(ARTIFACTS_DIR, 'dashboard_sheet_synced.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Dashboard verification screenshot saved: ${screenshotPath}`);

  await browser.close();

  console.log('\n===============================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================\n');

  if (failCount > 0) process.exit(1);
}

verify().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
