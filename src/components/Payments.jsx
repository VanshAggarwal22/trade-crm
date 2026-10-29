import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  Clock, 
  FileText, 
  Trash2,
  X,
  Truck,
  Building2,
  Layers
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

export default function Payments({ initialOrder, showToast }) {
  const [activeTab, setActiveTab] = useState('inward'); // 'inward' or 'outward'
  const [payments, setPayments] = useState(() => StorageService.get(StorageService.KEYS.PAYMENTS));
  const [outwardPayments, setOutwardPayments] = useState(() => StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || []);
  const [orders, setOrders] = useState(() => StorageService.get(StorageService.KEYS.ORDERS));
  const [suppliers, setSuppliers] = useState(() => StorageService.get(StorageService.KEYS.SUPPLIERS));
  const [searchQuery, setSearchQuery] = useState('');

  // Inward Modal State
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrder ? initialOrder.id : '');
  const [inwardAmount, setInwardAmount] = useState('');
  const [inwardMode, setInwardMode] = useState('Bank Transfer (RTGS/NEFT)');
  const [inwardDate, setInwardDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [inwardRef, setInwardRef] = useState('');
  const [inwardNotes, setInwardNotes] = useState('');

  // Outward Modal State
  const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [customPayeeName, setCustomPayeeName] = useState('');
  const [outwardCategory, setOutwardCategory] = useState('Raw Material Purchase');
  const [outwardAmount, setOutwardAmount] = useState('');
  const [outwardMode, setOutwardMode] = useState('Bank Transfer (RTGS/NEFT)');
  const [outwardDate, setOutwardDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [outwardRef, setOutwardRef] = useState('');
  const [outwardNotes, setOutwardNotes] = useState('');

  const refreshData = () => {
    setPayments(StorageService.get(StorageService.KEYS.PAYMENTS));
    setOutwardPayments(StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || []);
    setOrders(StorageService.get(StorageService.KEYS.ORDERS));
    setSuppliers(StorageService.get(StorageService.KEYS.SUPPLIERS));
  };

  // --- INWARD PAYMENT HANDLERS ---
  const handleOpenInwardModal = (order = null) => {
    const targetOrder = order || orders.find(o => o.paymentStatus !== 'Paid') || orders[0];
    if (targetOrder) {
      setSelectedOrderId(targetOrder.id);
      const balance = (Number(targetOrder.total) || 0) - (Number(targetOrder.amountPaid) || 0);
      setInwardAmount(balance > 0 ? balance : targetOrder.total);
    }
    setInwardDate(new Date().toLocaleDateString('en-GB'));
    setInwardRef('');
    setInwardNotes('');
    setIsInwardModalOpen(true);
  };

  const handleSaveInwardPayment = (e) => {
    e.preventDefault();
    const amt = Number(inwardAmount);
    if (!selectedOrderId || amt <= 0) {
      alert('Please select an order and enter a valid payment amount.');
      return;
    }

    const currentPayments = StorageService.get(StorageService.KEYS.PAYMENTS);
    const currentOrders = StorageService.get(StorageService.KEYS.ORDERS);

    const targetOrder = currentOrders.find(o => o.id === selectedOrderId);
    if (!targetOrder) {
      alert('Selected order not found.');
      return;
    }

    const newPaymentId = StorageService.generateId(StorageService.KEYS.PAYMENTS, 'P');
    const paymentRecord = {
      id: newPaymentId,
      orderId: selectedOrderId,
      customerName: targetOrder.customerName,
      date: inwardDate,
      amount: amt,
      mode: inwardMode,
      reference: inwardRef,
      notes: inwardNotes
    };

    currentPayments.unshift(paymentRecord);
    StorageService.save(StorageService.KEYS.PAYMENTS, currentPayments);

    // Auto-update order payment status
    const newAmountPaid = (Number(targetOrder.amountPaid) || 0) + amt;
    const orderTotal = Number(targetOrder.total) || 0;
    let newStatus = 'Partial';
    if (newAmountPaid >= orderTotal) {
      newStatus = 'Paid';
    } else if (newAmountPaid <= 0) {
      newStatus = 'Pending';
    }

    const updatedOrders = currentOrders.map(o => {
      if (o.id === selectedOrderId) {
        return {
          ...o,
          amountPaid: newAmountPaid,
          paymentStatus: newStatus
        };
      }
      return o;
    });

    StorageService.save(StorageService.KEYS.ORDERS, updatedOrders);
    SheetSyncService.syncAdd('Payments', paymentRecord);
    SheetSyncService.syncUpdate('Orders', selectedOrderId, { AmountPaid: newAmountPaid, PaymentStatus: newStatus });
    setIsInwardModalOpen(false);
    refreshData();
    showToast?.(`Inward payment ${newPaymentId} recorded! Order ${selectedOrderId} marked as ${newStatus}.`);
  };

  const handleDeleteInwardPayment = (id) => {
    if (!window.confirm(`Delete payment record ${id}?`)) return;
    const currentPayments = StorageService.get(StorageService.KEYS.PAYMENTS);
    const updated = currentPayments.filter(p => p.id !== id);
    StorageService.save(StorageService.KEYS.PAYMENTS, updated);
    SheetSyncService.syncDelete('Payments', id);
    refreshData();
    showToast?.(`Payment ${id} deleted`);
  };

  // --- OUTWARD PAYMENT HANDLERS ---
  const handleOpenOutwardModal = () => {
    setSelectedVendorId(suppliers[0]?.id || 'custom');
    setCustomPayeeName('');
    setOutwardCategory('Raw Material Purchase');
    setOutwardAmount('');
    setOutwardDate(new Date().toLocaleDateString('en-GB'));
    setOutwardRef('');
    setOutwardNotes('');
    setIsOutwardModalOpen(true);
  };

  const handleSaveOutwardPayment = (e) => {
    e.preventDefault();
    const amt = Number(outwardAmount);
    if (amt <= 0) {
      alert('Please enter a valid outward payment amount.');
      return;
    }

    let payeeName = customPayeeName;
    let vendorId = '';
    if (selectedVendorId && selectedVendorId !== 'custom') {
      const v = suppliers.find(s => s.id === selectedVendorId);
      if (v) {
        payeeName = v.company;
        vendorId = v.id;
      }
    }

    if (!payeeName) {
      alert('Please specify the payee / vendor name.');
      return;
    }

    const currentOutward = StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || [];
    const newId = StorageService.generateId(StorageService.KEYS.OUTWARD_PAYMENTS, 'OUT');
    const outwardRecord = {
      id: newId,
      date: outwardDate,
      payee: payeeName,
      vendorId: vendorId,
      category: outwardCategory,
      amount: amt,
      mode: outwardMode,
      reference: outwardRef,
      notes: outwardNotes
    };

    currentOutward.unshift(outwardRecord);
    StorageService.save(StorageService.KEYS.OUTWARD_PAYMENTS, currentOutward);
    SheetSyncService.syncAdd('OutwardPayments', outwardRecord);
    setIsOutwardModalOpen(false);
    refreshData();
    showToast?.(`Outward payment ${newId} (₹${amt.toLocaleString('en-IN')}) recorded for ${payeeName}!`);
  };

  const handleDeleteOutwardPayment = (id) => {
    if (!window.confirm(`Delete outward payout record ${id}?`)) return;
    const currentOutward = StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || [];
    const updated = currentOutward.filter(p => p.id !== id);
    StorageService.save(StorageService.KEYS.OUTWARD_PAYMENTS, updated);
    SheetSyncService.syncDelete('OutwardPayments', id);
    refreshData();
    showToast?.(`Outward payout ${id} deleted`);
  };

  // Metrics
  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutwardPaid = outwardPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const netCashFlow = totalCollected - totalOutwardPaid;
  const totalOutstanding = orders.reduce((acc, o) => {
    return acc + Math.max(0, (Number(o.total) || 0) - (Number(o.amountPaid) || 0));
  }, 0);

  // Search Filtering
  const filteredInward = payments.filter(p => {
    const s = searchQuery.toLowerCase();
    return (
      (p.id || '').toLowerCase().includes(s) ||
      (p.orderId || '').toLowerCase().includes(s) ||
      (p.customerName || '').toLowerCase().includes(s) ||
      (p.reference || '').toLowerCase().includes(s)
    );
  });

  const filteredOutward = outwardPayments.filter(p => {
    const s = searchQuery.toLowerCase();
    return (
      (p.id || '').toLowerCase().includes(s) ||
      (p.payee || '').toLowerCase().includes(s) ||
      (p.category || '').toLowerCase().includes(s) ||
      (p.reference || '').toLowerCase().includes(s) ||
      (p.notes || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Ledger & Payments</h1>
          <p className="page-description">
            Complete two-way cash flow control: reconcile client inward collections and record vendor outward payouts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleOpenOutwardModal}
            style={{ color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
          >
            <ArrowUpRight size={16} color="#ea580c" /> Record Outward Payout
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenInwardModal()}
          >
            <ArrowDownLeft size={16} /> Record Inward Receipt
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Inward Collected</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtext">
            <span>{payments.length} customer receipts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Total Outward Paid</span>
            <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ea580c' }}>
            ₹{totalOutwardPaid.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtext">
            <span>{outwardPayments.length} vendor / expense payouts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Net Cash Position</span>
            <div className="stat-icon" style={{ background: netCashFlow >= 0 ? '#eff6ff' : '#fef2f2', color: netCashFlow >= 0 ? '#2563eb' : '#dc2626' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: netCashFlow >= 0 ? '#2563eb' : '#dc2626' }}>
            {netCashFlow >= 0 ? `+₹${netCashFlow.toLocaleString('en-IN')}` : `-₹${Math.abs(netCashFlow).toLocaleString('en-IN')}`}
          </div>
          <div className="stat-subtext">
            <span>Net operational cash buffer</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Client Receivables Due</span>
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtext">
            <span>Pending customer invoices</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '3px' }}>
          <button 
            className="btn btn-sm"
            style={{ 
              background: activeTab === 'inward' ? '#10b981' : 'transparent', 
              color: activeTab === 'inward' ? '#fff' : '#64748b',
              border: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('inward')}
          >
            <ArrowDownLeft size={14} /> Inward Receipts ({filteredInward.length})
          </button>
          <button 
            className="btn btn-sm"
            style={{ 
              background: activeTab === 'outward' ? '#ea580c' : 'transparent', 
              color: activeTab === 'outward' ? '#fff' : '#64748b',
              border: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('outward')}
          >
            <ArrowUpRight size={14} /> Outward Payouts ({filteredOutward.length})
          </button>
        </div>

        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder={activeTab === 'inward' ? "Search receipt, order, client, UTR..." : "Search payout ID, vendor, category, UTR..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: INWARD PAYMENTS TABLE */}
      {activeTab === 'inward' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt ID</th>
                  <th>Order Ref & Client</th>
                  <th>Date</th>
                  <th>Amount Received</th>
                  <th>Payment Mode</th>
                  <th>Bank UTR / Cheque Ref</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInward.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No inward payments found. Click "Record Inward Receipt" to log client payments.
                    </td>
                  </tr>
                ) : (
                  filteredInward.map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.id}</strong>
                      </td>
                      <td>
                        <strong>{p.orderId}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{p.customerName || 'Customer'}</div>
                      </td>
                      <td>{p.date}</td>
                      <td>
                        <strong style={{ color: '#16a34a', fontSize: '14px' }}>
                          +₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className="badge badge-paid">{p.mode}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {p.reference || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{p.notes || '-'}</span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-icon"
                          title="Delete Payment"
                          onClick={() => handleDeleteInwardPayment(p.id)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OUTWARD PAYMENTS TABLE */}
      {activeTab === 'outward' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payout ID</th>
                  <th>Payee / Vendor</th>
                  <th>Expense Category</th>
                  <th>Date</th>
                  <th>Amount Paid</th>
                  <th>Payment Mode</th>
                  <th>Bank UTR / Cheque Ref</th>
                  <th>Remarks / PO Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutward.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No outward payouts recorded yet. Click "Record Outward Payout" to log raw material purchases, freight, or vendor settlements.
                    </td>
                  </tr>
                ) : (
                  filteredOutward.map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.id}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#64748b" />
                          <strong>{p.payee}</strong>
                        </div>
                        {p.vendorId && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {p.vendorId}</div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: '#f1f5f9',
                          color: '#334155'
                        }}>
                          {p.category}
                        </span>
                      </td>
                      <td>{p.date}</td>
                      <td>
                        <strong style={{ color: '#ea580c', fontSize: '14px' }}>
                          -₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                          {p.mode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {p.reference || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{p.notes || '-'}</span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-icon"
                          title="Delete Payout"
                          onClick={() => handleDeleteOutwardPayment(p.id)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD INWARD PAYMENT MODAL */}
      {isInwardModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">Record Inward Customer Payment</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsInwardModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveInwardPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Order to Reconcile *</label>
                  <select 
                    className="form-control"
                    value={selectedOrderId}
                    onChange={(e) => {
                      const ordId = e.target.value;
                      setSelectedOrderId(ordId);
                      const ord = orders.find(o => o.id === ordId);
                      if (ord) {
                        const bal = (Number(ord.total) || 0) - (Number(ord.amountPaid) || 0);
                        setInwardAmount(bal > 0 ? bal : ord.total);
                      }
                    }}
                    required
                  >
                    <option value="">-- Choose Order --</option>
                    {orders.map(o => {
                      const bal = (Number(o.total) || 0) - (Number(o.amountPaid) || 0);
                      return (
                        <option key={o.id} value={o.id}>
                          {o.id}: {o.customerName} - Total ₹{Number(o.total).toLocaleString('en-IN')} (Due: ₹{bal.toLocaleString('en-IN')})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount Received (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      value={inwardAmount}
                      onChange={(e) => setInwardAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={inwardDate}
                      onChange={(e) => setInwardDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-control"
                      value={inwardMode}
                      onChange={(e) => setInwardMode(e.target.value)}
                    >
                      <option value="Bank Transfer (RTGS/NEFT)">Bank Transfer (RTGS/NEFT)</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Cheque Deposit">Cheque Deposit</option>
                      <option value="Cash Receipt">Cash Receipt</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank UTR / Transaction Reference</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. HDFCR520261024..."
                      value={inwardRef}
                      onChange={(e) => setInwardRef(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Voucher Notes</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    placeholder="Received from client account, TDS deduction notes, etc."
                    value={inwardNotes}
                    onChange={(e) => setInwardNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInwardModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Inward Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD OUTWARD PAYOUT MODAL */}
      {isOutwardModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#ea580c' }}>Record Outward Payment / Payout</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsOutwardModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOutwardPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Vendor / Supplier *</label>
                  <select 
                    className="form-control"
                    value={selectedVendorId}
                    onChange={(e) => {
                      setSelectedVendorId(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomPayeeName('');
                      }
                    }}
                    required
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.company} ({s.id}) - {s.city || 'India'}
                      </option>
                    ))}
                    <option value="custom">+ Other Payee / Transporter / Service Provider</option>
                  </select>
                </div>

                {selectedVendorId === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Payee / Beneficiary Name *</label>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="e.g. VRL Logistics, Maharashtra State Electricity, Shivam Tooling"
                      value={customPayeeName}
                      onChange={(e) => setCustomPayeeName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Expense / Payout Category</label>
                    <select 
                      className="form-control"
                      value={outwardCategory}
                      onChange={(e) => setOutwardCategory(e.target.value)}
                    >
                      <option value="Raw Material Purchase">Raw Material Purchase (Steel / Wire)</option>
                      <option value="Job Work & Machining">Job Work / Heat Treatment / Machining</option>
                      <option value="Freight & Logistics">Freight, Logistics & Transport (LR)</option>
                      <option value="Tooling & Consumables">Tooling, Dies & Workshop Consumables</option>
                      <option value="Vendor Advance">Vendor Advance / Security Deposit</option>
                      <option value="Factory Rent & Utilities">Factory Rent & Utilities / Power</option>
                      <option value="Office & Administration">Office & Admin Expenses</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="e.g. 85000"
                      value={outwardAmount}
                      onChange={(e) => setOutwardAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payout Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={outwardDate}
                      onChange={(e) => setOutwardDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-control"
                      value={outwardMode}
                      onChange={(e) => setOutwardMode(e.target.value)}
                    >
                      <option value="Bank Transfer (RTGS/NEFT)">Bank Transfer (RTGS/NEFT)</option>
                      <option value="UPI / IMPS">UPI / IMPS</option>
                      <option value="Cheque Issued">Cheque Issued</option>
                      <option value="Cash Payment">Cash Payment</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bank UTR / Cheque Reference Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. UTR-HDFC-20261024-99881"
                    value={outwardRef}
                    onChange={(e) => setOutwardRef(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Purchase Bill / PO Reference</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    placeholder="Invoice #TSW-881, 10-day settlement against delivery of Grade 2 wire"
                    value={outwardNotes}
                    onChange={(e) => setOutwardNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsOutwardModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: '#ea580c', borderColor: '#ea580c' }}
                >
                  Confirm Outward Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
