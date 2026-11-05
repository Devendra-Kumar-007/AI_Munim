import type { VercelRequest, VercelResponse } from '@vercel/node';
import toggleHandler from './doc-series/toggle.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return toggleHandler(req, res);
}

