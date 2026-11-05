import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sampleKey, customDraft } = req.body || {};
  const draft = customDraft || (sampleKey ? SAMPLES[sampleKey] : null);

  if (!draft) {
    return res.status(400).json({ error: 'Invalid document sample key or custom draft' });
  }

  const state = await getAppState();
  accountingEngine.setState(state);
  accountingEngine.setDraft(draft);
  await saveAppState(accountingEngine.getState());

  return res.status(200).json({ success: true, draft });
}

