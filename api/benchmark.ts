import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from './_lib/db.ts';
import { accountingEngine } from '../src/db/concurrencyEngine.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const state = await getAppState();
  accountingEngine.setState(state);
  const result = accountingEngine.runStressTest();
  await saveAppState(accountingEngine.getState());

  return res.status(200).json(result);
}

