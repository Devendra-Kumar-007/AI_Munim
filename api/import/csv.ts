import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dataset, rows } = req.body || {};
  if (!dataset || !rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'dataset name and rows array required' });
  }

  const state = await getAppState();
  accountingEngine.setState(state);
  const result = accountingEngine.importCsvDataset(dataset, rows);
  await saveAppState(accountingEngine.getState());

  return res.status(200).json({ success: true, count: result.count, dataset: result.dataset });
}

