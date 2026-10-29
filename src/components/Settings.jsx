import React, { useState } from 'react';
import { 
  Building2, 
  ExternalLink, 
  Download, 
  Upload, 
  Save, 
  Database, 
  Key, 
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { SheetSyncService } from '../services/sheetSync';

const INDIAN_STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'
];

export default function Settings({ showToast }) {
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [restoreText, setRestoreText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    showToast?.('Company profile & settings saved!');
  };

  const handleDownloadBackup = () => {
    const backupJson = StorageService.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CRM_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast?.('Backup JSON downloaded successfully!');
  };

  const handleRestoreBackup = () => {
    if (!restoreText) {
      alert('Please paste the JSON backup content.');
      return;
    }
    const res = StorageService.restoreBackup(restoreText);
    if (res.success) {
      showToast?.('Data restored successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      alert('Failed to restore backup: ' + res.error);
    }
  };

  const handleExportCSV = (key, name) => {
    const data = StorageService.get(key);
    SheetSyncService.downloadCSV(data, name);
    showToast?.(`${name} exported to CSV!`);
  };

  const handleRemoteSync = async () => {
    if (!settings.gasSyncUrl) {
      alert('Please configure your Google Apps Script Web App URL first.');
      return;
    }
    setIsSyncing(true);
    const res = await SheetSyncService.syncToRemote(settings.gasSyncUrl);
    setIsSyncing(false);
    if (res.success) {
      showToast?.('Sync to Google Sheets successful!');
    } else {
      alert('Sync failed: ' + res.error);
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Profile & Data Sync</h1>
          <p className="page-description">
            Manage your firm's GSTIN details, bank accounts for quotes, and Google Sheets cloud integration.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Column: Company Profile Form */}
        <div className="table-card" style={{ padding: '22px' }}>
          <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Building2 size={20} color="#2563eb" /> Business & Quotation Header Details
          </h3>
          <form onSubmit={handleSaveProfile}>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Company / Firm Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Brand / Trade Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ASTER"
                  value={settings.brandName || 'ASTER'}
                  onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Registered Office Address</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Manufacturing Plant Address</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.plantAddress || '42km Stone, Delhi-Mathura Road, Sikri, Faridabad - 121004 (HR.)'}
                onChange={(e) => setSettings({ ...settings, plantAddress: e.target.value })}
              />
            </div>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Firm GSTIN (15 Digits)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Home State (for Tax Auto-Split)</label>
                <select 
                  className="form-control"
                  value={settings.state || 'Haryana'}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Official Phone</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sales Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Official Website</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.website || 'https://www.aggarwalindustries.com'}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              />
            </div>

            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748b', marginTop: '16px', marginBottom: '8px' }}>
              Bank Account for RTGS / NEFT Quotes
            </h4>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.bankName || ''}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.ifsc || ''}
                  onChange={(e) => setSettings({ ...settings, ifsc: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Current Account Number</label>
              <input 
                type="text" 
                className="form-control" 
                value={settings.accountNumber || ''}
                onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
              />
            </div>

            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748b', marginTop: '16px', marginBottom: '8px' }}>
              Optional AI & Cloud API Keys
            </h4>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Free Gemini API Key (Optional)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="AIzaSy..."
                value={settings.geminiApiKey || ''}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Leave empty to use built-in offline templates and 1-click gemini.google.com prompts.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Save size={16} /> Save Company Settings
            </button>
          </form>
        </div>

        {/* Right Column: Google Sheets Integration & Data Backup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Google Sheets Link Card */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileSpreadsheet size={20} color="#16a34a" /> Google Workspace Spreadsheet
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Your Google Sheets database is linked and safe. Open it anytime to inspect raw sheets or share access with your accountant.
            </p>

            <a 
              href={SheetSyncService.getSheetUrl(settings.sheetId)} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '14px', justifyContent: 'center' }}
            >
              <ExternalLink size={16} /> Open Google Sheet in New Tab
            </a>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Export Tables to Excel / CSV:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExportCSV(StorageService.KEYS.LEADS, 'Leads_Enquiries')}
                >
                  <Download size={13} /> Leads CSV
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExportCSV(StorageService.KEYS.CUSTOMERS, 'Customers_Master')}
                >
                  <Download size={13} /> Customers CSV
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExportCSV(StorageService.KEYS.QUOTES, 'Quotes_Register')}
                >
                  <Download size={13} /> Quotes CSV
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExportCSV(StorageService.KEYS.ORDERS, 'Orders_Register')}
                >
                  <Download size={13} /> Orders CSV
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Disaster Recovery */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 className="table-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Database size={20} color="#7c3aed" /> Full CRM Backup & Restore
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Download a complete JSON snapshot of all your leads, quotations, customers, and orders. Zero risk of data loss.
            </p>

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '16px', justifyContent: 'center' }}
              onClick={handleDownloadBackup}
            >
              <Download size={16} /> Download Full JSON Backup
            </button>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <label className="form-label">Restore from JSON Backup:</label>
              <textarea 
                className="form-control" 
                rows="3"
                placeholder="Paste backup JSON string here..."
                value={restoreText}
                onChange={(e) => setRestoreText(e.target.value)}
                style={{ fontSize: '11px', fontFamily: 'monospace', marginBottom: '8px' }}
              />
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleRestoreBackup}
              >
                <Upload size={14} /> Restore Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
