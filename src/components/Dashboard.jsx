import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  FileText, 
  Truck, 
  AlertCircle, 
  IndianRupee, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { StorageService } from '../services/storage';

export default function Dashboard({ setActiveTab, onNewLead, onNewQuote }) {
  const leads = StorageService.get(StorageService.KEYS.LEADS);
  const quotes = StorageService.get(StorageService.KEYS.QUOTES);
  const orders = StorageService.get(StorageService.KEYS.ORDERS);
  const customers = StorageService.get(StorageService.KEYS.CUSTOMERS);
  const outwardPayments = StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || [];
  console.log('[Dashboard Render] leads count:', leads.length, 'quotes count:', quotes.length);

  // Compute metrics
  const activePipelineLeads = leads.filter(l => !['Won', 'Lost'].includes(l.stage));
  const pipelineValue = activePipelineLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

  // Outward Payouts
  const totalOutwardPaid = outwardPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Follow-ups due
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const followUpsDue = leads.filter(l => {
    if (['Won', 'Lost'].includes(l.stage) || !l.nextFollowUp) return false;
    return true; // Simple check for demo / recent
  }).slice(0, 5);

  // Pending Quotes
  const pendingQuotes = quotes.filter(q => q.status === 'Sent' || q.status === 'Draft');
  
  // Orders awaiting dispatch
  const ordersInDispatch = orders.filter(o => o.deliveryStatus === 'Processing');

  // Total Outstanding
  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'Paid');
  const outstandingAmount = unpaidOrders.reduce((acc, o) => {
    return acc + ((Number(o.total) || 0) - (Number(o.amountPaid) || 0));
  }, 0);

  // Pipeline stages count
  const stages = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Won'];
  const stageCounts = stages.map(st => ({
    stage: st,
    count: leads.filter(l => {
      if (l.stage === st) return true;
      const ls = (l.stage || '').toLowerCase().trim();
      const cs = st.toLowerCase().trim();
      if (cs === 'new' && (ls === 'new lead' || ls === 'incoming' || ls === 'new enquiry')) return true;
      if (cs === 'contacted' && (ls === 'specs received' || ls === 'in discussion' || ls === 'drawing received')) return true;
      if (cs === 'quoted' && (ls === 'quote sent' || ls === 'quote submitted')) return true;
      if (cs === 'negotiation' && (ls === 'revision' || ls === 'price negotiation')) return true;
      if (cs === 'won' && (ls === 'order received' || ls === 'converted')) return true;
      return false;
    }).length
  }));

  const formatLakhs = (amt) => {
    if (amt >= 100000) {
      return `₹${(amt / 100000).toFixed(2)} L`;
    }
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const openWhatsApp = (phone, text) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="page-content">
      {/* Page Title & Quick Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Command Center</h1>
          <p className="page-description">
            Live overview of sales pipeline, quotation approvals, logistics dispatch, and receivables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => onNewLead()}>
            <Plus size={16} /> New Enquiry / Lead
          </button>
          <button className="btn btn-primary" onClick={() => onNewQuote()}>
            <FileText size={16} /> Create Quote
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Pipeline Value</span>
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value">{formatLakhs(pipelineValue)}</div>
          <div className="stat-subtext">
            <span>{activePipelineLeads.length} active opportunities</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Follow-ups Today</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {followUpsDue.length}
          </div>
          <div className="stat-subtext">
            <span>Clients awaiting response</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Pending Quotes</span>
            <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <FileText size={18} />
            </div>
          </div>
          <div className="stat-value">{pendingQuotes.length}</div>
          <div className="stat-subtext">
            <span>Quoted & awaiting PO</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Awaiting Dispatch</span>
            <div className="stat-icon" style={{ background: '#cffafe', color: '#0891b2' }}>
              <Truck size={18} />
            </div>
          </div>
          <div className="stat-value">{ordersInDispatch.length}</div>
          <div className="stat-subtext">
            <span>Ready for warehouse release</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Receivables Due</span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {formatLakhs(outstandingAmount)}
          </div>
          <div className="stat-subtext">
            <span>{unpaidOrders.length} unpaid orders</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Outward Payouts</span>
            <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ea580c' }}>
            {formatLakhs(totalOutwardPaid)}
          </div>
          <div className="stat-subtext">
            <span>{outwardPayments.length} vendor settlements</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Funnel */}
      <div className="table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="table-title">Sales Conversion Pipeline</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('leads')}>
            View Board <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {stageCounts.map(st => (
            <div 
              key={st.stage} 
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('leads')}
            >
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                {st.stage}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                {st.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Widgets: Urgent Follow-ups & Payment Reminders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Urgent Follow-ups */}
        <div className="table-card">
          <div className="table-header-bar">
            <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#d97706" /> Follow-ups Due
            </h3>
            <span className="badge badge-quoted">{followUpsDue.length} Due</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Enquiry</th>
                  <th>Interest</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {followUpsDue.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      All client follow-ups are up to date!
                    </td>
                  </tr>
                ) : (
                  followUpsDue.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <strong>{lead.company}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{lead.contact} ({lead.phone})</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px' }}>{lead.productInterest}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Due: {lead.nextFollowUp}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a 
                            href={`tel:${lead.phone}`} 
                            className="btn btn-secondary btn-icon" 
                            title="Call Contact"
                          >
                            <Phone size={14} color="#2563eb" />
                          </a>
                          <button 
                            className="btn btn-whatsapp btn-icon"
                            title="Chat on WhatsApp"
                            onClick={() => openWhatsApp(
                              lead.phone, 
                              `Namaste ${lead.contact} ji, following up on your enquiry for ${lead.productInterest} with Aggarwal Industrial Supplies. Please let us know if you need any adjustments in the quote!`
                            )}
                          >
                            <MessageCircle size={14} />
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

        {/* Outstanding Receivables */}
        <div className="table-card">
          <div className="table-header-bar">
            <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IndianRupee size={18} color="#dc2626" /> Outstanding Invoices
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('payments')}>
              Record Payment
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order / Client</th>
                  <th>Due Amount</th>
                  <th>Payment Reminder</th>
                </tr>
              </thead>
              <tbody>
                {unpaidOrders.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Zero pending receivables! All accounts cleared.
                    </td>
                  </tr>
                ) : (
                  unpaidOrders.slice(0, 5).map(o => {
                    const due = (Number(o.total) || 0) - (Number(o.amountPaid) || 0);
                    return (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.id}</strong> - {o.customerName}
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Status: {o.paymentStatus}</div>
                        </td>
                        <td>
                          <strong style={{ color: '#dc2626' }}>₹{due.toLocaleString('en-IN')}</strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total: ₹{Number(o.total || 0).toLocaleString('en-IN')}</div>
                        </td>
                        <td>
                          <button 
                            className="btn btn-whatsapp btn-sm"
                            onClick={() => {
                              const cust = customers.find(c => c.id === o.customerId) || {};
                              const phone = cust.phone || '+919876500001';
                              openWhatsApp(
                                phone,
                                `Dear ${o.customerName}, gentle reminder regarding outstanding balance of ₹${due.toLocaleString('en-IN')} against Order ${o.id}. Please arrange RTGS/NEFT payment at your earliest convenience. Thank you!`
                              );
                            }}
                          >
                            <MessageCircle size={14} /> WhatsApp Reminder
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
