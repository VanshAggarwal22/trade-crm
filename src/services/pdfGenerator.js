/**
 * pdfGenerator.js
 * Zero-dependency, client-side, print-perfect Quotation & Invoice Renderer.
 * Generates official Indian GST compliant quotations formatted for A4 printing or PDF export.
 */

export function generateQuotePrint(quote, settings) {
  const isSameState = (settings.state || '').trim().toLowerCase() === (quote.customerState || settings.state || '').trim().toLowerCase();
  
  const subtotal = Number(quote.subtotal || 0);
  const gstTotal = Number(quote.gstTotal || quote.gst || 0);
  const grandTotal = Number(quote.total || 0);

  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert('Please allow popups to preview and print the Quotation PDF.');
    return;
  }

  const itemsRows = (quote.items || []).map((item, idx) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const amount = Number(item.amount || qty * rate);
    const gstPct = Number(item.gstPct || 18);
    const itemGst = (amount * gstPct) / 100;

    let taxCol = '';
    if (isSameState) {
      taxCol = `CGST ${(gstPct / 2)}% + SGST ${(gstPct / 2)}%<br><span style="color:#64748b;font-size:11px;">₹${itemGst.toFixed(2)}</span>`;
    } else {
      taxCol = `IGST ${gstPct}%<br><span style="color:#64748b;font-size:11px;">₹${itemGst.toFixed(2)}</span>`;
    }

    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>
          <strong>${item.name || 'Item'}</strong>
          ${item.sku ? `<div style="font-size:11px;color:#64748b;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="text-align:center;">${item.hsn || '-'}</td>
        <td style="text-align:center;">${qty} ${item.unit || 'Units'}</td>
        <td style="text-align:right;">₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:center;">${taxCol}</td>
        <td style="text-align:right;"><strong>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quotation_${quote.id || 'Draft'}</title>
        <style>
          @page {
            size: A4;
            margin: 14mm 14mm 14mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.5;
            background: #fff;
          }
          .quote-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 30px;
            border-radius: 8px;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 16px;
          }
          .company-name {
            font-size: 22px;
            font-weight: 800;
            color: #1e40af;
            letter-spacing: -0.5px;
          }
          .badge-quote {
            display: inline-block;
            background: #eff6ff;
            color: #1d4ed8;
            font-size: 16px;
            font-weight: 700;
            padding: 6px 16px;
            border-radius: 6px;
            border: 1px solid #bfdbfe;
            text-align: right;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .info-block h4 {
            margin: 0 0 8px 0;
            color: #475569;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .items-table th {
            background: #1e293b;
            color: #fff;
            padding: 10px 8px;
            font-size: 12px;
            font-weight: 600;
            text-align: left;
          }
          .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .summary-wrap {
            display: flex;
            justify-content: space-between;
            margin-bottom: 24px;
          }
          .bank-details {
            width: 48%;
            background: #f1f5f9;
            padding: 14px;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
          }
          .bank-details h4 {
            margin: 0 0 6px 0;
            color: #1e293b;
            font-size: 12px;
            text-transform: uppercase;
          }
          .totals-table {
            width: 46%;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 6px 8px;
            font-size: 13px;
          }
          .totals-table .grand-row {
            border-top: 2px solid #1e293b;
            border-bottom: 2px solid #1e293b;
            font-size: 16px;
            font-weight: 800;
            color: #1e40af;
          }
          .terms-block {
            margin-top: 20px;
            padding-top: 14px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11.5px;
            color: #64748b;
          }
          .footer-sign {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
          }
          .sign-box {
            text-align: center;
            width: 220px;
            border-top: 1px solid #94a3b8;
            padding-top: 8px;
            font-weight: 600;
            color: #334155;
            font-size: 12px;
          }
          .no-print-bar {
            text-align: center;
            margin-bottom: 20px;
            padding: 12px;
            background: #dbeafe;
            border-radius: 6px;
          }
          .btn-print {
            background: #2563eb;
            color: #fff;
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(37,99,235,0.3);
          }
          @media print {
            .no-print-bar { display: none; }
            body { padding: 0; }
            .quote-container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <span style="margin-left: 14px; color:#1e40af; font-size:13px;">Pro Tip: Choose <strong>"Save as PDF"</strong> in the print destination to create a PDF file.</span>
        </div>

        <div class="quote-container">
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="company-name">${settings.companyName || 'Aggarwal Industries'} <span style="font-size:14px;color:#2563eb;font-weight:700;margin-left:6px;">[ASTER]</span></div>
                <div style="color:#0f172a;font-weight:600;font-size:12px;margin-top:2px;">Precision Springs (0.2 - 18mm) • Spring Washers (DIN 127B / IS 3063) • Railway Parts</div>
                <div style="color:#64748b;margin-top:4px;font-size:11.5px;">${settings.address || 'Office: A-3, 22/1, Delhi-Mathura Road, Ballabgarh, Faridabad - 121004 (HR.)'}</div>
                <div style="color:#64748b;font-size:11.5px;">Plant: 42km Stone, Delhi-Mathura Road, Sikri, Faridabad - 121004 (HR.)</div>
                <div style="font-size:12px;margin-top:2px;"><strong>GSTIN:</strong> ${settings.gstin || '06AAACA1234A1Z5'} | <strong>State:</strong> ${settings.state || 'Haryana'}</div>
                <div style="font-size:12px;"><strong>Phone:</strong> ${settings.phone || '+91 9811280333'} | <strong>Email:</strong> ${settings.email || 'ashutosh@aggarwalindustries.com'} | <strong>Web:</strong> www.aggarwalindustries.com</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="badge-quote">COMMERCIAL QUOTATION</div>
                <div style="margin-top:10px;font-size:13px;">
                  <div><strong>Quote Ref:</strong> <span style="color:#2563eb;font-weight:700;">${quote.id || 'QT-NEW'}</span></div>
                  <div><strong>Date:</strong> ${quote.date || new Date().toLocaleDateString('en-GB')}</div>
                  <div><strong>Valid Till:</strong> ${quote.validTill || '15 Days'}</div>
                </div>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-block">
              <h4>Quotation Prepared For:</h4>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">${quote.customerName || 'Customer'}</div>
              <div>${quote.customerContact ? `Attn: <strong>${quote.customerContact}</strong>` : ''}</div>
              <div>${quote.customerPhone ? `Phone: ${quote.customerPhone}` : ''}</div>
              <div>${quote.customerEmail ? `Email: ${quote.customerEmail}` : ''}</div>
              <div style="margin-top:4px;">
                <strong>GSTIN:</strong> ${quote.customerGstin || 'Unregistered / Consumer'}<br>
                <strong>Place of Supply:</strong> ${quote.customerState || settings.state || 'Maharashtra'}
              </div>
            </div>

            <div class="info-block">
              <h4>Commercial Terms & Scope:</h4>
              <div><strong>Payment Terms:</strong> ${quote.paymentTerms || '100% Against Proforma / 30 Days'}</div>
              <div><strong>Delivery / Dispatch:</strong> Ready Stock / Ex-Warehouse</div>
              <div><strong>Freight / Transport:</strong> Borne by Buyer unless specified</div>
              <div><strong>Price Basis:</strong> Ex-Works / Ex-Godown</div>
              <div><strong>Tax Structure:</strong> ${isSameState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST 18%)'}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>Material Description / Specification</th>
                <th style="width:80px;text-align:center;">HSN</th>
                <th style="width:90px;text-align:center;">Qty / Unit</th>
                <th style="width:100px;text-align:right;">Rate (₹)</th>
                <th style="width:110px;text-align:center;">GST Rate</th>
                <th style="width:110px;text-align:right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="summary-wrap">
            <div class="bank-details">
              <h4>Direct Bank Transfer Details</h4>
              <div><strong>Bank:</strong> ${settings.bankName || 'HDFC Bank Ltd'}</div>
              <div><strong>A/C Name:</strong> ${settings.companyName || 'Aggarwal Industries'}</div>
              <div><strong>A/C No:</strong> <span style="font-family:monospace;font-size:14px;font-weight:700;">${settings.accountNumber || '50200012345678'}</span></div>
              <div><strong>IFSC Code:</strong> <span style="font-family:monospace;font-weight:700;">${settings.ifsc || 'HDFC0001234'}</span></div>
              <div style="margin-top:6px;font-size:11px;color:#64748b;">Please mention Quote/Invoice reference during RTGS / NEFT transfer.</div>
            </div>

            <table class="totals-table">
              <tr>
                <td>Subtotal (Taxable Value):</td>
                <td style="text-align:right;font-weight:600;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${isSameState ? `
                <tr>
                  <td>CGST (Central Tax):</td>
                  <td style="text-align:right;">₹${(gstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>SGST (State Tax):</td>
                  <td style="text-align:right;">₹${(gstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : `
                <tr>
                  <td>IGST (Integrated Tax):</td>
                  <td style="text-align:right;">₹${gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `}
              <tr class="grand-row">
                <td>Total Net Payable:</td>
                <td style="text-align:right;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="terms-block">
            <strong>Standard Terms & Conditions:</strong><br>
            1. All prices quoted are valid until <strong>${quote.validTill || '15 days from issue date'}</strong>.<br>
            2. Taxes will be charged extra at applicable rates at the time of final dispatch/invoicing.<br>
            3. Springs & washers are manufactured strictly as per approved drawings / DIN 127 B / IS 3063 and accompanied by Inspection/Test Reports.<br>
            4. Subject to Faridabad (Haryana) jurisdiction only.
          </div>

          <div class="footer-sign">
            <div class="sign-box">
              Customer Acceptance / Stamp
            </div>
            <div class="sign-box">
              For <strong>${settings.companyName || 'Industrial Supplies'}</strong><br><br>
              <span style="color:#64748b;font-size:11px;">Authorised Signatory</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
