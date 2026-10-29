import React, { useState } from 'react';
import { 
  Search, 
  Truck, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  FileText, 
  IndianRupee, 
  Trash2,
  X,
  PackageCheck
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

export default function Orders({ onRecordPayment, showToast }) {
  const [orders, setOrders] = useState(() => StorageService.get(StorageService.KEYS.ORDERS));
  const [customers] = useState(() => StorageService.get(StorageService.KEYS.CUSTOMERS));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit Dispatch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dispatchData, setDispatchData] = useState({
    deliveryStatus: 'Dispatched',
    dispatchDate: new Date().toLocaleDateString('en-GB'),
    lrNumber: '',
    transporter: '',
    notes: ''
  });

  const refreshOrders = () => {
    setOrders(StorageService.get(StorageService.KEYS.ORDERS));
  };

  const handleOpenDispatchModal = (order) => {
    setSelectedOrder(order);
    setDispatchData({
      deliveryStatus: order.deliveryStatus || 'Dispatched',
      dispatchDate: order.dispatchDate || new Date().toLocaleDateString('en-GB'),
      lrNumber: order.lrNumber || '',
      transporter: order.transporter || '',
      notes: order.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveDispatch = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const currentOrders = StorageService.get(StorageService.KEYS.ORDERS);
    const updated = currentOrders.map(o => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          ...dispatchData
        };
      }
      return o;
    });

    StorageService.save(StorageService.KEYS.ORDERS, updated);
    SheetSyncService.syncUpdate('Orders', selectedOrder.id, dispatchData);
    setIsModalOpen(false);
    refreshOrders();
    showToast?.(`Order ${selectedOrder.id} dispatch details updated!`);
  };

  const handleDeleteOrder = (id) => {
    if (!window.confirm(`Delete order ${id}?`)) return;
    const currentOrders = StorageService.get(StorageService.KEYS.ORDERS);
    const updated = currentOrders.filter(o => o.id !== id);
    StorageService.save(StorageService.KEYS.ORDERS, updated);
    SheetSyncService.syncDelete('Orders', id);
    refreshOrders();
    showToast?.(`Order ${id} deleted`);
  };

  const handleShareDispatchWhatsApp = (order) => {
    const cust = customers.find(c => c.id === order.customerId) || {};
    const phone = (cust.phone || '').replace(/[^0-9]/g, '');

    let text = `*DISPATCH ADVICE - ${order.customerName}*\n`;
    text += `*Order Ref:* ${order.id}\n`;
    text += `*Status:* ${order.deliveryStatus}\n`;
    text += `*Dispatch Date:* ${order.dispatchDate || 'Today'}\n`;
    text += `*Transporter:* ${order.transporter || 'Direct Truck'}\n`;
    text += `*Bilty / LR No:* ${order.lrNumber || 'Handover Challan'}\n`;
    text += `--------------------------\n`;
    text += `Your material has been dispatched from warehouse. Please keep un-loading facility and road-permit/e-way bill ready at your site. Thank you for your business!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    const matchesQuery = 
      (o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.lrNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'All') return matchesQuery;
    return matchesQuery && o.deliveryStatus === statusFilter;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Fulfillment & Logistics</h1>
          <p className="page-description">
            Track material packing, lorry receipts (LR/Bilty), transport logistics, and delivery status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Processing', 'Dispatched', 'Delivered'].map(st => (
            <button 
              key={st}
              className="btn btn-secondary btn-sm"
              style={{ background: statusFilter === st ? '#e2e8f0' : 'transparent' }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search order #, customer, LR number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Client</th>
                <th>Total Value</th>
                <th>Payment Status</th>
                <th>Delivery Status</th>
                <th>Logistics / LR No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No orders matching filter. When a quotation is accepted, convert it to an order to start fulfillment!
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const balance = (Number(order.total) || 0) - (Number(order.amountPaid) || 0);

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.id}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Quote: {order.quoteId || 'Direct'}</div>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{order.date}</div>
                      </td>
                      <td>
                        <strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong>
                        {balance > 0 && (
                          <div style={{ fontSize: '11px', color: '#dc2626' }}>
                            Bal: ₹{balance.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${order.paymentStatus.toLowerCase()}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${order.deliveryStatus.toLowerCase()}`}>
                          {order.deliveryStatus}
                        </span>
                      </td>
                      <td>
                        {order.lrNumber ? (
                          <div>
                            <strong>{order.lrNumber}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{order.transporter}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Awaiting Dispatch</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-secondary btn-icon"
                            title="Update Dispatch / LR"
                            onClick={() => handleOpenDispatchModal(order)}
                          >
                            <Truck size={13} color="#2563eb" />
                          </button>

                          {order.deliveryStatus === 'Dispatched' && (
                            <button 
                              className="btn btn-whatsapp btn-icon"
                              title="Share LR on WhatsApp"
                              onClick={() => handleShareDispatchWhatsApp(order)}
                            >
                              <MessageCircle size={13} />
                            </button>
                          )}

                          {order.paymentStatus !== 'Paid' && (
                            <button 
                              className="btn btn-secondary btn-icon"
                              title="Record Payment"
                              onClick={() => onRecordPayment?.(order)}
                            >
                              <IndianRupee size={13} color="#16a34a" />
                            </button>
                          )}

                          <button 
                            className="btn btn-secondary btn-icon"
                            title="Delete Order"
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {isModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">Update Dispatch: {selectedOrder.id}</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDispatch}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Delivery Status</label>
                    <select 
                      className="form-control"
                      value={dispatchData.deliveryStatus}
                      onChange={(e) => setDispatchData({ ...dispatchData, deliveryStatus: e.target.value })}
                    >
                      <option value="Processing">Processing / Packing</option>
                      <option value="Dispatched">Dispatched / En Route</option>
                      <option value="Delivered">Delivered & Signed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dispatch Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={dispatchData.dispatchDate}
                      onChange={(e) => setDispatchData({ ...dispatchData, dispatchDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Transporter / Freight Carrier Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. VRL Logistics, TCI Express, Direct Truck"
                      value={dispatchData.transporter}
                      onChange={(e) => setDispatchData({ ...dispatchData, transporter: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lorry Receipt (LR) / Bilty No</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. LR-9948271"
                      value={dispatchData.lrNumber}
                      onChange={(e) => setDispatchData({ ...dispatchData, lrNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Logistics Notes</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    placeholder="Vehicle number, driver contact, delivery instructions..."
                    value={dispatchData.notes}
                    onChange={(e) => setDispatchData({ ...dispatchData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Logistics Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
