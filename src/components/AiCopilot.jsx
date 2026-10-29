import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  MessageCircle, 
  FileText, 
  IndianRupee, 
  ShieldAlert, 
  HelpCircle,
  Clock
} from 'lucide-react';
import { StorageService } from '../services/storage';

export default function AiCopilot({ showToast }) {
  const settings = StorageService.getSettings();
  const leads = StorageService.get(StorageService.KEYS.LEADS);
  const quotes = StorageService.get(StorageService.KEYS.QUOTES);
  const orders = StorageService.get(StorageService.KEYS.ORDERS);
  const customers = StorageService.get(StorageService.KEYS.CUSTOMERS);

  const [selectedTask, setSelectedTask] = useState('whatsapp_followup');
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || '');
  const [customNotes, setCustomNotes] = useState('');
  const [generatedResult, setGeneratedResult] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tasks = [
    {
      id: 'whatsapp_followup',
      title: 'WhatsApp Quote Follow-up',
      desc: 'Polite, persuasive WhatsApp message for a pending quote.',
      icon: MessageCircle
    },
    {
      id: 'payment_reminder',
      title: 'Payment Reminder Notice',
      desc: 'Firm yet professional reminder for overdue receivables.',
      icon: IndianRupee
    },
    {
      id: 'negotiation_defense',
      title: 'Defend Pricing / Margin',
      desc: 'Tactful reply defending rates against aggressive buyer discounts.',
      icon: ShieldAlert
    },
    {
      id: 'daily_briefing',
      title: 'Daily Action Checklist',
      desc: 'Summarize top 3 revenue priorities for today.',
      icon: Clock
    }
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedResult('');

    const targetLead = leads.find(l => l.id === selectedLeadId) || leads[0] || {};
    const targetQuote = quotes.find(q => q.leadId === targetLead.id) || quotes[0] || {};
    const targetCustomer = customers.find(c => c.company === targetLead.company) || {};

    let promptText = '';

    if (selectedTask === 'whatsapp_followup') {
      promptText = `You are a sales manager at ${settings.companyName}, an Indian industrial trading firm.
Draft a short, persuasive WhatsApp message to ${targetLead.contact} at ${targetLead.company}.
Context:
- Material Enquiry: ${targetLead.productInterest} (Qty: ${targetLead.quantity || 'as requested'})
- Estimated Quote: ₹${Number(targetLead.estimatedValue || targetQuote.total || 100000).toLocaleString('en-IN')}
- Notes: ${customNotes || 'Client was comparing market rates'}.

Tone: Respectful Indian business etiquette, concise (under 80 words), asking if any clarification is needed on specifications or delivery schedule.`;
    } else if (selectedTask === 'payment_reminder') {
      promptText = `You are the finance/accounts manager at ${settings.companyName}.
Draft a professional WhatsApp payment reminder for ${targetLead.company} (Contact: ${targetLead.contact}).
Context:
- Outstanding Balance: ₹${Number(targetQuote.total || 85000).toLocaleString('en-IN')}
- Bank Details: ${settings.bankName}, A/C: ${settings.accountNumber}, IFSC: ${settings.ifsc}
- Notes: ${customNotes || 'Payment overdue by 7 days'}.

Tone: Courteous but firm, requesting immediate RTGS/NEFT transaction UTR.`;
    } else if (selectedTask === 'negotiation_defense') {
      promptText = `You are a commercial negotiator at ${settings.companyName}.
Draft a counter-offer/defense message to ${targetLead.contact} at ${targetLead.company} who is asking for an aggressive 5-8% discount on ${targetLead.productInterest}.
Context:
- Quoted Rate: Based on prime test-certified material IS 2062 / SS 304.
- Margin Defence: Mention raw material steel price volatility, certified quality with MTC, ready stock ex-warehouse.
- Compromise Offer: Offer free delivery or 1.5% cash discount against immediate advance RTGS.`;
    } else {
      promptText = `You are a business operations advisor. Analyze the current CRM status:
- Active Leads: ${leads.length}
- Pending Quotes: ${quotes.filter(q => q.status === 'Sent').length}
- Overdue Orders: ${orders.filter(o => o.paymentStatus !== 'Paid').length}
Provide 3 immediate, bulleted actions to maximize cash flow and closed deals today.`;
    }

    // If user provided Gemini API Key in settings, attempt direct API call
    if (settings.geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });
        const data = await resp.json();
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (output) {
          setGeneratedResult(output);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Direct Gemini API call failed, using intelligent template:', err);
      }
    }

    // Built-in Instant High-Quality Intelligent Response
    setTimeout(() => {
      let cannedResponse = '';
      if (selectedTask === 'whatsapp_followup') {
        cannedResponse = `Namaste ${targetLead.contact || 'Sir'} ji 🙏\n\nHope you are doing well.\n\nFollowing up on our quotation for *${targetLead.productInterest || 'material requirement'}* (Quote Ref: ${targetQuote.id || 'QT-0001'}).\n\nWe have fresh stock available with test certificates ready at our Mumbai warehouse. Please let us know if you need any adjustments in the sizes or delivery schedule so we can reserve the material for you.\n\nLooking forward to your confirmation.\n\nWarm regards,\n*${settings.companyName}*\n📞 ${settings.phone}`;
      } else if (selectedTask === 'payment_reminder') {
        cannedResponse = `Dear ${targetLead.contact || 'Sir'},\n\nGreetings from *${settings.companyName}*.\n\nThis is a gentle reminder regarding the outstanding balance of *₹${Number(targetQuote.total || 84960).toLocaleString('en-IN')}* against Order/Invoice.\n\nPlease find our RTGS/NEFT bank details below for payment processing:\n• *Bank:* ${settings.bankName}\n• *A/C No:* ${settings.accountNumber}\n• *IFSC Code:* ${settings.ifsc}\n\nKindly share the transaction UTR once executed so our accounts team can reconcile your ledger.\n\nThank you for your cooperation!`;
      } else if (selectedTask === 'negotiation_defense') {
        cannedResponse = `Dear ${targetLead.contact || 'Sir'},\n\nThank you for your valuable feedback regarding our quotation.\n\nOur quoted rates for *${targetLead.productInterest}* are based on prime grade IS 2062/ASTM materials with complete 3.1 Mill Test Certificates. Given the recent hike in raw material and freight charges, our margins are already very tight.\n\nHowever, to support your project and build a long-term relationship, we can offer an additional *1.5% special rebate* if payment is arranged via immediate RTGS upon dispatch.\n\nPlease confirm so we can update the proforma invoice and initiate dispatch.\n\nBest regards,\n*${settings.companyName}*`;
      } else {
        cannedResponse = `📊 *Daily Action Checklist - ${new Date().toLocaleDateString('en-GB')}*\n\n1. *Follow up with ${targetLead.company || 'Top Lead'}* regarding quotation worth ₹${Number(targetLead.estimatedValue || 100000).toLocaleString('en-IN')} — potential closing deal for this week.\n2. *Dispatch Clearance:* Coordinate with transporter for LR issuance on pending dispatch orders.\n3. *Payment Collections:* Contact accounts at clients with overdue balance to ensure healthy weekend liquidity.`;
      }

      setGeneratedResult(cannedResponse);
      setIsLoading(false);
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResult);
    setIsCopied(true);
    showToast?.('Copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} color="#2563eb" /> AI Sales & Negotiation Copilot
          </h1>
          <p className="page-description">
            Zero-cost, context-aware sales messaging, negotiation counter-offers, and collection notices.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Task & Context Selector */}
        <div className="table-card" style={{ padding: '20px' }}>
          <h3 className="table-title" style={{ marginBottom: '14px' }}>1. Select Sales Task</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {tasks.map(t => {
              const Icon = t.icon;
              const isSelected = selectedTask === t.id;
              return (
                <div 
                  key={t.id}
                  onClick={() => setSelectedTask(t.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '6px', 
                    background: isSelected ? '#2563eb' : '#f1f5f9', 
                    color: isSelected ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? '#1e40af' : '#0f172a' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="table-title" style={{ marginBottom: '10px' }}>2. Choose Client Context</h3>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Client / Opportunity</label>
            <select 
              className="form-control"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.company} ({l.contact}) - {l.productInterest}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Additional Instructions / Buyer Remarks</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Client asking 5% discount, or wants delivery in 2 days..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            <Sparkles size={16} /> {isLoading ? 'Generating Draft...' : 'Generate AI Sales Draft'}
          </button>
        </div>

        {/* Right: Output & Direct Action */}
        <div className="table-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="table-title">3. Generated Sales Message</h3>
            {generatedResult && (
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {isCopied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {isCopied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div style={{ 
            flex: 1, 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            padding: '16px',
            minHeight: '260px',
            whiteSpace: 'pre-wrap',
            fontSize: '13.5px',
            lineHeight: '1.6',
            color: '#1e293b'
          }}>
            {generatedResult ? (
              generatedResult
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '70px' }}>
                <Sparkles size={32} style={{ display: 'block', margin: '0 auto 10px auto' }} />
                Select a task and click "Generate AI Sales Draft" to create instant messages!
              </div>
            )}
          </div>

          {generatedResult && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-whatsapp" 
                style={{ flex: 1 }}
                onClick={() => {
                  const target = leads.find(l => l.id === selectedLeadId) || {};
                  const phone = (target.phone || '').replace(/[^0-9]/g, '');
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedResult)}`, '_blank');
                }}
              >
                <MessageCircle size={16} /> Open in WhatsApp
              </button>
              <button className="btn btn-secondary" onClick={handleCopy}>
                <Copy size={16} /> Copy Text
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
