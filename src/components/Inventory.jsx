import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  X,
  Tag
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

export default function Inventory({ showToast }) {
  const [products, setProducts] = useState(() => StorageService.get(StorageService.KEYS.PRODUCTS));
  const [suppliers] = useState(() => StorageService.get(StorageService.KEYS.SUPPLIERS));
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Steel Plates',
    hsn: '7208',
    unit: 'Kg',
    costPrice: '',
    sellPrice: '',
    gstPercent: 18,
    stock: '',
    supplierId: '',
    active: true
  });

  const refreshProducts = () => {
    setProducts(StorageService.get(StorageService.KEYS.PRODUCTS));
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Steel Plates',
      hsn: '7208',
      unit: 'Kg',
      costPrice: '',
      sellPrice: '',
      gstPercent: 18,
      stock: '',
      supplierId: suppliers[0]?.id || '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      category: prod.category || 'Steel Plates',
      hsn: prod.hsn || '',
      unit: prod.unit || 'Kg',
      costPrice: prod.costPrice || '',
      sellPrice: prod.sellPrice || '',
      gstPercent: prod.gstPercent || 18,
      stock: prod.stock || '',
      supplierId: prod.supplierId || '',
      active: prod.active !== false
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Product name is required.');
      return;
    }

    const currentProducts = StorageService.get(StorageService.KEYS.PRODUCTS);

    if (editingProduct) {
      const updated = currentProducts.map(p => {
        if (p.sku === editingProduct.sku) {
          return {
            ...p,
            ...formData,
            costPrice: Number(formData.costPrice) || 0,
            sellPrice: Number(formData.sellPrice) || 0,
            gstPercent: Number(formData.gstPercent) || 18,
            stock: Number(formData.stock) || 0
          };
        }
        return p;
      });
      StorageService.save(StorageService.KEYS.PRODUCTS, updated);
      SheetSyncService.syncUpdate('Products', editingProduct.sku, formData);
      showToast?.(`Product ${editingProduct.sku} updated!`);
    } else {
      const newSku = StorageService.generateId(StorageService.KEYS.PRODUCTS, 'SKU');
      const newProduct = {
        sku: newSku,
        ...formData,
        costPrice: Number(formData.costPrice) || 0,
        sellPrice: Number(formData.sellPrice) || 0,
        gstPercent: Number(formData.gstPercent) || 18,
        stock: Number(formData.stock) || 0
      };
      currentProducts.unshift(newProduct);
      StorageService.save(StorageService.KEYS.PRODUCTS, currentProducts);
      SheetSyncService.syncAdd('Products', newProduct);
      showToast?.(`Product ${newSku} created!`);
    }

    setIsModalOpen(false);
    refreshProducts();
  };

  const handleDeleteProduct = (sku) => {
    if (!window.confirm(`Delete product ${sku}?`)) return;
    const currentProducts = StorageService.get(StorageService.KEYS.PRODUCTS);
    const updated = currentProducts.filter(p => p.sku !== sku);
    StorageService.save(StorageService.KEYS.PRODUCTS, updated);
    SheetSyncService.syncDelete('Products', sku);
    refreshProducts();
    showToast?.('Product deleted');
  };

  // Unique categories
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesQuery = 
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.hsn || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (categoryFilter === 'All') return matchesQuery;
    return matchesQuery && p.category === categoryFilter;
  });

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & HSN Master</h1>
          <p className="page-description">
            Maintain product catalog, pricing, HSN codes, and warehouse stock levels.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Product SKU
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="search-input-box" style={{ maxWidth: '350px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search SKU, name, HSN code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              className="btn btn-secondary btn-sm"
              style={{ background: categoryFilter === cat ? '#e2e8f0' : 'transparent' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Material Description</th>
                <th>Category</th>
                <th>HSN Code</th>
                <th>Selling Price</th>
                <th>Cost Price</th>
                <th>GST Rate</th>
                <th>Current Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const margin = p.sellPrice > 0 ? (((p.sellPrice - p.costPrice) / p.sellPrice) * 100).toFixed(1) : 0;
                const isLowStock = Number(p.stock) < 500;

                return (
                  <tr key={p.sku}>
                    <td>
                      <strong style={{ color: '#1e40af' }}>{p.sku}</strong>
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-contacted">{p.category}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.hsn || '-'}</span>
                    </td>
                    <td>
                      <strong>₹{Number(p.sellPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}> /{p.unit}</span>
                    </td>
                    <td>
                      <span>₹{Number(p.costPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <div style={{ fontSize: '10.5px', color: '#16a34a' }}>Margin: {margin}%</div>
                    </td>
                    <td>{p.gstPercent}%</td>
                    <td>
                      <strong style={{ color: isLowStock ? '#d97706' : '#0f172a' }}>
                        {Number(p.stock).toLocaleString('en-IN')} {p.unit}
                      </strong>
                      {isLowStock && (
                        <div style={{ fontSize: '10.5px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <AlertTriangle size={11} /> Reorder soon
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Edit"
                          onClick={() => handleOpenEditModal(p)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          title="Delete"
                          onClick={() => handleDeleteProduct(p.sku)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? `Edit ${editingProduct.sku}` : 'Add New Material SKU'}</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Material / Product Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. MS Plate 8mm IS 2062 E250"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Steel Plates, Fasteners, Pipes"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 7208"
                      value={formData.hsn}
                      onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit of Measure (UOM)</label>
                    <select 
                      className="form-control"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="Metre">Metre</option>
                      <option value="Piece">Piece / Nos</option>
                      <option value="Ton">Ton (Metric Ton)</option>
                      <option value="Box">Box / Packet</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Applicable GST Rate (%)</label>
                    <select 
                      className="form-control"
                      value={formData.gstPercent}
                      onChange={(e) => setFormData({ ...formData, gstPercent: e.target.value })}
                    >
                      <option value="18">18% (Standard Industrial)</option>
                      <option value="12">12%</option>
                      <option value="5">5%</option>
                      <option value="28">28%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Selling Price (Ex-Works) ₹</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="72.00"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost / Purchase Price ₹</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="56.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Stock Quantity</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="5000"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Mill / Supplier</label>
                    <select 
                      className="form-control"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    >
                      <option value="">-- None Selected --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.company} ({s.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
