import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAppState, saveAppState } from '../_lib/db.ts';
import { accountingEngine } from '../../src/db/concurrencyEngine.ts';
import { askMultiAi } from '../_lib/ai-provider.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, provider, apiKey, model } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const state = await getAppState();
  accountingEngine.setState(state);

  const aiResult = await askMultiAi(question, state, { provider, apiKey, model });

  accountingEngine.logAction(
    `AI Munim (${aiResult.providerUsed})`,
    `Answered question: "${question.slice(0, 45)}"`,
    'system'
  );
  await saveAppState(accountingEngine.getState());

  return res.status(200).json({
    id: `msg-${Date.now()}`,
    question,
    answer: aiResult.answer,
    basis: aiResult.basis,
    sources: aiResult.sources,
    providerUsed: aiResult.providerUsed,
    modelUsed: aiResult.modelUsed,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  });
}

