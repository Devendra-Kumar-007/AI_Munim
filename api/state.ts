import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState } from './_lib/db.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = await getAppState();
    return res.status(200).json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retrieve state' });
  }
}

