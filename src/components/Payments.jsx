import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  IndianRupee, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Trash2,
  X 
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

export default function Payments({ initialOrder, showToast }) {
  const [payments, setPayments] = useState(() => StorageService.get(StorageService.KEYS.PAYMENTS));
  const [orders, setOrders] = useState(() => StorageService.get(StorageService.KEYS.ORDERS));
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrder ? initialOrder.id : '');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer (RTGS/NEFT)');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const refreshData = () => {
    setPayments(StorageService.get(StorageService.KEYS.PAYMENTS));
    setOrders(StorageService.get(StorageService.KEYS.ORDERS));
  };

  const handleOpenAddModal = (order = null) => {
    const targetOrder = order || orders.find(o => o.paymentStatus !== 'Paid') || orders[0];
    if (targetOrder) {
      setSelectedOrderId(targetOrder.id);
      const balance = (Number(targetOrder.total) || 0) - (Number(targetOrder.amountPaid) || 0);
      setPaymentAmount(balance > 0 ? balance : targetOrder.total);
    }
    setPaymentDate(new Date().toLocaleDateString('en-GB'));
    setPaymentRef('');
    setPaymentNotes('');
    setIsModalOpen(true);
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
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
      date: paymentDate,
      amount: amt,
      mode: paymentMode,
      reference: paymentRef,
      notes: paymentNotes
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
    setIsModalOpen(false);
    refreshData();
    showToast?.(`Payment ${newPaymentId} recorded! Order ${selectedOrderId} marked as ${newStatus}.`);
  };

  const handleDeletePayment = (id) => {
    if (!window.confirm(`Delete payment record ${id}?`)) return;
    const currentPayments = StorageService.get(StorageService.KEYS.PAYMENTS);
    const updated = currentPayments.filter(p => p.id !== id);
    StorageService.save(StorageService.KEYS.PAYMENTS, updated);
    SheetSyncService.syncDelete('Payments', id);
    refreshData();
    showToast?.(`Payment ${id} deleted`);
  };

  // Metrics
  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutstanding = orders.reduce((acc, o) => {
    return acc + Math.max(0, (Number(o.total) || 0) - (Number(o.amountPaid) || 0));
  }, 0);

  const filteredPayments = payments.filter(p => {
    const s = searchQuery.toLowerCase();
    return (
      (p.id || '').toLowerCase().includes(s) ||
      (p.orderId || '').toLowerCase().includes(s) ||
      (p.customerName || '').toLowerCase().includes(s) ||
      (p.reference || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments & Cash Collection</h1>
          <p className="page-description">
            Reconcile client bank transfers, RTGS/NEFT receipts, and outstanding invoice balances.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => handleOpenAddModal()}>
            <Plus size={16} /> Record Inward Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Collected</span>
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtext">
            <span>{payments.length} verified transactions</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Outstanding Balance</span>
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="stat-subtext">
            <span>Pending receivables</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search payment ID, order, client, UTR..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Payments Table */}
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
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No payments recorded yet. Click "Record Inward Payment" to log your first receipt!
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
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
                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
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
                        onClick={() => handleDeletePayment(p.id)}
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

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">Record Inward Customer Payment</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePayment}>
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
                        setPaymentAmount(bal > 0 ? bal : ord.total);
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
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-control"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
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
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Voucher Notes</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    placeholder="Received from client account, TDS deduction notes, etc."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
