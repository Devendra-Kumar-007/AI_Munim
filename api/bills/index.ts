import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { party, docNo, gstin, taxableValue, gstRate, ledger, idempotencyKey } = req.body || {};
  const state = await getAppState();
  accountingEngine.setState(state);

  const result = accountingEngine.addSupplierBill({
    party,
    docNo,
    gstin,
    taxableValue: parseFloat(taxableValue),
    gstRate: parseInt(gstRate, 10),
    ledger,
    idempotencyKey
  });

  if (result.success) {
    await saveAppState(accountingEngine.getState());
  }

  return res.status(200).json(result);
}

