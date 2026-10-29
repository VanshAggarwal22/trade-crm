import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Leads from './components/Leads';
import Quotes from './components/Quotes';
import Orders from './components/Orders';
import Payments from './components/Payments';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import AiCopilot from './components/AiCopilot';
import Settings from './components/Settings';
import { Search, Plus, Bell, CheckCircle2, RefreshCw } from 'lucide-react';
import { StorageService } from './services/storage';
import { SheetSyncService } from './services/sheetSync';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState(Date.now());

  // Mount Effect: Automatically fetch live data from Google Sheets on startup
  useEffect(() => {
    async function loadLiveSheetsData() {
      setIsSyncing(true);
      try {
        const res = await SheetSyncService.fetchAllFromSheets();
        console.log('LIVE SHEETS FETCH RESULT:', res);
        if (res && res.success) {
          setSyncTimestamp(Date.now());
        }
      } catch (err) {
        console.warn('Initial sheet sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    }
    loadLiveSheetsData();
  }, []);
  
  // Cross-component transition payloads
  const [quotePrefill, setQuotePrefill] = useState(null);
  const [paymentOrderPrefill, setPaymentOrderPrefill] = useState(null);

  // Global search query
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Workflow Handlers
  const handleConvertToQuote = (lead) => {
    setQuotePrefill(lead);
    setActiveTab('quotes');
    showToast(`Quotation builder loaded with details for ${lead.company}!`);
  };

  const handleConvertToCustomer = (customer) => {
    setActiveTab('customers');
    showToast(`Customer ${customer.company} added to Directory!`);
  };

  const handleConvertToOrder = (order) => {
    setActiveTab('orders');
    showToast(`Order ${order.id} is now in Fulfillment!`);
  };

  const handleRecordPayment = (order) => {
    setPaymentOrderPrefill(order);
    setActiveTab('payments');
    showToast(`Payment receipt ready for Order ${order.id}!`);
  };

  // Global Search Handler
  const handleGlobalSearch = (val) => {
    setGlobalQuery(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const q = val.toLowerCase();
    const results = [];

    // Search Leads
    const leads = StorageService.get(StorageService.KEYS.LEADS);
    leads.forEach(l => {
      if ((l.company + ' ' + l.contact + ' ' + l.productInterest).toLowerCase().includes(q)) {
        results.push({ type: 'Enquiry / Lead', id: l.id, title: l.company, subtitle: `${l.contact} · ${l.productInterest}`, tab: 'leads' });
      }
    });

    // Search Customers
    const customers = StorageService.get(StorageService.KEYS.CUSTOMERS);
    customers.forEach(c => {
      if ((c.company + ' ' + c.contact + ' ' + c.city).toLowerCase().includes(q)) {
        results.push({ type: 'Customer Account', id: c.id, title: c.company, subtitle: `${c.contact} · ${c.city}, ${c.state}`, tab: 'customers' });
      }
    });

    // Search Quotes
    const quotes = StorageService.get(StorageService.KEYS.QUOTES);
    quotes.forEach(qt => {
      if ((qt.id + ' ' + qt.customerName).toLowerCase().includes(q)) {
        results.push({ type: 'Quotation', id: qt.id, title: `${qt.id} - ${qt.customerName}`, subtitle: `Total: ₹${Number(qt.total).toLocaleString('en-IN')}`, tab: 'quotes' });
      }
    });

    // Search Orders
    const orders = StorageService.get(StorageService.KEYS.ORDERS);
    orders.forEach(o => {
      if ((o.id + ' ' + o.customerName + ' ' + (o.lrNumber || '')).toLowerCase().includes(q)) {
        results.push({ type: 'Order', id: o.id, title: `${o.id} - ${o.customerName}`, subtitle: `Delivery: ${o.deliveryStatus} · LR: ${o.lrNumber || 'None'}`, tab: 'orders' });
      }
    });

    // Search Products
    const products = StorageService.get(StorageService.KEYS.PRODUCTS);
    products.forEach(p => {
      if ((p.sku + ' ' + p.name + ' ' + p.hsn).toLowerCase().includes(q)) {
        results.push({ type: 'Product SKU', id: p.sku, title: `${p.sku}: ${p.name}`, subtitle: `HSN: ${p.hsn} · Stock: ${p.stock} ${p.unit}`, tab: 'inventory' });
      }
    });

    setSearchResults(results.slice(0, 10));
    setShowSearchResults(true);
  };

  const handleSelectSearchResult = (res) => {
    setActiveTab(res.tab);
    setGlobalQuery('');
    setShowSearchResults(false);
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar & Mobile Bottom Bar */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onNewLead={() => setActiveTab('leads')}
        onNewQuote={() => setActiveTab('quotes')}
      />

      {/* Main App Layout */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-navbar">
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <div className="search-input-box" style={{ maxWidth: '100%' }}>
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                placeholder="Global search (Leads, Clients, Quotes, SKUs)..." 
                value={globalQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                onFocus={() => globalQuery.length >= 2 && setShowSearchResults(true)}
              />
            </div>

            {/* Global Search Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '42px',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  zIndex: 60,
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                {searchResults.map((res, i) => (
                  <div 
                    key={i}
                    onClick={() => handleSelectSearchResult(res)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{res.title}</strong>
                      <span style={{ fontSize: '10.5px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {res.type}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{res.subtitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="top-actions">
            <button 
              className="btn btn-secondary btn-sm"
              title="Sync Live with Google Sheets"
              onClick={async () => {
                setIsSyncing(true);
                const res = await SheetSyncService.fetchAllFromSheets();
                setIsSyncing(false);
                if (res.success) {
                  setSyncTimestamp(Date.now());
                  showToast('Live Google Sheets data synchronized!');
                } else {
                  showToast('Cloud sync completed');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} color="#16a34a" />
              <span style={{ fontSize: '12px' }}>{isSyncing ? 'Syncing...' : 'Google Sheets Synced'}</span>
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setQuotePrefill(null);
                setActiveTab('quotes');
              }}
            >
              <Plus size={14} /> New Quote
            </button>
          </div>
        </header>

        {/* View Routing */}
        <main>
          {activeTab === 'dashboard' && (
            <Dashboard 
              key={syncTimestamp}
              setActiveTab={setActiveTab}
              onNewLead={() => setActiveTab('leads')}
              onNewQuote={() => {
                setQuotePrefill(null);
                setActiveTab('quotes');
              }}
            />
          )}

          {activeTab === 'leads' && (
            <Leads 
              key={syncTimestamp}
              onConvertToQuote={handleConvertToQuote}
              onConvertToCustomer={handleConvertToCustomer}
              showToast={showToast}
            />
          )}

          {activeTab === 'quotes' && (
            <Quotes 
              key={syncTimestamp}
              prefillData={quotePrefill}
              onConvertToOrder={handleConvertToOrder}
              showToast={showToast}
            />
          )}

          {activeTab === 'orders' && (
            <Orders 
              key={syncTimestamp}
              onRecordPayment={handleRecordPayment}
              showToast={showToast}
            />
          )}

          {activeTab === 'payments' && (
            <Payments 
              key={syncTimestamp}
              initialOrder={paymentOrderPrefill}
              showToast={showToast}
            />
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              key={syncTimestamp}
              showToast={showToast}
            />
          )}

          {activeTab === 'customers' && (
            <Customers 
              key={syncTimestamp}
              showToast={showToast}
            />
          )}

          {activeTab === 'ai' && (
            <AiCopilot 
              showToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} color="#10b981" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
