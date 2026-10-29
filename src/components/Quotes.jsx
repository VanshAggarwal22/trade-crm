import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  MessageCircle, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  X, 
  ArrowRight,
  Package
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { generateQuotePrint } from '../services/pdfGenerator';
import { SheetSyncService } from '../services/sheetSync';

export default function Quotes({ prefillData, onConvertToOrder, showToast }) {
  const [quotes, setQuotes] = useState(() => StorageService.get(StorageService.KEYS.QUOTES));
  const [customers, setCustomers] = useState(() => StorageService.get(StorageService.KEYS.CUSTOMERS));
  const [products, setProducts] = useState(() => StorageService.get(StorageService.KEYS.PRODUCTS));
  const [settings] = useState(() => StorageService.getSettings());

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);

  // Form State
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quoteLeadId, setQuoteLeadId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [quoteValidTill, setQuoteValidTill] = useState(
    new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-GB')
  );
  const [quoteNotes, setQuoteNotes] = useState('Payment: 30 Days. Delivery: Ex-Stock Mumbai. Freight: Extra at actuals.');
  const [lineItems, setLineItems] = useState([
    { sku: '', name: '', hsn: '', qty: 1, unit: 'Kg', rate: 0, gstPct: 18 }
  ]);

  const refreshQuotes = () => {
    setQuotes(StorageService.get(StorageService.KEYS.QUOTES));
    setCustomers(StorageService.get(StorageService.KEYS.CUSTOMERS));
    setProducts(StorageService.get(StorageService.KEYS.PRODUCTS));
  };

  // Open Create Modal (optionally with prefill from Lead)
  const handleOpenAddModal = (prefill = null) => {
    const freshCust = StorageService.get(StorageService.KEYS.CUSTOMERS);
    const freshProd = StorageService.get(StorageService.KEYS.PRODUCTS);
    setCustomers(freshCust);
    setProducts(freshProd);
    setEditingQuote(null);

    if (prefill) {
      setQuoteLeadId(prefill.id || '');
      const matchedCust = freshCust.find(c => c.phone && c.phone === prefill.phone);
      setQuoteCustomer(matchedCust ? matchedCust.id : (freshCust[0]?.id || ''));
      setLineItems([
        { sku: '', name: prefill.productInterest || 'Compression Springs (0.20mm - 18mm)', hsn: '7320', qty: 1000, unit: 'Pcs', rate: 25, gstPct: 18 }
      ]);
    } else {
      setQuoteLeadId('');
      setQuoteCustomer(freshCust[0]?.id || '');
      const defaultProd = freshProd[0];
      setLineItems([
        { 
          sku: defaultProd ? defaultProd.sku : '', 
          name: defaultProd ? defaultProd.name : 'Compression Springs (Grade 2 Spring Steel)', 
          hsn: defaultProd ? defaultProd.hsn : '7320', 
          qty: 1000, 
          unit: defaultProd ? defaultProd.unit : 'Pcs', 
          rate: defaultProd ? defaultProd.sellPrice : 25, 
          gstPct: defaultProd ? defaultProd.gstPercent : 18 
        }
      ]);
    }
    setQuoteDate(new Date().toLocaleDateString('en-GB'));
    setQuoteValidTill(new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-GB'));
    setIsModalOpen(true);
  };

  // Selected customer details
  const selectedCustObj = customers.find(c => c.id === quoteCustomer) || {};
  const isSameState = (settings.state || '').trim().toLowerCase() === (selectedCustObj.state || settings.state || '').trim().toLowerCase();

  // Add line item
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { sku: '', name: '', hsn: '', qty: 1, unit: 'Kg', rate: 0, gstPct: 18 }]);
  };

  // Update line item
  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;

    // If SKU changed, auto-fill product data
    if (field === 'sku') {
      const prod = products.find(p => p.sku === value);
      if (prod) {
        updated[index].name = prod.name;
        updated[index].hsn = prod.hsn;
        updated[index].unit = prod.unit;
        updated[index].rate = prod.sellPrice;
        updated[index].gstPct = prod.gstPercent;
      }
    }
    setLineItems(updated);
  };

  // Remove line item
  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, item) => {
    return acc + ((Number(item.qty) || 0) * (Number(item.rate) || 0));
  }, 0);

  const gstTotal = lineItems.reduce((acc, item) => {
    const itemAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    return acc + ((itemAmount * (Number(item.gstPct) || 18)) / 100);
  }, 0);

  const grandTotal = subtotal + gstTotal;

  // Save Quote
  const handleSaveQuote = (e) => {
    e.preventDefault();
    if (!quoteCustomer && !selectedCustObj.company) {
      alert('Please select or specify a customer.');
      return;
    }

    const currentQuotes = StorageService.get(StorageService.KEYS.QUOTES);
    const newId = editingQuote ? editingQuote.id : StorageService.generateId(StorageService.KEYS.QUOTES, 'Q');

    const quoteRecord = {
      id: newId,
      date: quoteDate,
      customerId: selectedCustObj.id || 'C-DIRECT',
      customerName: selectedCustObj.company || 'Customer',
      customerContact: selectedCustObj.contact || '',
      customerPhone: selectedCustObj.phone || '',
      customerEmail: selectedCustObj.email || '',
      customerGstin: selectedCustObj.gstin || '',
      customerState: selectedCustObj.state || settings.state,
      leadId: quoteLeadId,
      items: lineItems.map(item => ({
        ...item,
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        amount: (Number(item.qty) || 0) * (Number(item.rate) || 0),
        gstPct: Number(item.gstPct) || 18
      })),
      subtotal,
      cgst: isSameState ? gstTotal / 2 : 0,
      sgst: isSameState ? gstTotal / 2 : 0,
      igst: !isSameState ? gstTotal : 0,
      gstTotal,
      total: grandTotal,
      validTill: quoteValidTill,
      status: editingQuote ? editingQuote.status : 'Sent',
      notes: quoteNotes
    };

    if (editingQuote) {
      const updated = currentQuotes.map(q => q.id === editingQuote.id ? quoteRecord : q);
      StorageService.save(StorageService.KEYS.QUOTES, updated);
      SheetSyncService.syncUpdate('Quotes', quoteRecord.id, quoteRecord);
      showToast?.(`Quote ${quoteRecord.id} updated!`);
    } else {
      currentQuotes.unshift(quoteRecord);
      StorageService.save(StorageService.KEYS.QUOTES, currentQuotes);
      SheetSyncService.syncAdd('Quotes', quoteRecord);
      showToast?.(`Quote ${newId} created!`);

      // If linked to lead, update lead stage to Quoted
      if (quoteLeadId) {
        const leads = StorageService.get(StorageService.KEYS.LEADS);
        const updatedLeads = leads.map(l => l.id === quoteLeadId ? { ...l, stage: 'Quoted' } : l);
        StorageService.save(StorageService.KEYS.LEADS, updatedLeads);
        SheetSyncService.syncUpdate('Leads', quoteLeadId, { Stage: 'Quoted' });
      }
    }

    setIsModalOpen(false);
    refreshQuotes();
  };

  const handleDeleteQuote = (id) => {
    if (!window.confirm(`Delete quote ${id}?`)) return;
    const currentQuotes = StorageService.get(StorageService.KEYS.QUOTES);
    const updated = currentQuotes.filter(q => q.id !== id);
    StorageService.save(StorageService.KEYS.QUOTES, updated);
    SheetSyncService.syncDelete('Quotes', id);
    refreshQuotes();
    showToast?.('Quote deleted');
  };

  const handlePrint = (quote) => {
    generateQuotePrint(quote, settings);
  };

  const handleShareWhatsApp = (quote) => {
    const cust = customers.find(c => c.id === quote.customerId) || {};
    const phone = (quote.customerPhone || cust.phone || '').replace(/[^0-9]/g, '');

    let text = `*QUOTATION - ${settings.companyName}*\n`;
    text += `*Quote No:* ${quote.id}\n`;
    text += `*Date:* ${quote.date}\n`;
    text += `*Client:* ${quote.customerName}\n`;
    text += `--------------------------\n`;
    (quote.items || []).forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}*\n   Qty: ${item.qty} ${item.unit} @ ₹${item.rate}/${item.unit} = ₹${(item.amount || item.qty * item.rate).toLocaleString('en-IN')}\n`;
    });
    text += `--------------------------\n`;
    text += `*Subtotal:* ₹${Number(quote.subtotal || 0).toLocaleString('en-IN')}\n`;
    text += `*GST Total:* ₹${Number(quote.gstTotal || 0).toLocaleString('en-IN')}\n`;
    text += `*Grand Total:* ₹${Number(quote.total || 0).toLocaleString('en-IN')}\n`;
    text += `*Validity:* ${quote.validTill}\n\n`;
    text += `Please find the quotation summary above. Mill test certificates & tax invoice will be issued on confirmation. Let us know to proceed with dispatch!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleConvertToOrder = (quote) => {
    const orders = StorageService.get(StorageService.KEYS.ORDERS);
    const orderId = StorageService.generateId(StorageService.KEYS.ORDERS, 'O');

    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString('en-GB'),
      quoteId: quote.id,
      customerId: quote.customerId,
      customerName: quote.customerName,
      items: quote.items,
      total: quote.total,
      amountPaid: 0,
      paymentStatus: 'Pending',
      deliveryStatus: 'Processing',
      dispatchDate: '',
      lrNumber: '',
      transporter: '',
      notes: `Generated from Quote ${quote.id}`
    };

    orders.unshift(newOrder);
    StorageService.save(StorageService.KEYS.ORDERS, orders);
    SheetSyncService.syncAdd('Orders', newOrder);

    // Update Quote status to Accepted
    const currentQuotes = StorageService.get(StorageService.KEYS.QUOTES);
    const updatedQuotes = currentQuotes.map(q => q.id === quote.id ? { ...q, status: 'Accepted' } : q);
    StorageService.save(StorageService.KEYS.QUOTES, updatedQuotes);
    SheetSyncService.syncUpdate('Quotes', quote.id, { Status: 'Accepted' });
    refreshQuotes();

    showToast?.(`Order ${orderId} created from Quote ${quote.id}!`);
    if (onConvertToOrder) onConvertToOrder(newOrder);
  };

  const filteredQuotes = quotes.filter(q => {
    const s = searchQuery.toLowerCase();
    return (
      (q.id || '').toLowerCase().includes(s) ||
      (q.customerName || '').toLowerCase().includes(s) ||
      (q.status || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Commercial Quotations</h1>
          <p className="page-description">
            Build GST-compliant estimates, calculate state tax (CGST+SGST vs IGST), and export print-ready PDFs.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => handleOpenAddModal()}>
            <Plus size={16} /> Create New Quote
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search quote number, client, status..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote Ref</th>
                <th>Client</th>
                <th>Materials / Items</th>
                <th>Taxable Value</th>
                <th>Grand Total (Inc. GST)</th>
                <th>Status</th>
                <th>Validity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No quotations found. Click "Create New Quote" to build your first industrial estimate!
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(q => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.id}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{q.date}</div>
                    </td>
                    <td>
                      <strong>{q.customerName}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{q.customerState || 'State N/A'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px' }}>
                        {(q.items || []).map(i => `${i.qty} ${i.unit} ${i.name}`).slice(0, 2).join(', ')}
                        {(q.items || []).length > 2 ? ` +${(q.items || []).length - 2} more` : ''}
                      </span>
                    </td>
                    <td>₹{Number(q.subtotal || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <strong style={{ color: '#1e40af', fontSize: '14px' }}>
                        ₹{Number(q.total || 0).toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge badge-${q.status.toLowerCase()}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>{q.validTill}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-primary btn-icon"
                          title="Print / Save PDF"
                          onClick={() => handlePrint(q)}
                        >
                          <Printer size={13} />
                        </button>
                        <button 
                          className="btn btn-whatsapp btn-icon"
                          title="Share on WhatsApp"
                          onClick={() => handleShareWhatsApp(q)}
                        >
                          <MessageCircle size={13} />
                        </button>
                        {q.status !== 'Accepted' && (
                          <button 
                            className="btn btn-secondary btn-icon"
                            title="Convert to Confirmed Order"
                            onClick={() => handleConvertToOrder(q)}
                          >
                            <CheckSquare size={13} color="#16a34a" />
                          </button>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon"
                          title="Delete Quote"
                          onClick={() => handleDeleteQuote(q.id)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Builder Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingQuote ? `Edit Quote ${editingQuote.id}` : 'Create Commercial Quotation'}
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveQuote}>
              <div className="modal-body">
                {/* Header Info */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Select Customer Account *</label>
                    <select 
                      className="form-control"
                      value={quoteCustomer}
                      onChange={(e) => setQuoteCustomer(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company} ({c.city}, {c.state})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Type Auto-Detected</label>
                    <div style={{ padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                      {isSameState ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Intra-State: CGST (9%) + SGST (9%)</span>
                      ) : (
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>Inter-State: IGST (18%)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quotation Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid Until</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={quoteValidTill}
                      onChange={(e) => setQuoteValidTill(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items Builder */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '13.5px', fontWeight: 700 }}>
                      Materials & Line Items
                    </label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>

                  {lineItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        padding: '12px', 
                        borderRadius: '6px', 
                        marginBottom: '10px' 
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Pick SKU or Type Name</label>
                          <select 
                            className="form-control" 
                            style={{ fontSize: '12px', marginBottom: '4px' }}
                            value={item.sku}
                            onChange={(e) => handleLineItemChange(idx, 'sku', e.target.value)}
                          >
                            <option value="">-- Custom Material --</option>
                            {products.map(p => (
                              <option key={p.sku} value={p.sku}>
                                {p.sku}: {p.name} (Stock: {p.stock} {p.unit})
                              </option>
                            ))}
                          </select>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Material Description"
                            value={item.name}
                            onChange={(e) => handleLineItemChange(idx, 'name', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>HSN Code</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="7208"
                            value={item.hsn}
                            onChange={(e) => handleLineItemChange(idx, 'hsn', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Quantity</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            value={item.qty}
                            onChange={(e) => handleLineItemChange(idx, 'qty', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Unit</label>
                          <select 
                            className="form-control"
                            value={item.unit}
                            onChange={(e) => handleLineItemChange(idx, 'unit', e.target.value)}
                          >
                            <option value="Kg">Kg</option>
                            <option value="Metre">Metre</option>
                            <option value="Piece">Piece</option>
                            <option value="Ton">Ton</option>
                            <option value="Box">Box</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>Rate (₹)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            className="form-control" 
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(idx, 'rate', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b' }}>GST %</label>
                          <select 
                            className="form-control"
                            value={item.gstPct}
                            onChange={(e) => handleLineItemChange(idx, 'gstPct', e.target.value)}
                          >
                            <option value="18">18%</option>
                            <option value="12">12%</option>
                            <option value="5">5%</option>
                            <option value="28">28%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>

                        <div>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon"
                            onClick={() => handleRemoveLineItem(idx)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Block */}
                <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Taxable Subtotal:</span>
                      <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {isSameState ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                          <span>CGST (Central Tax):</span>
                          <span>₹{(gstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                          <span>SGST (State Tax):</span>
                          <span>₹{(gstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                        <span>IGST (Integrated Tax):</span>
                        <span>₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#1e40af' }}>
                      <span>Grand Total:</span>
                      <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Commercial Terms Notes */}
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Payment & Delivery Terms</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
