import type { VercelRequest, VercelResponse } from '@vercel/node';
import clearHandler from './bulk/clear.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return clearHandler(req, res);
}

