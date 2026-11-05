import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { accountingEngine } from './src/db/concurrencyEngine.ts';
import { formatINR, getEligibleItc, calculateCashForecast } from './src/utils/accounting.ts';
import { askMultiAi } from './api/_lib/ai-provider.ts';
import { uploadToCloudinary } from './api/_lib/cloudinary.ts';
import { sendEmail, verifySmtp } from './api/_lib/email.ts';
import { getIntegrations, saveIntegrations, saveAppState, getAppState } from './api/_lib/db.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// --- SSE CLIENTS FOR REAL-TIME STREAMING ---
const sseClients: Response[] = [];

function broadcastStateUpdate() {
  const data = JSON.stringify(accountingEngine.getState());
  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// Real-time Server-Sent Events endpoint
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(accountingEngine.getState())}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// --- REST API ENDPOINTS ---
app.get('/api/state', (req: Request, res: Response) => {
  res.json(accountingEngine.getState());
});

app.post('/api/role', (req: Request, res: Response) => {
  const { role } = req.body;
  if (['owner', 'fin', 'col', 'app'].includes(role)) {
    accountingEngine.setRole(role);
    broadcastStateUpdate();
    return res.json({ success: true, role });
  }
  res.status(400).json({ error: 'Invalid role' });
});

// Authentication endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = accountingEngine.loginUser(email, password);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  accountingEngine.logoutUser();
  broadcastStateUpdate();
  res.json({ success: true });
});

// Document capture across all types
app.post('/api/documents/capture', (req: Request, res: Response) => {
  const { sampleKey } = req.body; // 's' | 'p' | 'd' | 'cn' | 'dn' | 'exp' | 'bst'

  const SAMPLES: Record<string, any> = {
    s: {
      id: `doc-${Date.now()}`,
      type: 'Sales Invoice',
      party: 'Bluewave Services',
      docNo: 'INV-1058',
      date: '04 Nov 2026',
      gstin: '06AABCB4521K1Z7',
      taxableValue: 84000,
      gstRate: 18,
      hsn: '998314',
      ledger: 'Consulting Revenue',
      ledgerConfidence: 71,
      status: 'Extracted',
      userEditedLedger: false
    },
    p: {
      id: `doc-${Date.now()}`,
      type: 'Purchase Invoice',
      party: 'Delta Chemicals',
      docNo: 'DC-910',
      date: '30 Oct 2026',
      gstin: '06AAECD1177H1Z4',
      taxableValue: 67222,
      gstRate: 18,
      hsn: '2915',
      ledger: 'Raw Materials Purchase',
      ledgerConfidence: 92,
      status: 'Extracted',
      userEditedLedger: false
    },
    d: {
      id: `doc-${Date.now()}`,
      type: 'Purchase Invoice',
      party: 'Raj Polymers',
      docNo: 'RP/221',
      date: '28 Oct 2026',
      gstin: '06AAACR8890M1Z2',
      taxableValue: 175000,
      gstRate: 18,
      hsn: '3901',
      ledger: 'Raw Materials Purchase',
      ledgerConfidence: 95,
      status: 'Extracted',
      userEditedLedger: false
    },
    cn: {
      id: `doc-${Date.now()}`,
      type: 'Credit Note',
      party: 'Gupta Exports',
      docNo: 'CN-04',
      date: '02 Nov 2026',
      gstin: '06AABCG1290L1Z3',
      taxableValue: 15000,
      gstRate: 18,
      hsn: '998314',
      ledger: 'Sales Returns & Allowances',
      ledgerConfidence: 94,
      status: 'Extracted',
      userEditedLedger: false
    },
    dn: {
      id: `doc-${Date.now()}`,
      type: 'Debit Note',
      party: 'Raj Polymers',
      docNo: 'DN-02',
      date: '01 Nov 2026',
      gstin: '06AAACR8890M1Z2',
      taxableValue: 8500,
      gstRate: 18,
      hsn: '3901',
      ledger: 'Purchase Returns',
      ledgerConfidence: 91,
      status: 'Extracted',
      userEditedLedger: false
    },
    exp: {
      id: `doc-${Date.now()}`,
      type: 'Expense Voucher',
      party: 'Apex Packaging',
      docNo: 'EXP-318',
      date: '03 Nov 2026',
      gstin: '06AABCA7712P1Z0',
      taxableValue: 12400,
      gstRate: 12,
      hsn: '4819',
      ledger: 'Office Expenses',
      ledgerConfidence: 89,
      status: 'Extracted',
      userEditedLedger: false
    },
    bst: {
      id: `doc-${Date.now()}`,
      type: 'Bank Statement',
      party: 'ICICI Bank Current A/c',
      docNo: 'BST-112',
      date: '04 Nov 2026',
      gstin: '06AAACI0001K1Z9',
      taxableValue: 118000,
      gstRate: 0,
      hsn: '997119',
      ledger: 'Bank Charges',
      ledgerConfidence: 98,
      status: 'Extracted',
      userEditedLedger: false
    }
  };

  const draft = SAMPLES[sampleKey];
  if (!draft) {
    return res.status(400).json({ error: 'Invalid document sample key' });
  }

  accountingEngine.setDraft(draft);
  broadcastStateUpdate();
  res.json({ success: true, draft });
});

// Bulk Batch OCR Ingestion
app.post('/api/documents/bulk', (req: Request, res: Response) => {
  const { docType, files } = req.body;
  const batch = accountingEngine.createBulkBatch(docType || 'Purchase Invoice', files || []);
  broadcastStateUpdate();
  res.json({ success: true, batch });
});

app.post('/api/documents/bulk/post', (req: Request, res: Response) => {
  const result = accountingEngine.postBulkBatch();
  broadcastStateUpdate();
  res.json({ success: true, ...result });
});

app.post('/api/documents/bulk/clear', (req: Request, res: Response) => {
  accountingEngine.clearBulkBatch();
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/documents/submit', (req: Request, res: Response) => {
  const ok = accountingEngine.submitDraftForApproval();
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/documents/approve', (req: Request, res: Response) => {
  const ok = accountingEngine.postDraft();
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/documents/clear', (req: Request, res: Response) => {
  accountingEngine.setDraft(null);
  broadcastStateUpdate();
  res.json({ success: true });
});

// Payables: Add Supplier Bill
app.post('/api/bills', (req: Request, res: Response) => {
  const { party, docNo, gstin, taxableValue, gstRate, ledger, idempotencyKey } = req.body;
  const result = accountingEngine.addSupplierBill({
    party,
    docNo,
    gstin,
    taxableValue: parseFloat(taxableValue),
    gstRate: parseInt(gstRate, 10),
    ledger,
    idempotencyKey
  });

  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/bills/approve', (req: Request, res: Response) => {
  const { index } = req.body;
  const result = accountingEngine.approvePendingBill(index);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

app.post('/api/bills/reject', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.rejectPendingBill(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Collections: Promise, Dispute, Reminder
app.post('/api/collections/promise', (req: Request, res: Response) => {
  const { index, days } = req.body;
  const ok = accountingEngine.recordPromise(index, days);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/collections/dispute', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.toggleDispute(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/collections/remind', (req: Request, res: Response) => {
  const { index } = req.body;
  const result = accountingEngine.sendReminder(index);
  if (result.success) broadcastStateUpdate();
  res.json(result);
});

// GST Reconciliation Actions
app.post('/api/gst/resolve', (req: Request, res: Response) => {
  const { index, action } = req.body;
  const ok = accountingEngine.resolveGstRow(index, action);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Bank Reconciliation
app.post('/api/bank/confirm', (req: Request, res: Response) => {
  const { id } = req.body;
  const ok = accountingEngine.reconcileBankLine(id);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/bank/exception', (req: Request, res: Response) => {
  const { id } = req.body;
  const ok = accountingEngine.sendBankLineToException(id);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

// Concurrency Benchmark Runner
app.post('/api/benchmark', (req: Request, res: Response) => {
  const { count } = req.body;
  const result = accountingEngine.runConcurrencyBenchmark(count || 200);
  broadcastStateUpdate();
  res.json(result);
});

// Multi-AI Assistant (OpenAI + Gemini + Deterministic)
app.post('/api/ai/ask', async (req: Request, res: Response) => {
  const { question, provider, apiKey, model } = req.body;
  const state = accountingEngine.getState();
  const qLower = (question || '').toLowerCase();

  try {
    const aiResult = await askMultiAi(question, state, { provider, apiKey, model });
    accountingEngine.logAction(
      `AI Munim (${aiResult.providerUsed})`,
      `Answered question: "${(question || '').slice(0, 45)}"`,
      'system'
    );
    broadcastStateUpdate();

    res.json({
      question,
      answer: aiResult.answer,
      basis: aiResult.basis,
      sources: aiResult.sources,
      providerUsed: aiResult.providerUsed,
      modelUsed: aiResult.modelUsed,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to process AI query' });
  }
});

// Integrations Settings
app.get('/api/settings/integrations', async (req: Request, res: Response) => {
  const cfg = await getIntegrations();
  const dbUrl = process.env.DATABASE_URL || cfg.databaseUrl || '';
  const geminiKey = process.env.GEMINI_API_KEY || cfg.geminiApiKey || '';
  const openaiKey = process.env.OPENAI_API_KEY || cfg.openaiApiKey || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || cfg.cloudinaryCloudName || '';
  const cloudKey = process.env.CLOUDINARY_API_KEY || cfg.cloudinaryApiKey || '';
  const gmailUser = process.env.GMAIL_USER || cfg.gmailUser || '';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || cfg.gmailAppPassword || '';

  res.json({
    databaseUrlConfigured: !!dbUrl,
    databaseUrlSnippet: dbUrl ? `${dbUrl.split('@')[1] ? '...@' + dbUrl.split('@')[1].slice(0, 20) + '...' : 'configured'}` : '',
    activeAiProvider: cfg.activeAiProvider || (openaiKey ? 'openai' : 'gemini'),
    geminiConfigured: !!geminiKey,
    geminiModel: cfg.geminiModel || 'gemini-2.5-flash',
    openaiConfigured: !!openaiKey,
    openaiModel: cfg.openaiModel || 'gpt-4o-mini',
    cloudinaryConfigured: !!(cloudName && cloudKey),
    cloudinaryCloudName: cloudName || '',
    gmailConfigured: !!(gmailUser && gmailPass),
    gmailUser: gmailUser || '',
    fromName: cfg.fromName || 'AI Munim Accounts',
    appUrl: cfg.appUrl || 'http://localhost:3000'
  });
});

app.post('/api/settings/integrations', async (req: Request, res: Response) => {
  const updates = req.body || {};
  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (typeof v === 'string' && v.trim() !== '' && !v.includes('••••')) {
      filtered[k] = v.trim();
    } else if (k === 'activeAiProvider' && (v === 'openai' || v === 'gemini')) {
      filtered[k] = v;
    }
  }
  const updated = await saveIntegrations(filtered);
  res.json({ success: true, config: updated });
});

// Test Email Endpoint
app.post('/api/settings/test-email', async (req: Request, res: Response) => {
  const { toEmail } = req.body;
  if (!toEmail) {
    const verifyRes = await verifySmtp();
    return res.status(verifyRes.success ? 200 : 400).json(verifyRes);
  }
  const result = await sendEmail({
    to: toEmail,
    subject: 'AI Munim: Gmail SMTP Integration Test',
    text: `Greetings from AI Munim!\n\nThis confirms your Gmail SMTP is connected and operating successfully.\n\nTimestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">AI Munim Email System</h2>
        <p>Your Gmail SMTP integration is connected and verified!</p>
        <p style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px;">
          <strong>Target:</strong> ${toEmail}<br/>
          <strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
        <p style="font-size: 12px; color: #64748b;">This email was dispatched via Nodemailer Gmail SMTP.</p>
      </div>
    `
  });
  if (result.success) {
    res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } else {
    res.status(400).json(result);
  }
});

// Cloudinary Upload Endpoint
app.post('/api/upload/cloudinary', async (req: Request, res: Response) => {
  const { file, folder, publicId, resourceType } = req.body;
  if (!file) {
    return res.status(400).json({ error: 'Missing file payload' });
  }
  const result = await uploadToCloudinary(file, { folder, publicId, resourceType });
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Email Dispatch Endpoint
app.post('/api/email/send', async (req: Request, res: Response) => {
  const { to, subject, text, html, attachments } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'Both "to" and "subject" are required' });
  }
  const result = await sendEmail({ to, subject, text, html, attachments });
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Settings
app.post('/api/settings/company', (req: Request, res: Response) => {
  accountingEngine.updateCompany(req.body);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/settings/user/toggle', (req: Request, res: Response) => {
  const { index } = req.body;
  const ok = accountingEngine.toggleUserStatus(index);
  if (ok) broadcastStateUpdate();
  res.json({ success: ok });
});

app.post('/api/settings/user/add', (req: Request, res: Response) => {
  const { name, email, role } = req.body;
  accountingEngine.addUser(name, email, role);
  broadcastStateUpdate();
  res.json({ success: true });
});

// Dropdown Masters Routes
app.post('/api/masters/account', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterAccount(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/account/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterAccount(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/item', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterItem(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/item/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterItem(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/tax-code', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterTaxCode(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/tax-code/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterTaxCode(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/cost-centre', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterCostCentre(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/cost-centre/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterCostCentre(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/bank-account', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterBankAccount(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/bank-account/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterBankAccount(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/doc-series', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterDocSeries(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/doc-series/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterDocSeries(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

app.post('/api/masters/party', (req: Request, res: Response) => {
  const item = accountingEngine.addMasterParty(req.body);
  broadcastStateUpdate();
  res.json({ success: true, item });
});

app.post('/api/masters/party/toggle', (req: Request, res: Response) => {
  accountingEngine.toggleMasterParty(req.body.id);
  broadcastStateUpdate();
  res.json({ success: true });
});

// Bulk CSV Dataset Import Endpoint
app.post('/api/import/csv', (req: Request, res: Response) => {
  const { dataset, rows } = req.body;
  if (!dataset || !rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'dataset name and rows array required' });
  }
  const result = accountingEngine.importCsvDataset(dataset, rows);
  broadcastStateUpdate();
  res.json({ success: true, count: result.count, dataset: result.dataset });
});

// Fast-track Approver Sign-off override
app.post('/api/documents/quick-approve', (req: Request, res: Response) => {
  const { approverName } = req.body;
  const success = accountingEngine.quickApproveAndPost(approverName);
  if (success) {
    broadcastStateUpdate();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No active draft to approve' });
  }
});

// Update draft field dynamically
app.post('/api/documents/update-field', (req: Request, res: Response) => {
  const { field, value } = req.body;
  const success = accountingEngine.updateDraftField(field, value);
  if (success) {
    broadcastStateUpdate();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No active draft' });
  }
});

// Live Sales Invoices
app.post('/api/invoices', (req: Request, res: Response) => {
  const result = accountingEngine.addSalesInvoice(req.body);
  if (result.success) {
    broadcastStateUpdate();
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Live Bank Transaction Lines
app.post('/api/bank/lines', (req: Request, res: Response) => {
  const result = accountingEngine.addBankTransactionLine(req.body);
  if (result.success) {
    broadcastStateUpdate();
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Live GSTR-2B Records
app.post('/api/gst/rows', (req: Request, res: Response) => {
  const result = accountingEngine.addGstRecord(req.body);
  if (result.success) {
    broadcastStateUpdate();
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Live State Fresh Reset
app.post('/api/state/reset', (req: Request, res: Response) => {
  accountingEngine.resetToLiveEmptyState();
  broadcastStateUpdate();
  res.json({ success: true, message: 'All transactional registers reset to clean zero-state' });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname || process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Munim Node.js + PostgreSQL Engine running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
