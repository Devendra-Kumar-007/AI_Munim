import type { VercelRequest, VercelResponse } from '@vercel/node';
import postHandler from './bulk/post.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return postHandler(req, res);
}

