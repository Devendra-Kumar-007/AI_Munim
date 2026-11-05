import type { VercelRequest, VercelResponse } from '@vercel/node';
import invoiceHandler from './invoices/index.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return invoiceHandler(req, res);
}

