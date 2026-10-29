import React, { useState } from 'react';
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
  ArrowDownLeft,
  Plus,
  Calendar,
  Building2,
  Package,
  Layers,
  ShieldCheck,
  Activity,
  Wallet
} from 'lucide-react';
import { StorageService } from '../services/storage';

export default function Dashboard({ setActiveTab, onNewLead, onNewQuote }) {
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'month', 'today'
  
  const leads = StorageService.get(StorageService.KEYS.LEADS) || [];
  const quotes = StorageService.get(StorageService.KEYS.QUOTES) || [];
  const orders = StorageService.get(StorageService.KEYS.ORDERS) || [];
  const customers = StorageService.get(StorageService.KEYS.CUSTOMERS) || [];
  const payments = StorageService.get(StorageService.KEYS.PAYMENTS) || [];
  const outwardPayments = StorageService.get(StorageService.KEYS.OUTWARD_PAYMENTS) || [];
  const settings = StorageService.getSettings();

  // Helper date parsing (handles '25-Aug-2026', '2026-08-25', etc.)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    const parts = s.split(/[-/ ]/);
    if (parts.length === 3 && isNaN(parts[1])) {
      const monthNames = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const day = parseInt(parts[0], 10);
      const m = monthNames[parts[1].toLowerCase().slice(0, 3)];
      const y = parseInt(parts[2], 10);
      if (!isNaN(day) && m !== undefined && !isNaN(y)) {
        return new Date(y < 100 ? 2000 + y : y, m, day);
      }
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const getDaysDiff = (targetDateStr) => {
    const t = parseDate(targetDateStr);
    if (!t) return null;
    const now = new Date();
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const diffMs = target.getTime() - b.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  // Format rupees & Lakhs
  const formatLakhs = (amt) => {
    const val = Number(amt) || 0;
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // --- Financial Computations ---
  // Inward customer collections
  const totalInwardCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  // Outward vendor/expense payouts
  const totalOutwardPaid = outwardPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  // Net cash buffer / operating liquidity
  const netCashPosition = totalInwardCollected - totalOutwardPaid;

  // Unpaid Orders & Receivables Due
  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'Paid');
  const outstandingAmount = unpaidOrders.reduce((acc, o) => {
    return acc + Math.max(0, (Number(o.total) || 0) - (Number(o.amountPaid) || 0));
  }, 0);

  // Total order book value
  const totalOrderBook = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // --- Operational & Pipeline Computations ---
  const activePipelineLeads = leads.filter(l => !['Won', 'Lost'].includes(l.stage));
  const pipelineValue = activePipelineLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

  const pendingQuotes = quotes.filter(q => q.status === 'Sent' || q.status === 'Draft');
  const pendingQuotesValue = pendingQuotes.reduce((acc, q) => acc + (Number(q.total) || 0), 0);

  const ordersInProduction = orders.filter(o => o.deliveryStatus === 'Processing');
  const ordersCompleted = orders.filter(o => o.deliveryStatus === 'Completed' || o.deliveryStatus === 'Delivered');

  // Follow-ups due with date aging logic
  const followUpsWithAging = leads
    .filter(l => !['Won', 'Lost'].includes(l.stage) && l.nextFollowUp)
    .map(l => {
      const daysDiff = getDaysDiff(l.nextFollowUp);
      return {
        ...l,
        daysDiff,
        isOverdue: daysDiff !== null && daysDiff < 0,
        isToday: daysDiff === 0,
        isUpcoming: daysDiff !== null && daysDiff > 0
      };
    })
    .sort((a, b) => (a.daysDiff ?? 999) - (b.daysDiff ?? 999))
    .slice(0, 6);

  // Unpaid orders with credit aging logic
  const unpaidOrdersWithAging = unpaidOrders.map(o => {
    const due = Math.max(0, (Number(o.total) || 0) - (Number(o.amountPaid) || 0));
    const orderDate = o.date || '20-Aug-2026';
    const daysDiff = getDaysDiff(orderDate);
    const daysElapsed = daysDiff !== null ? Math.abs(daysDiff) : 30;
    return {
      ...o,
      due,
      orderDate,
      daysElapsed,
      isCritical: daysElapsed > 45
    };
  }).sort((a, b) => b.daysElapsed - a.daysElapsed).slice(0, 6);

  // Sales Conversion Funnel counts
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

  const openWhatsApp = (phone, text) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('No valid phone number for WhatsApp message.');
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Today reference format
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="page-content">
      {/* Date Reference & Plant Status Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '10px 16px',
        marginBottom: '18px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '6px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '12.5px'
          }}>
            <Calendar size={15} />
            <span>{todayFormatted}</span>
          </div>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
            Faridabad Plant (Sikri & Ballabgarh)
          </span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: '12px', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            FY 2026–27 | Q3
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#16a34a',
            fontWeight: 600,
            background: '#f0fdf4',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid #bbf7d0'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
            Live Sheets Synced
          </div>
        </div>
      </div>

      {/* Page Title & Quick Action Bar */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Aggarwal Industries — Command Center</span>
          </h1>
          <p className="page-description">
            Complete executive oversight of two-way cash flows, order manufacturing progress, quotation pipeline, and client follow-ups.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('payments')}>
            <Wallet size={15} color="#ea580c" /> Record Payout / Receipt
          </button>
          <button className="btn btn-secondary" onClick={() => onNewLead()}>
            <Plus size={15} /> New Enquiry
          </button>
          <button className="btn btn-primary" onClick={() => onNewQuote()}>
            <FileText size={15} /> Create Quote
          </button>
        </div>
      </div>

      {/* SECTION 1: Two-Way Financial Health Ribbon (Inflows, Outflows, Net Position, Receivables) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IndianRupee size={16} color="#2563eb" /> Financial Cash Flow & Liquidity Control
          </h3>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>Reconciled across Inward Receipts & Outward Payouts</span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* 1. Total Inward Collected */}
          <div className="stat-card" style={{ borderTop: '3px solid #16a34a' }}>
            <div className="stat-header">
              <span>Total Inward Collected</span>
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <ArrowDownLeft size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#16a34a' }}>
              +{formatLakhs(totalInwardCollected)}
            </div>
            <div className="stat-subtext">
              <span>{payments.length} customer receipts reconciled</span>
            </div>
          </div>

          {/* 2. Total Outward Paid */}
          <div className="stat-card" style={{ borderTop: '3px solid #ea580c' }}>
            <div className="stat-header">
              <span>Total Outward Paid</span>
              <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#ea580c' }}>
              -{formatLakhs(totalOutwardPaid)}
            </div>
            <div className="stat-subtext">
              <span>{outwardPayments.length} vendor & expense payouts</span>
            </div>
          </div>

          {/* 3. Net Cash Buffer */}
          <div className="stat-card" style={{ borderTop: `3px solid ${netCashPosition >= 0 ? '#2563eb' : '#dc2626'}` }}>
            <div className="stat-header">
              <span>Net Operating Buffer</span>
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: netCashPosition >= 0 ? '#1e40af' : '#dc2626' }}>
              {netCashPosition >= 0 ? '+' : ''}{formatLakhs(netCashPosition)}
            </div>
            <div className="stat-subtext">
              <span style={{ color: netCashPosition >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {netCashPosition >= 0 ? '✓ Healthy liquidity surplus' : '⚠ Cash deficit'}
              </span>
            </div>
          </div>

          {/* 4. Client Receivables Due */}
          <div className="stat-card" style={{ borderTop: '3px solid #dc2626' }}>
            <div className="stat-header">
              <span>Client Receivables Due</span>
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#dc2626' }}>
              {formatLakhs(outstandingAmount)}
            </div>
            <div className="stat-subtext">
              <span>{unpaidOrders.length} unpaid customer invoices</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Operations, Sales & Production KPIs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="#7c3aed" /> Production & Sales Operations
          </h3>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>Active commercial commitments & shopfloor load</span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span>Sales Pipeline Value</span>
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-value">{formatLakhs(pipelineValue)}</div>
            <div className="stat-subtext">
              <span>{activePipelineLeads.length} active enquiries in pipeline</span>
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
              <span>{formatLakhs(pendingQuotesValue)} submitted awaiting PO</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span>Orders In Production</span>
              <div className="stat-icon" style={{ background: '#cffafe', color: '#0891b2' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#0891b2' }}>{ordersInProduction.length}</div>
            <div className="stat-subtext">
              <span>Coiling, Heat Treat & Plating</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span>Order Book Delivered</span>
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-value">{formatLakhs(totalOrderBook)}</div>
            <div className="stat-subtext">
              <span>{ordersCompleted.length} fulfilled orders ({customers.length} OEM clients)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Aggarwal Industries Manufacturing & Logistics Tracker */}
      <div className="table-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="#0284c7" /> Shopfloor Manufacturing & Logistics Flow (Faridabad Works)
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Live progress tracking for precision springs (0.2–18mm), DIN 127B washers, and railway components.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('orders')}>
            All Orders & Dispatch <ArrowRight size={14} />
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            No open manufacturing orders currently in process.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {orders.slice(0, 3).map((ord) => {
              const status = ord.deliveryStatus || 'Processing';
              const isCompleted = status === 'Completed' || status === 'Delivered';
              return (
                <div 
                  key={ord.id} 
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{ord.id}</strong>
                      <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{ord.customerName}</div>
                    </div>
                    <span 
                      className={`badge ${isCompleted ? 'badge-won' : 'badge-quoted'}`}
                      style={{ fontSize: '11px', textTransform: 'uppercase' }}
                    >
                      {status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    <div><strong>Spec:</strong> {ord.items?.[0]?.name || ord.notes || 'Custom Spring Component'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span><strong>Order Date:</strong> {ord.date || '20-Aug-2026'}</span>
                      <span><strong>Value:</strong> ₹{Number(ord.total || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* 5-Stage Manufacturing Visual Bar */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b', marginBottom: '4px' }}>
                      <span>1. Coiling</span>
                      <span>2. Heat Treat</span>
                      <span>3. Plating</span>
                      <span>4. QC Test</span>
                      <span>5. Dispatch</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{
                          height: '100%',
                          width: isCompleted ? '100%' : (ord.progress ? `${ord.progress}%` : '60%'),
                          background: isCompleted ? '#16a34a' : '#2563eb',
                          borderRadius: '3px',
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: Sales Funnel Stages */}
      <div className="table-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="table-title">Commercial Enquiry Conversion Pipeline</h3>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Automotive OEMs, Railway Tenders, and Industrial Hardware Enquiries</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('leads')}>
            Pipeline Board <ArrowRight size={14} />
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
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s'
              }}
              onClick={() => setActiveTab('leads')}
            >
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                {st.stage}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                {st.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: Date-Aware Action Widgets (Overdue Follow-ups & Aging Receivables) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Urgent Follow-ups with Real Date Aging */}
        <div className="table-card">
          <div className="table-header-bar">
            <div>
              <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#d97706" /> Follow-ups Due & Buyer Schedule
              </h3>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Sorted by deadline urgency & response priority</div>
            </div>
            <span className="badge badge-quoted">{followUpsWithAging.length} Due</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Contact</th>
                  <th>Requirement & Date Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {followUpsWithAging.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      All client follow-ups are up to date!
                    </td>
                  </tr>
                ) : (
                  followUpsWithAging.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <strong>{lead.company}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{lead.contact} ({lead.phone || 'No phone'})</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{lead.productInterest}</div>
                        <div style={{ marginTop: '4px' }}>
                          {lead.isOverdue ? (
                            <span style={{ fontSize: '10.5px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🔴 Overdue by {Math.abs(lead.daysDiff)}d ({lead.nextFollowUp})
                            </span>
                          ) : lead.isToday ? (
                            <span style={{ fontSize: '10.5px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🟡 Due Today ({lead.nextFollowUp})
                            </span>
                          ) : (
                            <span style={{ fontSize: '10.5px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              🟢 In {lead.daysDiff}d ({lead.nextFollowUp})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {lead.phone && (
                            <a 
                              href={`tel:${lead.phone}`} 
                              className="btn btn-secondary btn-icon" 
                              title="Call Contact"
                            >
                              <Phone size={14} color="#2563eb" />
                            </a>
                          )}
                          <button 
                            className="btn btn-whatsapp btn-icon"
                            title="WhatsApp Follow-up"
                            onClick={() => openWhatsApp(
                              lead.phone, 
                              `Namaste ${lead.contact} ji, following up on your requirement for ${lead.productInterest} with Aggarwal Industries (ASTER). Please let us know if you need rate confirmation or technical drawing approval!`
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

        {/* Outstanding Invoices with Credit Aging */}
        <div className="table-card">
          <div className="table-header-bar">
            <div>
              <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IndianRupee size={18} color="#dc2626" /> Outstanding Invoices & Credit Aging
              </h3>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Overdue client receivables awaiting RTGS / NEFT</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('payments')}>
              Record Receipt
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order / Client</th>
                  <th>Due Amount & Aging</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidOrdersWithAging.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Zero pending receivables! All accounts cleared.
                    </td>
                  </tr>
                ) : (
                  unpaidOrdersWithAging.map(o => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.id}</strong> — {o.customerName}
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          Date: <strong>{o.orderDate}</strong>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#dc2626', fontSize: '13px' }}>₹{o.due.toLocaleString('en-IN')}</strong>
                        <div style={{ marginTop: '3px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            background: o.daysElapsed > 45 ? '#fee2e2' : '#fef3c7',
                            color: o.daysElapsed > 45 ? '#b91c1c' : '#b45309',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            {o.daysElapsed > 45 ? `🔴 ${o.daysElapsed}d (Overdue)` : `🟡 ${o.daysElapsed}d Aging`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-whatsapp btn-sm"
                          style={{ fontSize: '11.5px', padding: '5px 10px' }}
                          onClick={() => {
                            const cust = customers.find(c => c.id === o.customerId || c.company === o.customerName) || {};
                            const phone = cust.phone || '+919876500001';
                            openWhatsApp(
                              phone,
                              `Dear ${o.customerName}, gentle reminder from Aggarwal Industries regarding outstanding balance of ₹${o.due.toLocaleString('en-IN')} for Order ${o.id} dated ${o.orderDate}. Please arrange RTGS/NEFT settlement to: Bank: ${settings.bankName}, A/C: ${settings.accountNumber}, IFSC: ${settings.ifsc}. Thank you!`
                            );
                          }}
                        >
                          <MessageCircle size={13} /> Reminder
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

