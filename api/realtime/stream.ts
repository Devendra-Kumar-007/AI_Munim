import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState } from '../_lib/db.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    const state = await getAppState();
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  } catch (err) {
    console.error('SSE Stream error:', err);
  }

  res.end();
}

