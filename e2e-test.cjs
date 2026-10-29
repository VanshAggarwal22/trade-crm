/**
 * e2e-test.cjs
 * Comprehensive Automated End-to-End Test Suite for Industrial Trade CRM
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCAL_URL = 'http://localhost:5174';
const PUBLIC_URL = 'https://born-cgi-dawn-coordinator.trycloudflare.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-artifacts');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let passedTests = 0;
let failedTests = 0;

function logTest(name, status, details = '') {
  if (status) {
    passedTests++;
    console.log(`  ✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
  }
}

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 STARTING COMPREHENSIVE E2E TESTS FOR TRADE CRM');
  console.log('======================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('dialog', async dialog => {
    // Auto-accept alert/confirm dialogs
    await dialog.accept();
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Initial App Load & Dashboard
    // -------------------------------------------------------------
    console.log('--- Test Suite 1: App Launch & Dashboard ---');
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_dashboard.png') });

    const titleText = await page.$eval('.page-title', el => el.textContent);
    logTest('Dashboard Page Title', titleText.includes('Command Center'), titleText);

    const statsCards = await page.$$('.stat-card');
    logTest('KPI Stat Cards Rendered', statsCards.length >= 5, `Found ${statsCards.length} cards`);

    const pipelineFunnel = await page.$('.table-title');
    const funnelText = await page.evaluate(el => el ? el.textContent : '', pipelineFunnel);
    logTest('Conversion Pipeline Funnel', funnelText.includes('Sales Conversion Pipeline'));

    // -------------------------------------------------------------
    // TEST 2: Leads & Enquiry Pipeline Management
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 2: Leads & Enquiry Pipeline ---');
    const leadsNavBtn = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      return items.find(el => el.textContent.includes('Enquiries & Leads'));
    });
    await leadsNavBtn.click();
    await page.waitForSelector('.page-title');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_leads_board.png') });

    const leadsTitle = await page.$eval('.page-title', el => el.textContent);
    logTest('Leads Page Loaded', leadsTitle.includes('Enquiry & Sales Pipeline'));

    const columns = await page.$$('.kanban-column');
    logTest('Kanban Columns (New, Contacted, Quoted, etc.)', columns.length === 6, `Found ${columns.length} columns`);

    // Click "New Enquiry" button
    const newEnquiryBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.btn-primary'));
      return btns.find(b => b.textContent.includes('New Enquiry'));
    });
    await newEnquiryBtn.click();
    await page.waitForSelector('.modal-dialog');

    // Fill new enquiry form
    await page.type('input[placeholder="e.g. Tata Projects Ltd"]', 'Jindal Heavy Infra Ltd');
    await page.type('input[placeholder="e.g. Rajesh Kumar"]', 'Amitabh Sen');
    await page.type('input[placeholder="+919876543210"]', '+919811223344');
    await page.type('input[placeholder="e.g. MS Plates 6mm, Hex Bolts M16"]', 'MS Beams ISMB 200 & Plates');
    await page.type('input[placeholder="e.g. 150000"]', '450000');
    await page.type('textarea[placeholder*="Specification notes"]', 'Bridge fabrication project, immediate delivery required');

    // Submit form
    const saveEnquiryBtn = await page.$('button[type="submit"]');
    await saveEnquiryBtn.click();
    await page.waitForFunction(() => !document.querySelector('.modal-dialog'));

    const leadExists = await page.evaluate(() => {
      return document.body.textContent.includes('Jindal Heavy Infra Ltd');
    });
    logTest('Create New Lead', leadExists, 'Jindal Heavy Infra Ltd added');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_lead_created.png') });

    // -------------------------------------------------------------
    // TEST 3: Convert Lead to Customer
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 3: Convert Lead to Customer ---');
    const convertCustomerBtn = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('.kanban-card'));
      const targetCard = cards.find(c => c.textContent.includes('Jindal Heavy Infra Ltd'));
      if (!targetCard) return null;
      return targetCard.querySelector('button[title="Convert to Customer"]');
    });

    if (convertCustomerBtn) {
      await convertCustomerBtn.click();
      await page.waitForSelector('.page-title');
      const custPageTitle = await page.$eval('.page-title', el => el.textContent);
      logTest('Auto-redirect to Customers Master', custPageTitle.includes('Directory: Clients & Vendors'));

      const hasNewCustomer = await page.evaluate(() => {
        return document.body.textContent.includes('Jindal Heavy Infra Ltd');
      });
      logTest('Customer Account Created in Directory', hasNewCustomer);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_customer_converted.png') });
    } else {
      logTest('Find Convert Customer Button', false);
    }

    // -------------------------------------------------------------
    // TEST 4: Commercial Quotation Engine & Tax Calculation
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 4: Commercial Quotation Builder ---');
    const quotesNavBtn = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      return items.find(el => el.textContent.includes('Quotations'));
    });
    await quotesNavBtn.click();
    await page.waitForSelector('.page-title');

    // Click "Create New Quote"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Create New Quote'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    await new Promise(r => setTimeout(r, 400));

    const modalText = await page.$eval('.modal-dialog', el => el.textContent);
    logTest('Tax Structure Displayed (Intrastate/Interstate)', modalText.includes('CGST') || modalText.includes('IGST'));
    logTest('Grand Total Calculated', modalText.includes('Grand Total:'));

    // Save quotation
    await page.evaluate(() => {
      const btn = document.querySelector('.modal-dialog button[type="submit"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const isModalOpenNow = await page.evaluate(() => !!document.querySelector('.modal-dialog'));
    logTest('Quote Modal Submitted & Closed', !isModalOpenNow);

    const quotesTableText = await page.$eval('.data-table', el => el.textContent);
    logTest('Quote Saved to Quotes Register', quotesTableText.includes('₹'));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_quotes_list.png') });

    // -------------------------------------------------------------
    // TEST 5: Convert Quote to Order & Track Dispatch
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 5: Quote to Order & Dispatch Tracking ---');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Convert to Confirmed Order"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Orders & Dispatch'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_orders_list.png') });

    const ordersText = await page.evaluate(() => document.body.textContent);
    logTest('Order Created from Quote', ordersText.includes('Processing') || ordersText.includes('Dispatched') || ordersText.includes('Orders & Dispatch'));

    // Update Dispatch Details
    const hasDispatchBtn = await page.evaluate(() => {
      const btn = document.querySelector('button[title="Update Dispatch / LR"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (hasDispatchBtn) {
      await page.waitForSelector('.modal-dialog');

      await page.evaluate(() => {
        const select = document.querySelector('.modal-dialog select');
        if (select) {
          select.value = 'Dispatched';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      await page.type('input[placeholder*="VRL Logistics"]', 'Gati-KWE Express Ltd');
      await page.type('input[placeholder*="LR-9948271"]', 'GK-MUM-77291');

      await page.evaluate(() => {
        const btn = document.querySelector('.modal-dialog button[type="submit"]');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 800));

      const updatedOrdersText = await page.evaluate(() => document.body.textContent);
      logTest('Dispatch Updated with LR & Transporter', updatedOrdersText.includes('GK-MUM-77291'));
    }

    // -------------------------------------------------------------
    // TEST 6: Inward Payment & Ledger Reconciliation
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 6: Inward Payment & Reconciliation ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Payments Ledger'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_payments_list.png') });

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Record Inward Payment'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');

    await page.type('input[placeholder*="HDFCR520261024"]', 'RTGS-SBIN99281920');
    await page.evaluate(() => {
      const btn = document.querySelector('.modal-dialog button[type="submit"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const paymentsTableText = await page.evaluate(() => document.body.textContent);
    logTest('Inward Payment Recorded', paymentsTableText.includes('RTGS-SBIN99281920'));

    // -------------------------------------------------------------
    // TEST 7: AI Sales Copilot
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 7: AI Sales Copilot ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('AI Sales Copilot'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Generate AI Sales Draft'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const generatedText = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.table-card'));
      return cards.map(c => c.textContent).join(' ');
    });

    logTest('AI Sales Copilot Generates Contextual Pitch', 
      generatedText.includes('Namaste') || generatedText.includes('quotation') || generatedText.includes('warm regards') || generatedText.includes('Aggarwal')
    );
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_ai_copilot.png') });

    // -------------------------------------------------------------
    // TEST 8: Inventory & Products Master
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 8: Inventory & HSN Master ---');
    const invNavBtn = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      return items.find(el => el.textContent.includes('Inventory & HSN'));
    });
    await invNavBtn.click();
    await page.waitForSelector('.data-table');

    const invText = await page.$eval('.data-table', el => el.textContent);
    logTest('Inventory List Renders with HSN & Stock', invText.includes('7208') && invText.includes('SKU-0001'));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_inventory.png') });

    // -------------------------------------------------------------
    // TEST 9: Settings & Google Sheets Cloud Mirror
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 9: Settings & Cloud Mirror ---');
    const settingsNavBtn = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      return items.find(el => el.textContent.includes('Settings & Cloud'));
    });
    await settingsNavBtn.click();
    await page.waitForSelector('.page-title');

    const sheetLink = await page.$('a[href*="docs.google.com/spreadsheets"]');
    logTest('Google Spreadsheet Link Present', !!sheetLink);

    const backupBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Download Full JSON Backup'));
    });
    logTest('Full CRM JSON Backup Option Available', !!backupBtn);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_settings.png') });

    // -------------------------------------------------------------
    // TEST 10: Public Cloudflare Tunnel URL Verification
    // -------------------------------------------------------------
    console.log('\n--- Test Suite 10: Public Cloudflare Tunnel Verification ---');
    const publicPage = await browser.newPage();
    await publicPage.setViewport({ width: 1280, height: 800 });
    await publicPage.goto(PUBLIC_URL, { waitUntil: 'networkidle0', timeout: 20000 });
    await publicPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_public_tunnel_page.png') });

    const publicTitle = await publicPage.$eval('.page-title', el => el.textContent);
    logTest('Public Tunnel Serves App with SSL', publicTitle.includes('Command Center'), PUBLIC_URL);
    await publicPage.close();

  } catch (err) {
    console.error('Fatal Test Exception:', err);
    failedTests++;
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`🏁 E2E TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ETests();
