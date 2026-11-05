import type { VercelRequest, VercelResponse } from '@vercel/node';
import addHandler from './user/add.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return addHandler(req, res);
}

