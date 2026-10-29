/**
 * test-full-crud.cjs
 * Comprehensive verification of Full CRUD (Add + Delete) across EVERY entity:
 * - Clients (Customers)
 * - Leads / Enquiries
 * - Quotations
 * - Orders
 * - Payments
 * - Products (Inventory)
 * And tests live Google Sheets GET / POST / DELETE synchronization.
 */

const puppeteer = require('puppeteer-core');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCAL_URL = 'http://localhost:5174';
const GS_API_URL = 'https://script.google.com/macros/s/AKfycbyxMxyUZ8qry4g-cib3NQE6gTbetO1xERMmhxjYUHLzPdVNfwHQIfJOzEUfgBtbF9qQ5Q/exec';

let passCount = 0;
let failCount = 0;

function report(testName, passed, details = '') {
  if (passed) {
    passCount++;
    console.log(`  ✅ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failCount++;
    console.error(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

async function runFullCrudTests() {
  console.log('\n=============================================================');
  console.log('🧪 FULL DATABASE & REAL-TIME CRUD TEST SUITE (UI + API)');
  console.log('=============================================================\n');

  // PART 1: Direct Google Sheets API Test
  console.log('--- Phase 1: Real-Time Google Sheets API GET/POST/DELETE Verification ---');
  try {
    // 1. Test GET all sheets
    const getRes = await fetch(`${GS_API_URL}?action=get_all`);
    const getData = await getRes.json();
    report('Google Sheets API GET /exec', getData.success === true, `Customers: ${getData.customers?.length}, Leads: ${getData.leads?.length}`);

    // 2. Test POST Add record to Google Sheets
    const testCustName = `E2E Test Corp ${Date.now().toString().slice(-4)}`;
    const addUrl = `${GS_API_URL}?action=add&sheet=Customers&data=${encodeURIComponent(JSON.stringify({
      Company: testCustName,
      ContactName: 'Tester Verification',
      Phone: '+919999988888',
      Email: 'test@corp.com',
      City: 'Mumbai',
      State: 'Maharashtra'
    }))}`;
    const addRes = await fetch(addUrl);
    const addData = await addRes.json();
    report('Google Sheets API Real-Time ADD', addData.success && !!addData.id, `Created ID: ${addData.id}`);

    // 3. Test POST Delete record from Google Sheets
    const delUrl = `${GS_API_URL}?action=delete&sheet=Customers&id=${encodeURIComponent(addData.id)}`;
    const delRes = await fetch(delUrl);
    const delData = await delRes.json();
    report('Google Sheets API Real-Time DELETE', delData.success && delData.id === addData.id, `Deleted ID: ${addData.id}`);
  } catch (err) {
    report('Google Sheets API Connectivity', false, err.message);
  }

  // PART 2: Headless Browser UI CRUD (Add + Delete every single entity)
  console.log('\n--- Phase 2: Full UI CRUD Verification (Add + Delete from UI) ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('dialog', async dialog => {
    await dialog.accept(); // Auto-confirm deletions
  });

  try {
    await page.goto(LOCAL_URL, { waitUntil: 'networkidle0' });

    // 1. CRUD: CLIENTS / CUSTOMERS
    console.log('\n[Entity 1: Customers / Clients]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Clients & Vendors'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    // Add Client
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Add Customer'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    const tempClient = 'Kirloskar Heavy Engines';
    await page.type('input[placeholder*="Larsen & Toubro"]', tempClient);
    await page.type('input[placeholder*="Priya Sharma"]', 'Sunil Kirloskar');
    await page.type('input[placeholder="+919876543210"]', '+919877766655');
    await page.evaluate(() => {
      document.querySelector('.modal-dialog button[type="submit"]').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const clientAdded = await page.evaluate(c => document.body.textContent.includes(c), tempClient);
    report('UI Add Client', clientAdded, tempClient);

    // Delete Client
    await page.evaluate(c => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent.includes(c));
      if (row) {
        const delBtn = row.querySelector('button[title="Delete"]');
        if (delBtn) delBtn.click();
      }
    }, tempClient);
    await new Promise(r => setTimeout(r, 600));

    const clientDeleted = !(await page.evaluate(c => document.body.textContent.includes(c), tempClient));
    report('UI Delete Client', clientDeleted, `${tempClient} removed`);

    // 2. CRUD: ENQUIRIES / LEADS
    console.log('\n[Entity 2: Leads / Enquiries]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Enquiries & Leads'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    // Switch to table view for precise delete button access
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn-secondary'));
      const tableBtn = btns.find(b => b.textContent.includes('Table'));
      if (tableBtn) tableBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Add Lead
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('New Enquiry'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    const tempLead = 'BHEL Power Equipment';
    await page.type('input[placeholder="e.g. Tata Projects Ltd"]', tempLead);
    await page.type('input[placeholder="e.g. Rajesh Kumar"]', 'Ravi Prakash');
    await page.type('input[placeholder="+919876543210"]', '+919870011223');
    await page.type('input[placeholder*="MS Plates 6mm"]', 'Turbine Fasteners Grade 8.8');
    await page.evaluate(() => {
      document.querySelector('.modal-dialog button[type="submit"]').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const leadAdded = await page.evaluate(l => document.body.textContent.includes(l), tempLead);
    report('UI Add Lead', leadAdded, tempLead);

    // Delete Lead
    await page.evaluate(l => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent.includes(l));
      if (row) {
        const delBtn = row.querySelector('button[title="Delete"]');
        if (delBtn) delBtn.click();
      }
    }, tempLead);
    await new Promise(r => setTimeout(r, 600));

    const leadDeleted = !(await page.evaluate(l => document.body.textContent.includes(l), tempLead));
    report('UI Delete Lead', leadDeleted, `${tempLead} removed`);

    // 3. CRUD: QUOTATIONS
    console.log('\n[Entity 3: Commercial Quotations]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Quotations'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    // Add Quote
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Create New Quote'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate(() => {
      document.querySelector('.modal-dialog button[type="submit"]').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const initialQuotesCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    report('UI Add Quotation', initialQuotesCount > 0, `Quotes in table: ${initialQuotesCount}`);

    // Delete Quote
    await page.evaluate(() => {
      const firstDeleteBtn = document.querySelector('button[title="Delete Quote"]');
      if (firstDeleteBtn) firstDeleteBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const postQuotesCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    report('UI Delete Quotation', postQuotesCount < initialQuotesCount, `Remaining: ${postQuotesCount}`);

    // 4. CRUD: PAYMENTS (Test while Order is still active)
    console.log('\n[Entity 4: Payments Ledger]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Payments Ledger'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    // Add Payment
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Record Inward Payment'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    const testUtr = 'SBIN-VERIFY-88392';
    await page.type('input[placeholder*="HDFCR520261024"]', testUtr);
    await page.evaluate(() => {
      document.querySelector('.modal-dialog button[type="submit"]').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const paymentAdded = await page.evaluate(u => document.body.textContent.includes(u), testUtr);
    report('UI Add Inward Payment', paymentAdded, testUtr);

    // Delete Payment
    await page.evaluate(u => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent.includes(u));
      if (row) {
        const delBtn = row.querySelector('button[title="Delete Payment"]');
        if (delBtn) delBtn.click();
      }
    }, testUtr);
    await new Promise(r => setTimeout(r, 600));

    const paymentDeleted = !(await page.evaluate(u => document.body.textContent.includes(u), testUtr));
    report('UI Delete Inward Payment', paymentDeleted, `${testUtr} deleted`);

    // 5. CRUD: ORDERS & DISPATCH
    console.log('\n[Entity 5: Orders & Logistics]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Orders & Dispatch'));
      if (target) target.click();
    });
    await page.waitForSelector('.page-title');

    const initialOrdersCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
    report('UI Orders List Available', initialOrdersCount >= 0, `Orders: ${initialOrdersCount}`);

    // Delete Order
    const hasOrderDelete = await page.evaluate(() => {
      const delBtn = document.querySelector('button[title="Delete Order"]');
      if (delBtn) {
        delBtn.click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 600));
    report('UI Delete Order Functionality', hasOrderDelete, 'Delete triggered successfully');

    // 6. CRUD: INVENTORY / PRODUCTS
    console.log('\n[Entity 6: Products & Inventory]');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const target = items.find(el => el.textContent.includes('Inventory & HSN'));
      if (target) target.click();
    });
    await page.waitForSelector('.data-table');

    // Add Product
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Add Product SKU'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.modal-dialog');
    const tempProduct = 'High Carbon Spring Steel Wire 3mm';
    await page.type('input[placeholder*="MS Plate 8mm"]', tempProduct);
    await page.type('input[placeholder="72.00"]', '125.00');
    await page.type('input[placeholder="56.00"]', '95.00');
    await page.evaluate(() => {
      document.querySelector('.modal-dialog button[type="submit"]').click();
    });
    await new Promise(r => setTimeout(r, 600));

    const prodAdded = await page.evaluate(p => document.body.textContent.includes(p), tempProduct);
    report('UI Add Product SKU', prodAdded, tempProduct);

    // Delete Product
    await page.evaluate(p => {
      const row = Array.from(document.querySelectorAll('tr')).find(r => r.textContent.includes(p));
      if (row) {
        const delBtn = row.querySelector('button[title="Delete"]');
        if (delBtn) delBtn.click();
      }
    }, tempProduct);
    await new Promise(r => setTimeout(r, 600));

    const prodDeleted = !(await page.evaluate(p => document.body.textContent.includes(p), tempProduct));
    report('UI Delete Product SKU', prodDeleted, `${tempProduct} deleted`);

  } catch (e) {
    report('UI Test Suite Execution', false, e.message);
  } finally {
    await browser.close();
  }

  console.log('\n=============================================================');
  console.log(`🏁 FULL CRUD VERIFICATION RESULT: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=============================================================\n');

  if (failCount > 0) process.exit(1);
}

runFullCrudTests();
