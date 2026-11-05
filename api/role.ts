import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from './_lib/db.ts';
import { accountingEngine } from '../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role } = req.body || {};
  if (['owner', 'fin', 'col', 'app', 'client'].includes(role)) {
    const state = await getAppState();
    accountingEngine.setState(state);
    accountingEngine.setRole(role);
    const updated = accountingEngine.getState();
    await saveAppState(updated);
    return res.status(200).json({ success: true, role });
  }

  return res.status(400).json({ error: 'Invalid role' });
}

