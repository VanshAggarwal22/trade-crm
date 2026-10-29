import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Truck, 
  IndianRupee, 
  Package, 
  Sparkles, 
  Settings as SettingsIcon,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { StorageService } from '../services/storage';

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  onNewLead, 
  onNewQuote,
  searchQuery,
  setSearchQuery,
  onGlobalSearchSelect
}) {
  const leads = StorageService.get(StorageService.KEYS.LEADS);
  const quotes = StorageService.get(StorageService.KEYS.QUOTES);
  const orders = StorageService.get(StorageService.KEYS.ORDERS);

  const activeLeadsCount = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).length;
  const pendingOrdersCount = orders.filter(o => o.deliveryStatus === 'Processing').length;

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'leads', label: 'Enquiries & Leads', icon: Users, badge: activeLeadsCount },
    { id: 'quotes', label: 'Quotations', icon: FileText },
    { id: 'orders', label: 'Orders & Dispatch', icon: Truck, badge: pendingOrdersCount },
    { id: 'payments', label: 'Payments Ledger', icon: IndianRupee },
    { id: 'inventory', label: 'Inventory & HSN', icon: Package },
    { id: 'customers', label: 'Clients & Vendors', icon: Building2 },
    { id: 'ai', label: 'AI Sales Copilot', icon: Sparkles },
    { id: 'settings', label: 'Settings & Cloud', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">A</div>
          <div>
            <div className="sidebar-title">TradeCRM</div>
            <div className="sidebar-subtitle">Aggarwal Industrial</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span>Google Sheets Mirrored</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
            Zero-Cost 24/7 Web Engine
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <button 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          <Users size={20} />
          <span>Leads</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'quotes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotes')}
        >
          <FileText size={20} />
          <span>Quotes</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Truck size={20} />
          <span>Orders</span>
        </button>
        <button 
          className={`mobile-nav-item ${['payments', 'inventory', 'customers', 'ai', 'settings'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Building2 size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
