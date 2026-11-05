import type { VercelRequest, VercelResponse } from '@vercel/node';
import toggleHandler from './user/toggle.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return toggleHandler(req, res);
}

