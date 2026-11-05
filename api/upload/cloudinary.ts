import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadToCloudinary } from '../_lib/cloudinary.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, folder, publicId, resourceType } = req.body || {};
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid file content in request body' });
  }

  const result = await uploadToCloudinary(file, { folder, publicId, resourceType });
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

