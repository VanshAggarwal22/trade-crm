import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MessageCircle, 
  Edit3, 
  Trash2, 
  Building2, 
  Truck,
  X,
  CreditCard
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

const INDIAN_STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'
];

export default function Customers({ showToast }) {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'suppliers'
  const [customers, setCustomers] = useState(() => StorageService.get(StorageService.KEYS.CUSTOMERS));
  const [suppliers, setSuppliers] = useState(() => StorageService.get(StorageService.KEYS.SUPPLIERS));
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [custForm, setCustForm] = useState({
    company: '',
    contact: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    state: 'Maharashtra',
    industry: '',
    creditDays: 30,
    notes: ''
  });

  const [suppForm, setSuppForm] = useState({
    company: '',
    contact: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    productsSupplied: '',
    paymentTerms: 'Net 30',
    notes: ''
  });

  const refreshData = () => {
    setCustomers(StorageService.get(StorageService.KEYS.CUSTOMERS));
    setSuppliers(StorageService.get(StorageService.KEYS.SUPPLIERS));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    if (activeTab === 'customers') {
      setCustForm({
        company: '',
        contact: '',
        phone: '',
        email: '',
        gstin: '',
        city: '',
        state: 'Maharashtra',
        industry: '',
        creditDays: 30,
        notes: ''
      });
    } else {
      setSuppForm({
        company: '',
        contact: '',
        phone: '',
        email: '',
        gstin: '',
        city: '',
        productsSupplied: '',
        paymentTerms: 'Net 30',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'customers') {
      setCustForm({
        company: item.company || '',
        contact: item.contact || '',
        phone: item.phone || '',
        email: item.email || '',
        gstin: item.gstin || '',
        city: item.city || '',
        state: item.state || 'Maharashtra',
        industry: item.industry || '',
        creditDays: item.creditDays || 30,
        notes: item.notes || ''
      });
    } else {
      setSuppForm({
        company: item.company || '',
        contact: item.contact || '',
        phone: item.phone || '',
        email: item.email || '',
        gstin: item.gstin || '',
        city: item.city || '',
        productsSupplied: item.productsSupplied || '',
        paymentTerms: item.paymentTerms || 'Net 30',
        notes: item.notes || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    const current = StorageService.get(StorageService.KEYS.CUSTOMERS);

    if (editingItem) {
      const updated = current.map(c => c.id === editingItem.id ? { ...c, ...custForm } : c);
      StorageService.save(StorageService.KEYS.CUSTOMERS, updated);
      SheetSyncService.syncUpdate('Customers', editingItem.id, custForm);
      showToast?.(`Customer ${editingItem.id} updated!`);
    } else {
      const newId = StorageService.generateId(StorageService.KEYS.CUSTOMERS, 'C');
      const newCust = {
        id: newId,
        ...custForm,
        status: 'Active',
        createdAt: new Date().toLocaleDateString('en-GB')
      };
      current.unshift(newCust);
      StorageService.save(StorageService.KEYS.CUSTOMERS, current);
      SheetSyncService.syncAdd('Customers', newCust);
      showToast?.(`Customer ${newId} created!`);
    }

    setIsModalOpen(false);
    refreshData();
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    const current = StorageService.get(StorageService.KEYS.SUPPLIERS);

    if (editingItem) {
      const updated = current.map(s => s.id === editingItem.id ? { ...s, ...suppForm } : s);
      StorageService.save(StorageService.KEYS.SUPPLIERS, updated);
      SheetSyncService.syncUpdate('Suppliers', editingItem.id, suppForm);
      showToast?.(`Supplier ${editingItem.id} updated!`);
    } else {
      const newId = StorageService.generateId(StorageService.KEYS.SUPPLIERS, 'S');
      const newSupp = {
        id: newId,
        ...suppForm
      };
      current.unshift(newSupp);
      StorageService.save(StorageService.KEYS.SUPPLIERS, current);
      SheetSyncService.syncAdd('Suppliers', newSupp);
      showToast?.(`Supplier ${newId} created!`);
    }

    setIsModalOpen(false);
    refreshData();
  };

  const handleDelete = (id) => {
    if (!window.confirm(`Delete record ${id}?`)) return;
    const isCustomer = activeTab === 'customers';
    const key = isCustomer ? StorageService.KEYS.CUSTOMERS : StorageService.KEYS.SUPPLIERS;
    const sheetName = isCustomer ? 'Customers' : 'Suppliers';
    const current = StorageService.get(key);
    const updated = current.filter(x => x.id !== id);
    StorageService.save(key, updated);
    SheetSyncService.syncDelete(sheetName, id);
    refreshData();
    showToast?.('Record deleted');
  };

  const openWhatsApp = (phone, name) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`Namaste ${name} ji, Aggarwal Industries (ASTER) here.`)}`, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.company || '').toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.company || '').toLowerCase().includes(q) ||
      (s.contact || '').toLowerCase().includes(q) ||
      (s.productsSupplied || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Directory: Clients & Vendors</h1>
          <p className="page-description">
            Maintain customer GSTIN profiles, states for tax auto-split, and supplier credit lines.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ background: activeTab === 'customers' ? '#e2e8f0' : 'transparent', border: 'none' }}
              onClick={() => setActiveTab('customers')}
            >
              <Users size={15} /> Customers ({customers.length})
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ background: activeTab === 'suppliers' ? '#e2e8f0' : 'transparent', border: 'none' }}
              onClick={() => setActiveTab('suppliers')}
            >
              <Truck size={15} /> Suppliers ({suppliers.length})
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> {activeTab === 'customers' ? 'Add Customer' : 'Add Supplier'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'customers' ? 'customer, GSTIN, city...' : 'supplier, material...'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Directory Table */}
      {activeTab === 'customers' ? (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Company & Industry</th>
                  <th>Contact Person</th>
                  <th>GSTIN & State</th>
                  <th>City</th>
                  <th>Credit Term</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ color: '#1e40af' }}>{c.id}</strong>
                    </td>
                    <td>
                      <strong>{c.company}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.industry || 'Industrial Buyer'}</div>
                    </td>
                    <td>
                      <div>{c.contact}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.phone}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.gstin || 'Unregistered'}</span>
                      <div style={{ fontSize: '11px', color: '#16a34a' }}>State: {c.state}</div>
                    </td>
                    <td>{c.city || '-'}</td>
                    <td>{c.creditDays ? `${c.creditDays} Days` : 'Advance'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.phone && (
                          <>
                            <a href={`tel:${c.phone}`} className="btn btn-secondary btn-icon" title="Call">
                              <Phone size={13} color="#2563eb" />
                            </a>
                            <button 
                              className="btn btn-whatsapp btn-icon" 
                              title="WhatsApp"
                              onClick={() => openWhatsApp(c.phone, c.contact)}
                            >
                              <MessageCircle size={13} />
                            </button>
                          </>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Edit"
                          onClick={() => handleOpenEdit(c)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Delete"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier ID</th>
                  <th>Company</th>
                  <th>Contact Person</th>
                  <th>Materials Supplied</th>
                  <th>City</th>
                  <th>Payment Terms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: '#0891b2' }}>{s.id}</strong>
                    </td>
                    <td>
                      <strong>{s.company}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>GSTIN: {s.gstin || '-'}</div>
                    </td>
                    <td>
                      <div>{s.contact}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{s.phone}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px' }}>{s.productsSupplied}</span>
                    </td>
                    <td>{s.city || '-'}</td>
                    <td>{s.paymentTerms}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="btn btn-secondary btn-icon" title="Call">
                            <Phone size={13} color="#2563eb" />
                          </a>
                        )}
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Edit"
                          onClick={() => handleOpenEdit(s)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Delete"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem 
                  ? `Edit ${activeTab === 'customers' ? 'Customer ' + editingItem.id : 'Supplier ' + editingItem.id}` 
                  : (activeTab === 'customers' ? 'Add New Customer Account' : 'Add New Supplier')}
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            {activeTab === 'customers' ? (
              <form onSubmit={handleSaveCustomer}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={custForm.company}
                        onChange={(e) => setCustForm({ ...custForm, company: e.target.value })}
                        placeholder="e.g. Larsen & Toubro Construction"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={custForm.contact}
                        onChange={(e) => setCustForm({ ...custForm, contact: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Phone / WhatsApp</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={custForm.phone}
                        onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                        placeholder="+919876543210"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={custForm.email}
                        onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                        placeholder="procurement@lnt.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">GSTIN (15 Digits)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={custForm.gstin}
                        onChange={(e) => setCustForm({ ...custForm, gstin: e.target.value.toUpperCase() })}
                        placeholder="27AAACL0002A1Z2"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State (for Tax Calculation)</label>
                      <select 
                        className="form-control"
                        value={custForm.state}
                        onChange={(e) => setCustForm({ ...custForm, state: e.target.value })}
                      >
                        {INDIAN_STATES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={custForm.city}
                        onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
                        placeholder="e.g. Pune"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Approved Credit Days</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={custForm.creditDays}
                        onChange={(e) => setCustForm({ ...custForm, creditDays: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={custForm.notes}
                      onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
                      placeholder="Special packaging, test certificate requirements..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Customer Account
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveSupplier}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Supplier / Mill Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={suppForm.company}
                        onChange={(e) => setSuppForm({ ...suppForm, company: e.target.value })}
                        placeholder="e.g. Jindal Steel & Power"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={suppForm.contact}
                        onChange={(e) => setSuppForm({ ...suppForm, contact: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={suppForm.phone}
                        onChange={(e) => setSuppForm({ ...suppForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GSTIN</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={suppForm.gstin}
                        onChange={(e) => setSuppForm({ ...suppForm, gstin: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Products Supplied</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. MS Plates, Beams, Angles"
                      value={suppForm.productsSupplied}
                      onChange={(e) => setSuppForm({ ...suppForm, productsSupplied: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Net 30, LC, Advance"
                      value={suppForm.paymentTerms}
                      onChange={(e) => setSuppForm({ ...suppForm, paymentTerms: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Supplier
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
