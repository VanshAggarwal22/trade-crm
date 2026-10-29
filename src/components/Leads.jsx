import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MessageCircle, 
  UserPlus, 
  FileText, 
  Edit3, 
  Trash2, 
  Kanban, 
  List, 
  Calendar,
  CheckCircle,
  X
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

const PIPELINE_STAGES = ['New', 'Contacted', 'Quoted', 'Negotiation', 'Won', 'Lost'];

export default function Leads({ onConvertToQuote, onConvertToCustomer, showToast }) {
  const [leads, setLeads] = useState(() => StorageService.get(StorageService.KEYS.LEADS));
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    company: '',
    contact: '',
    phone: '',
    email: '',
    productInterest: '',
    quantity: '',
    estimatedValue: '',
    source: 'WhatsApp',
    stage: 'New',
    nextFollowUp: '',
    owner: 'Vikram',
    notes: ''
  });

  const refreshLeads = () => {
    setLeads(StorageService.get(StorageService.KEYS.LEADS));
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      company: '',
      contact: '',
      phone: '',
      email: '',
      productInterest: '',
      quantity: '',
      estimatedValue: '',
      source: 'WhatsApp',
      stage: 'New',
      nextFollowUp: new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-GB'),
      owner: 'Vikram',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      company: lead.company || '',
      contact: lead.contact || '',
      phone: lead.phone || '',
      email: lead.email || '',
      productInterest: lead.productInterest || '',
      quantity: lead.quantity || '',
      estimatedValue: lead.estimatedValue || '',
      source: lead.source || 'WhatsApp',
      stage: lead.stage || 'New',
      nextFollowUp: lead.nextFollowUp || '',
      owner: lead.owner || 'Vikram',
      notes: lead.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!formData.company || !formData.contact) {
      alert('Company Name and Contact Person are required.');
      return;
    }

    const currentLeads = StorageService.get(StorageService.KEYS.LEADS);

    if (editingLead) {
      // Update
      const updated = currentLeads.map(l => {
        if (l.id === editingLead.id) {
          return {
            ...l,
            ...formData,
            estimatedValue: Number(formData.estimatedValue) || 0
          };
        }
        return l;
      });
      StorageService.save(StorageService.KEYS.LEADS, updated);
      SheetSyncService.syncUpdate('Leads', editingLead.id, formData);
      showToast?.(`Lead ${editingLead.id} updated!`);
    } else {
      // Create
      const newId = StorageService.generateId(StorageService.KEYS.LEADS, 'L');
      const newLead = {
        id: newId,
        createdAt: new Date().toLocaleDateString('en-GB'),
        ...formData,
        estimatedValue: Number(formData.estimatedValue) || 0
      };
      currentLeads.unshift(newLead);
      StorageService.save(StorageService.KEYS.LEADS, currentLeads);
      SheetSyncService.syncAdd('Leads', newLead);
      showToast?.(`Lead ${newId} created!`);
    }

    setIsModalOpen(false);
    refreshLeads();
  };

  const handleStageChange = (leadId, newStage) => {
    const currentLeads = StorageService.get(StorageService.KEYS.LEADS);
    const updated = currentLeads.map(l => {
      if (l.id === leadId) {
        return { ...l, stage: newStage };
      }
      return l;
    });
    StorageService.save(StorageService.KEYS.LEADS, updated);
    SheetSyncService.syncUpdate('Leads', leadId, { Stage: newStage });
    refreshLeads();
    showToast?.(`Stage updated to ${newStage}`);
  };

  const handleDeleteLead = (id) => {
    if (!window.confirm(`Delete lead ${id}?`)) return;
    const currentLeads = StorageService.get(StorageService.KEYS.LEADS);
    const updated = currentLeads.filter(l => l.id !== id);
    StorageService.save(StorageService.KEYS.LEADS, updated);
    SheetSyncService.syncDelete('Leads', id);
    refreshLeads();
    showToast?.('Lead deleted');
  };

  const handleConvertLead = (lead) => {
    // Add to Customers master
    const customers = StorageService.get(StorageService.KEYS.CUSTOMERS);
    const existing = customers.find(c => c.phone && c.phone === lead.phone);
    if (existing) {
      alert(`Customer already exists: ${existing.company} (${existing.id})`);
      return;
    }

    const newCustId = StorageService.generateId(StorageService.KEYS.CUSTOMERS, 'C');
    const newCustomer = {
      id: newCustId,
      company: lead.company,
      contact: lead.contact,
      phone: lead.phone,
      whatsapp: lead.phone,
      email: lead.email || '',
      gstin: '',
      city: '',
      state: 'Maharashtra',
      industry: 'Industrial Buyer',
      source: lead.source || 'Referral',
      status: 'Active',
      notes: `Converted from Lead ${lead.id}`
    };

    customers.unshift(newCustomer);
    StorageService.save(StorageService.KEYS.CUSTOMERS, customers);
    
    // Mark lead as Won
    handleStageChange(lead.id, 'Won');
    showToast?.(`Customer ${newCustId} created from Lead!`);
    if (onConvertToCustomer) onConvertToCustomer(newCustomer);
  };

  const openWhatsApp = (phone, name, product) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const text = `Namaste ${name} ji, Aggarwal Industries (ASTER) here regarding your requirement for ${product || 'custom springs / washers'}. Let me know if you would like us to share our best rate quotation!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    return (
      (l.company || '').toLowerCase().includes(q) ||
      (l.contact || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.productInterest || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Enquiry & Sales Pipeline</h1>
          <p className="page-description">
            Track industrial enquiries from WhatsApp, Gmail, and calls through conversion.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ background: viewMode === 'kanban' ? '#e2e8f0' : 'transparent', border: 'none' }}
              onClick={() => setViewMode('kanban')}
            >
              <Kanban size={15} /> Board
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              style={{ background: viewMode === 'list' ? '#e2e8f0' : 'transparent', border: 'none' }}
              onClick={() => setViewMode('list')}
            >
              <List size={15} /> Table
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> New Enquiry
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search by company, contact, material..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
          <span>Showing <strong>{filteredLeads.length}</strong> enquiries</span>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="kanban-grid">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => {
              if (l.stage === stage) return true;
              const ls = (l.stage || '').toLowerCase().trim();
              const cs = stage.toLowerCase().trim();
              if (cs === 'new' && (ls === 'new lead' || ls === 'incoming' || ls === 'new enquiry')) return true;
              if (cs === 'contacted' && (ls === 'specs received' || ls === 'in discussion' || ls === 'drawing received')) return true;
              if (cs === 'quoted' && (ls === 'quote sent' || ls === 'quote submitted')) return true;
              if (cs === 'negotiation' && (ls === 'revision' || ls === 'price negotiation')) return true;
              if (cs === 'won' && (ls === 'order received' || ls === 'converted')) return true;
              if (cs === 'lost' && (ls === 'dropped' || ls === 'rejected')) return true;
              return false;
            });
            const stageTotal = stageLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

            return (
              <div key={stage} className="kanban-column">
                <div className="kanban-column-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {stage}
                    <span className="kanban-count">{stageLeads.length}</span>
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {stageTotal > 0 ? `₹${(stageTotal / 1000).toFixed(0)}k` : ''}
                  </span>
                </div>

                {stageLeads.map(lead => (
                  <div key={lead.id} className="kanban-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="card-title">{lead.company}</span>
                      <span className={`badge badge-${lead.stage.toLowerCase()}`}>
                        {lead.id}
                      </span>
                    </div>

                    <div className="card-subtitle">
                      <strong>{lead.contact}</strong> · {lead.phone}
                    </div>

                    <div style={{ fontSize: '12.5px', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div><strong>Material:</strong> {lead.productInterest}</div>
                      {lead.quantity && <div><strong>Qty:</strong> {lead.quantity}</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
                      <span>Due: <strong>{lead.nextFollowUp || '-'}</strong></span>
                      <strong style={{ color: '#1e40af' }}>₹{Number(lead.estimatedValue || 0).toLocaleString('en-IN')}</strong>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                      {lead.phone && (
                        <>
                          <a href={`tel:${lead.phone}`} className="btn btn-secondary btn-icon" title="Call">
                            <Phone size={13} color="#2563eb" />
                          </a>
                          <button 
                            className="btn btn-whatsapp btn-icon" 
                            title="WhatsApp"
                            onClick={() => openWhatsApp(lead.phone, lead.contact, lead.productInterest)}
                          >
                            <MessageCircle size={13} />
                          </button>
                        </>
                      )}

                      <button 
                        className="btn btn-secondary btn-icon" 
                        title="Create Quote"
                        onClick={() => onConvertToQuote?.(lead)}
                      >
                        <FileText size={13} color="#7c3aed" />
                      </button>

                      {lead.stage !== 'Won' && (
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Convert to Customer"
                          onClick={() => handleConvertLead(lead)}
                        >
                          <UserPlus size={13} color="#16a34a" />
                        </button>
                      )}

                      <button 
                        className="btn btn-secondary btn-icon" 
                        title="Edit Lead"
                        onClick={() => handleOpenEditModal(lead)}
                        style={{ marginLeft: 'auto' }}
                      >
                        <Edit3 size={13} color="#64748b" />
                      </button>
                    </div>

                    {/* Stage Quick Switcher */}
                    <div style={{ marginTop: '4px' }}>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '11px', padding: '3px 6px' }}
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      >
                        {PIPELINE_STAGES.map(s => (
                          <option key={s} value={s}>Move to: {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enquiry Ref</th>
                  <th>Company & Contact</th>
                  <th>Product Requirement</th>
                  <th>Value (Est.)</th>
                  <th>Stage</th>
                  <th>Next Follow-Up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.id}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{lead.source}</div>
                    </td>
                    <td>
                      <strong>{lead.company}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{lead.contact} ({lead.phone})</div>
                    </td>
                    <td>
                      <div>{lead.productInterest}</div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Qty: {lead.quantity || '-'}</span>
                    </td>
                    <td>
                      <strong>₹{Number(lead.estimatedValue || 0).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      >
                        {PIPELINE_STAGES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>{lead.nextFollowUp || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-whatsapp btn-icon" 
                          title="WhatsApp"
                          onClick={() => openWhatsApp(lead.phone, lead.contact, lead.productInterest)}
                        >
                          <MessageCircle size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Create Quote"
                          onClick={() => onConvertToQuote?.(lead)}
                        >
                          <FileText size={13} color="#7c3aed" />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Edit"
                          onClick={() => handleOpenEditModal(lead)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Delete"
                          onClick={() => handleDeleteLead(lead.id)}
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

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">{editingLead ? `Edit Lead ${editingLead.id}` : 'Record New Enquiry'}</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLead}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Company / Client Name *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Tata Projects Ltd"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="e.g. Rajesh Kumar"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone / WhatsApp Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+919876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product / Material Requirement</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.productInterest}
                      onChange={(e) => setFormData({ ...formData, productInterest: e.target.value })}
                      placeholder="e.g. Compression Springs 3.5mm, DIN 127B Washers, Railway Parts"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity Required</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="e.g. 5,000 Kg / 200 Metres"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Estimated Deal Value (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      placeholder="e.g. 150000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Source</label>
                    <select 
                      className="form-control"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Gmail">Gmail</option>
                      <option value="Phone">Phone Call</option>
                      <option value="Referral">Client Referral</option>
                      <option value="Website">Website Form</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pipeline Stage</label>
                    <select 
                      className="form-control"
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    >
                      {PIPELINE_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Follow-Up Date</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.nextFollowUp}
                      onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                      placeholder="DD-MMM-YYYY (e.g. 28-Oct-2026)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Specifications</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Specification notes, delivery destination, payment terms requested..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingLead ? 'Update Lead' : 'Save Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
