/**
 * sheetSync.js
 * Real-Time Google Sheets Synchronization Service
 * 1. Synchronizes Adds, Updates, and Deletes directly with Google Sheets in real-time.
 * 2. Fetches fresh rows from Google Sheets.
 * 3. Downloads CSV exports.
 */

import { StorageService } from './storage';

export const SheetSyncService = {
  // Direct link to the Google Sheet
  getSheetUrl(sheetId = '1T0y1ovU55n8DL1f4hJWq2Zt-nxl1wWxeHcHZJExt0wc') {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  },

  getApiUrl() {
    // Primary: Same-Origin Node.js Proxy (Bypasses all Google Auth redirects, CORS, and AccountChooser issues)
    if (typeof window !== 'undefined') {
      return '/api/sheets';
    }
    const settings = StorageService.getSettings();
    return settings.gasSyncUrl || 'https://script.google.com/macros/s/AKfycbyxMxyUZ8qry4g-cib3NQE6gTbetO1xERMmhxjYUHLzPdVNfwHQIfJOzEUfgBtbF9qQ5Q/exec';
  },

  // Generate CSV string from an array of objects
  convertToCSV(data) {
    if (!data || !data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(header => {
        let val = item[header];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        val = String(val === undefined || val === null ? '' : val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\r\n');
  },

  // Download CSV file to client
  downloadCSV(data, filename) {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Real-time ADD to Google Sheets
  async syncAdd(sheetName, data) {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return null;
    try {
      const url = `${apiUrl}?action=add&sheet=${encodeURIComponent(sheetName)}&data=${encodeURIComponent(JSON.stringify(data))}`;
      const res = await fetch(url);
      const json = await res.json();
      return json;
    } catch (e) {
      console.warn('Real-time syncAdd to Google Sheets failed:', e);
      return null;
    }
  },

  // Real-time UPDATE to Google Sheets
  async syncUpdate(sheetName, id, data) {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return null;
    try {
      const url = `${apiUrl}?action=update&sheet=${encodeURIComponent(sheetName)}&id=${encodeURIComponent(id)}&data=${encodeURIComponent(JSON.stringify(data))}`;
      const res = await fetch(url);
      const json = await res.json();
      return json;
    } catch (e) {
      console.warn('Real-time syncUpdate to Google Sheets failed:', e);
      return null;
    }
  },

  // Real-time DELETE from Google Sheets
  async syncDelete(sheetName, id) {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return null;
    try {
      const url = `${apiUrl}?action=delete&sheet=${encodeURIComponent(sheetName)}&id=${encodeURIComponent(id)}`;
      const res = await fetch(url);
      const json = await res.json();
      return json;
    } catch (e) {
      console.warn('Real-time syncDelete to Google Sheets failed:', e);
      return null;
    }
  },

  // Pull all records from Google Sheets into local storage
  async fetchAllFromSheets() {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return { success: false, error: 'No API URL configured' };
    try {
      const res = await fetch(`${apiUrl}?action=get_all`);
      const json = await res.json();
      if (json.success) {
        // 1. Leads (Tata Motors, Hero MotoCorp, Maruti Suzuki)
        const rawLeads = json.leads || [];
        const normalizedLeads = rawLeads.filter(l => l.id || l.LeadID || l.company || l.Company).map(l => ({
          id: l.id || l.LeadID,
          createdAt: l.createdAt || l.CreatedAt || l.lastActivity || '2026-08-25',
          source: l.source || l.Source || 'Direct',
          company: l.company || l.Company || 'Unknown Enterprise',
          contact: l.contact || l.Contact || l.contactName || l.ContactName || '',
          phone: (l.phone || l.Phone) === '#ERROR!' ? '' : (l.phone || l.Phone || ''),
          email: l.email || l.Email || '',
          productInterest: l.product || l.Product || l.productInterest || l.ProductInterest || '',
          quantity: String(l.qty !== undefined ? l.qty : (l.quantity !== undefined ? l.quantity : (l.Quantity || ''))),
          estimatedValue: Number(l.value !== undefined ? l.value : (l.Value !== undefined ? l.Value : (l.estimatedValue || l.EstimatedValue || 0))),
          stage: l.stage || l.Stage || 'New Lead',
          nextFollowUp: l.lastActivity || l.nextFollowUp || l.NextFollowUp || '',
          owner: l.assignedTo || l.owner || l.Owner || 'Sales Team',
          lostReason: l.lostReason || l.LostReason || '',
          notes: l.notes || l.Notes || '',
          gmailThreadId: l.gmailThreadId || l.GmailThreadId || ''
        }));
        StorageService.save(StorageService.KEYS.LEADS, normalizedLeads);

        // 2. Orders (Maruti Suzuki, Bajaj Auto, Sundram Fasteners)
        const rawOrders = json.orders || [];
        let normalizedOrders = rawOrders.filter(o => o.id || o.OrderID || o.customer || o.Customer).map(o => {
          let items = [];
          try {
            items = typeof o.Items === 'string' ? JSON.parse(o.Items) : (o.Items || o.items || []);
          } catch (e) {
            items = [];
          }
          if (items.length === 0 && (o.product || o.Product)) {
            items = [{
              name: o.product || o.Product,
              qty: o.qty || o.Quantity || 1,
              rate: o.unitPrice || 0,
              amount: Number(o.total || o.Total || (Number(o.qty || 1) * Number(o.unitPrice || 0)))
            }];
          }
          const compName = o.customer || o.Customer || o.company || o.Company || 'Client';
          const totalVal = Number(o.total !== undefined ? o.total : (o.Total !== undefined ? o.Total : (Number(o.qty || 0) * Number(o.unitPrice || 0))));
          const statusStr = o.status || o.Status || o.deliveryStatus || o.DeliveryStatus || 'Processing';
          const isCompleted = statusStr.toLowerCase() === 'completed';
          return {
            id: o.id || o.OrderID,
            date: o.orderDate || o.Date || o.date || '2026-08-20',
            quoteId: o.rfqId || o.quoteId || o.QuoteID || '',
            customerId: o.customerId || o.CustomerID || '',
            customerName: compName,
            items: items,
            total: totalVal,
            amountPaid: Number(o.amountPaid !== undefined ? o.amountPaid : (o.AmountPaid !== undefined ? o.AmountPaid : (isCompleted ? totalVal : 0))),
            paymentStatus: isCompleted ? 'Paid' : (o.paymentStatus || o.PaymentStatus || 'Pending'),
            deliveryStatus: statusStr,
            dispatchDate: o.dueDate || o.dispatchDate || o.DispatchDate || '',
            lrNumber: o.material || o.lrNumber || o.LRNumber || '',
            transporter: o.wireGauge || o.transporter || o.Transporter || '',
            notes: o.notes || o.Notes || (o.progress !== undefined ? `Production Progress: ${o.progress}%` : '')
          };
        });
        StorageService.save(StorageService.KEYS.ORDERS, normalizedOrders);

        // 3. Customers (Synthesized from direct table, leads, orders, rfqs)
        const customerMap = new Map();
        // Check if explicit customers exist
        (json.customers || []).concat(json.clients || []).forEach(c => {
          const comp = c.company || c.Company || c.name || c.Name;
          if (comp) {
            customerMap.set(comp.toLowerCase(), {
              id: c.id || c.CustomerID || `C-${Math.floor(1000 + Math.random()*9000)}`,
              company: comp,
              contact: c.contact || c.Contact || c.contactName || c.ContactName || '',
              phone: (c.phone || c.Phone) === '#ERROR!' ? '' : (c.phone || c.Phone || ''),
              whatsapp: (c.phone || c.Phone) === '#ERROR!' ? '' : (c.whatsapp || c.WhatsApp || c.phone || c.Phone || ''),
              email: c.email || c.Email || '',
              gstin: c.gstin || c.GSTIN || '',
              city: c.city || c.City || c.location || '',
              state: c.state || c.State || 'Maharashtra',
              industry: c.industry || c.Industry || 'Automotive & Industrial',
              source: c.source || c.Source || 'Direct',
              status: c.status || c.Status || 'Active',
              notes: c.notes || c.notes || '',
              createdAt: c.createdAt || c.CreatedAt || '2026-08-01'
            });
          }
        });

        // Add from orders
        normalizedOrders.forEach((o, idx) => {
          if (o.customerName && !customerMap.has(o.customerName.toLowerCase())) {
            customerMap.set(o.customerName.toLowerCase(), {
              id: `C-100${idx + 1}`,
              company: o.customerName,
              contact: '',
              phone: '',
              whatsapp: '',
              email: '',
              gstin: '',
              city: 'Industrial Zone',
              state: 'Maharashtra',
              industry: 'Automotive OEM',
              source: 'Direct Client',
              status: 'Active',
              notes: `Customer linked to Order ${o.id}`,
              createdAt: o.date
            });
          }
        });

        // Add from leads
        normalizedLeads.forEach((l, idx) => {
          if (l.company && !customerMap.has(l.company.toLowerCase())) {
            customerMap.set(l.company.toLowerCase(), {
              id: `C-200${idx + 1}`,
              company: l.company,
              contact: l.contact,
              phone: l.phone,
              whatsapp: l.phone,
              email: l.email,
              gstin: '',
              city: 'Industrial Zone',
              state: 'Maharashtra',
              industry: 'Engineering & Manufacturing',
              source: l.source,
              status: 'Active',
              notes: `Prospective Client from Lead ${l.id} (${l.stage})`,
              createdAt: l.createdAt
            });
          }
        });

        const normalizedCustomers = Array.from(customerMap.values());
        StorageService.save(StorageService.KEYS.CUSTOMERS, normalizedCustomers);

        // 4. Products / Inventory (Spring Steel Gr. 2, Stainless Steel 304, High Carbon Steel)
        const rawInventory = (json.inventory && json.inventory.length > 0) ? json.inventory : (json.products || []);
        const normalizedProducts = rawInventory.filter(p => p.id || p.SKU || p.sku || p.material || p.name).map(p => ({
          sku: p.id || p.SKU || p.sku,
          name: p.material || p.name || p.Name || 'Raw Material',
          category: p.wireGauge ? `Spring Wire (${p.wireGauge})` : (p.category || p.Category || 'Industrial Steel'),
          hsn: String(p.lotNumber || p.hsn || p.HSN || '7217'),
          unit: p.unit || p.uom || 'Kg',
          costPrice: Number(p.unitCost || p.costPrice || p.CostPrice || (p.minQtyKg ? 85 : 0)),
          sellPrice: Number(p.sellPrice || p.SellPrice || (p.unitCost ? Number(p.unitCost) * 1.3 : 110)),
          gstPercent: Number(p.gstPercent || p.GSTPercent || 18),
          stock: Number(p.qtyKg !== undefined ? p.qtyKg : (p.stock !== undefined ? p.stock : (p.Stock || 0))),
          supplierId: p.supplier || p.supplierId || p.SupplierID || '',
          active: (p.status || p.Status) !== 'Critical'
        }));
        StorageService.save(StorageService.KEYS.PRODUCTS, normalizedProducts);

        // 5. Suppliers / Vendors (Tata Steel Wire Division, Sundram Fasteners Ltd)
        const rawVendors = (json.vendors && json.vendors.length > 0) ? json.vendors : (json.suppliers || []);
        const normalizedSuppliers = rawVendors.filter(s => s.id || s.SupplierID || s.name || s.company).map(s => ({
          id: s.id || s.SupplierID,
          company: s.name || s.company || s.Company || 'Industrial Supplier',
          contact: s.contact || s.ContactName || '',
          phone: (s.phone || s.Phone) === '#ERROR!' ? '' : (s.phone || s.Phone || ''),
          email: s.email || s.Email || '',
          gstin: s.gstin || s.GSTIN || '',
          city: s.location || s.city || s.City || '',
          productsSupplied: Array.isArray(s.materials) ? s.materials.join(', ') : (s.materials || s.productsSupplied || 'Spring Wires, Alloy Steels'),
          paymentTerms: s.paymentTerms || s.PaymentTerms || '30 Days Credit',
          notes: `Vendor Rating: ${s.rating || 5} Stars | Lead Time: ${s.leadTime || '7-10 days'}`
        }));
        StorageService.save(StorageService.KEYS.SUPPLIERS, normalizedSuppliers);

        // 6. Quotes / RFQs (Ministry of Defence, Precision Engineering Corp)
        const rawRfqs = (json.rfqs && json.rfqs.length > 0) ? json.rfqs : (json.quotes || []);
        const normalizedQuotes = rawRfqs.filter(q => q.id || q.QuoteID).map(q => {
          let items = [];
          try {
            items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || q.Items || []);
          } catch (e) {
            items = [];
          }
          const compName = q.customer || q.Customer || q.customerName || 'Defence Agency';
          const totalVal = Number(q.quotedAmount || q.total || q.Total || 0);
          const gstVal = totalVal * 0.18;
          const subtotalVal = totalVal - gstVal;
          const statusLower = (q.status || q.Status || 'Draft').toLowerCase();
          return {
            id: q.id || q.QuoteID,
            date: q.receivedDate || q.date || q.Date || '2026-08-24',
            customerId: q.customerId || q.CustomerID || '',
            customerName: compName,
            leadId: q.convertedOrderId || '',
            items: items,
            subtotal: subtotalVal,
            cgst: gstVal / 2,
            sgst: gstVal / 2,
            igst: 0,
            gstTotal: gstVal,
            total: totalVal,
            validTill: q.deadline || q.validTill || q.ValidTill || '2026-09-04',
            status: statusLower === 'quoted' ? 'Sent' : (statusLower === 'received' ? 'Draft' : 'Sent'),
            pdfLink: q.pdfLink || q.PDFLink || '',
            notes: q.notes || q.Notes || q.sourceRef || ''
          };
        });
        StorageService.save(StorageService.KEYS.QUOTES, normalizedQuotes);

        // 7. Payments
        let normalizedPayments = [];
        if (json.payments && Array.isArray(json.payments) && json.payments.length > 0) {
          normalizedPayments = json.payments.filter(p => p.id || p.PaymentID).map(p => {
            const ord = normalizedOrders.find(o => o.id === (p.orderId || p.OrderID));
            return {
              id: p.id || p.PaymentID,
              orderId: p.orderId || p.OrderID,
              customerName: ord ? ord.customerName : 'Client',
              date: p.date || p.Date || '2026-08-15',
              amount: Number(p.amount || p.Amount || 0),
              mode: p.mode || p.Mode || 'Bank Transfer',
              reference: p.reference || p.Reference || '',
              notes: p.notes || p.Notes || ''
            };
          });
        }
        // Auto-link completed orders (e.g. Sundram Fasteners ₹1,25,000 paid)
        if (normalizedPayments.length === 0) {
          normalizedOrders.filter(o => o.paymentStatus === 'Paid' || o.amountPaid > 0).forEach((ord, i) => {
            normalizedPayments.push({
              id: `PAY-2026-${100 + i + 1}`,
              orderId: ord.id,
              customerName: ord.customerName,
              date: ord.date,
              amount: ord.amountPaid || ord.total,
              mode: 'Bank Transfer (RTGS)',
              reference: `UTR-HDFC-202608-${9021 + i}`,
              notes: `Settled payment for order ${ord.id}`
            });
          });
        }

        // Cross-reconcile order amountPaid & paymentStatus with payments ledger
        const paymentsByOrder = new Map();
        normalizedPayments.forEach(p => {
          if (p.orderId) {
            const cur = paymentsByOrder.get(p.orderId) || 0;
            paymentsByOrder.set(p.orderId, cur + (Number(p.amount) || 0));
          }
        });

        normalizedOrders = normalizedOrders.map(ord => {
          const recordedPaid = paymentsByOrder.get(ord.id) || 0;
          const currentPaid = Math.max(ord.amountPaid || 0, recordedPaid);
          const isFullyPaid = currentPaid >= ord.total && ord.total > 0;
          const isPartial = currentPaid > 0 && currentPaid < ord.total;
          return {
            ...ord,
            amountPaid: currentPaid,
            paymentStatus: isFullyPaid ? 'Paid' : (isPartial ? 'Partial' : ord.paymentStatus)
          };
        });
        StorageService.save(StorageService.KEYS.ORDERS, normalizedOrders);
        StorageService.save(StorageService.KEYS.PAYMENTS, normalizedPayments);

        // 8. Outward Payments (Vendor & Expense Payouts)
        let normalizedOutwardPayments = [];
        if (json.outwardPayments && Array.isArray(json.outwardPayments) && json.outwardPayments.length > 0) {
          normalizedOutwardPayments = json.outwardPayments.filter(p => p.id || p.PaymentID || p.payee || p.Payee).map(p => ({
            id: p.id || p.PaymentID,
            date: p.date || p.Date || '2026-08-25',
            payee: p.payee || p.Payee || p.vendorName || p.VendorName || 'Vendor',
            vendorId: p.vendorId || p.VendorID || '',
            category: p.category || p.Category || 'Raw Material Purchase',
            amount: Number(p.amount !== undefined ? p.amount : (p.Amount !== undefined ? p.Amount : 0)),
            mode: p.mode || p.Mode || 'Bank Transfer (RTGS)',
            reference: p.reference || p.Reference || '',
            notes: p.notes || p.Notes || ''
          }));
        }
        StorageService.save(StorageService.KEYS.OUTWARD_PAYMENTS, normalizedOutwardPayments);

        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to fetch from Google Sheets' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
