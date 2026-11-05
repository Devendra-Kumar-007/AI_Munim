import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIntegrations, saveIntegrations, getDbPool } from '../_lib/db.ts';
import { MaskedIntegrationsConfig } from '../../src/types/integrations.ts';

function maskConfig(cfg: any): MaskedIntegrationsConfig {
  const dbUrl = process.env.DATABASE_URL || cfg.databaseUrl || '';
  const geminiKey = process.env.GEMINI_API_KEY || cfg.geminiApiKey || '';
  const openaiKey = process.env.OPENAI_API_KEY || cfg.openaiApiKey || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || cfg.cloudinaryCloudName || '';
  const cloudKey = process.env.CLOUDINARY_API_KEY || cfg.cloudinaryApiKey || '';
  const gmailUser = process.env.GMAIL_USER || cfg.gmailUser || '';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || cfg.gmailAppPassword || '';

  return {
    databaseUrlConfigured: !!dbUrl,
    databaseUrlSnippet: dbUrl ? `${dbUrl.split('@')[1] ? '...@' + dbUrl.split('@')[1].slice(0, 20) + '...' : 'configured'}` : '',
    activeAiProvider: cfg.activeAiProvider || (openaiKey ? 'openai' : 'gemini'),
    geminiConfigured: !!geminiKey,
    geminiModel: cfg.geminiModel || 'gemini-2.5-flash',
    openaiConfigured: !!openaiKey,
    openaiModel: cfg.openaiModel || 'gpt-4o-mini',
    cloudinaryConfigured: !!(cloudName && cloudKey),
    cloudinaryCloudName: cloudName || '',
    gmailConfigured: !!(gmailUser && gmailPass),
    gmailUser: gmailUser || '',
    fromName: cfg.fromName || 'AI Munim Accounts',
    appUrl: cfg.appUrl || 'http://localhost:3000'
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const config = await getIntegrations();
    return res.status(200).json(maskConfig(config));
  }

  if (req.method === 'POST') {
    const updates = req.body || {};
    const filteredUpdates: Record<string, any> = {};

    // Only apply fields if provided and not just placeholder mask
    for (const [k, v] of Object.entries(updates)) {
      if (typeof v === 'string' && v.trim() !== '' && !v.includes('••••')) {
        filteredUpdates[k] = v.trim();
      } else if (k === 'activeAiProvider' && (v === 'openai' || v === 'gemini')) {
        filteredUpdates[k] = v;
      }
    }

    const updated = await saveIntegrations(filteredUpdates);
    return res.status(200).json({
      success: true,
      config: maskConfig(updated)
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

