import React, { useState, useEffect } from 'react';
import {
  Database,
  Sparkles,
  Bot,
  Cloud,
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  Server,
  Zap,
  Globe
} from 'lucide-react';
import { MaskedIntegrationsConfig } from '../../types/integrations.ts';

interface IntegrationsSettingsViewProps {
  onShowToast?: (msg: string) => void;
}

export const IntegrationsSettingsView: React.FC<IntegrationsSettingsViewProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<MaskedIntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [activeAiProvider, setActiveAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');

  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');

  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [fromName, setFromName] = useState('AI Munim Accounts');
  const [appUrl, setAppUrl] = useState('');

  // Password visibility toggles
  const [showDbUrl, setShowDbUrl] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);
  const [showGmailPass, setShowGmailPass] = useState(false);

  // Test Actions
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  const [testAiPrompt, setTestAiPrompt] = useState('Summarize our financial cash runway');
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);

  const [uploadingTestFile, setUploadingTestFile] = useState(false);
  const [uploadResultUrl, setUploadResultUrl] = useState<string | null>(null);

  // Load config on mount
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/integrations');
      if (res.ok) {
        const data: MaskedIntegrationsConfig = await res.json();
        setConfig(data);
        setActiveAiProvider(data.activeAiProvider || 'gemini');
        setGeminiModel(data.geminiModel || 'gemini-2.5-flash');
        setOpenaiModel(data.openaiModel || 'gpt-4o-mini');
        setCloudinaryCloudName(data.cloudinaryCloudName || '');
        setGmailUser(data.gmailUser || '');
        setFromName(data.fromName || 'AI Munim Accounts');
        setAppUrl(data.appUrl || window.location.origin);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        activeAiProvider,
        geminiModel,
        openaiModel,
        fromName,
        appUrl
      };

      if (databaseUrl) payload.databaseUrl = databaseUrl;
      if (geminiApiKey) payload.geminiApiKey = geminiApiKey;
      if (openaiApiKey) payload.openaiApiKey = openaiApiKey;
      if (cloudinaryCloudName) payload.cloudinaryCloudName = cloudinaryCloudName;
      if (cloudinaryApiKey) payload.cloudinaryApiKey = cloudinaryApiKey;
      if (cloudinaryApiSecret) payload.cloudinaryApiSecret = cloudinaryApiSecret;
      if (gmailUser) payload.gmailUser = gmailUser;
      if (gmailAppPassword) payload.gmailAppPassword = gmailAppPassword;

      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setConfig(result.config);
        // Clear secret inputs after save
        setDatabaseUrl('');
        setGeminiApiKey('');
        setOpenaiApiKey('');
        setCloudinaryApiKey('');
        setCloudinaryApiSecret('');
        setGmailAppPassword('');

        if (onShowToast) {
          onShowToast('✓ Integrations updated and securely stored in NeonDB');
        } else {
          alert('Integrations updated successfully!');
        }
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving integrations:', err);
      alert('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) {
      alert('Please enter an email address to send the test message to.');
      return;
    }
    setSendingTestEmail(true);
    setEmailStatusMessage(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmailTo })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatusMessage(`✓ Success: ${data.message}`);
      } else {
        setEmailStatusMessage(`✕ Error: ${data.error || 'Failed to send test email'}`);
      }
    } catch (err: any) {
      setEmailStatusMessage(`✕ Connection error: ${err.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleTestAi = async () => {
    if (!testAiPrompt.trim()) return;
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testAiPrompt,
          provider: activeAiProvider
        })
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setAiTestResult(`[${data.providerUsed.toUpperCase()} - ${data.modelUsed || 'Default'}]:\n${data.answer}`);
      } else {
        setAiTestResult(`Error: ${data.error || 'No response'}`);
      }
    } catch (err: any) {
      setAiTestResult(`Error: ${err.message}`);
    } finally {
      setTestingAi(false);
    }
  };

  const handleTestCloudinaryUpload = async () => {
    setUploadingTestFile(true);
    setUploadResultUrl(null);
    try {
      // 1x1 transparent PNG data URI for verification
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAESTUYAAAAAElFTkSuQmCC';
      const res = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: samplePng,
          folder: 'ai-munim/verification'
        })
      });
      const data = await res.json();
      if (res.ok && data.secureUrl) {
        setUploadResultUrl(data.secureUrl);
      } else {
        alert(data.error || 'Cloudinary upload failed.');
      }
    } catch (err: any) {
      alert(`Error uploading: ${err.message}`);
    } finally {
      setUploadingTestFile(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
        <span>Loading integrations status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
              <Zap className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Cloud Integrations &amp; API Keys</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your persistent Neon PostgreSQL connection, Multi-AI providers, Cloudinary storage, and Gmail SMTP.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={fetchConfig}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save All Integrations'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. NeonDB PostgreSQL Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">NeonDB PostgreSQL Backend</h4>
                <p className="text-xs text-slate-500">Persistent storage for general ledgers, documents, and audit logs.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {config?.databaseUrlConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Memory Fallback
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PostgreSQL Connection String (DATABASE_URL)
              </label>
              <div className="relative">
                <input
                  type={showDbUrl ? 'text' : 'password'}
                  value={databaseUrl}
                  onChange={e => setDatabaseUrl(e.target.value)}
                  placeholder={config?.databaseUrlConfigured ? `Configured: ${config.databaseUrlSnippet}` : 'postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require'}
                  className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDbUrl(!showDbUrl)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showDbUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Obtain your connection URL from your Neon Console. In Vercel, this can also be set via the Vercel Dashboard Environment Variables.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Multi-AI Providers Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Multi-AI Financial Intelligence</h4>
                <p className="text-xs text-slate-500">Choose between Google Gemini or OpenAI ChatGPT for accounting queries.</p>
              </div>
            </div>

            {/* Provider Toggle Pill */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveAiProvider('gemini')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeAiProvider === 'gemini'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setActiveAiProvider('openai')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeAiProvider === 'openai'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OpenAI ChatGPT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Google Gemini Card */}
            <div className={`p-4 rounded-xl border ${activeAiProvider === 'gemini' ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  Google Gemini Configuration
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config?.geminiConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {config?.geminiConfigured ? 'Active Key' : 'No Key'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Gemini API Key (GEMINI_API_KEY)
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={e => setGeminiApiKey(e.target.value)}
                      placeholder={config?.geminiConfigured ? '••••••••••••••••••••' : 'AIzaSy...'}
                      className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Gemini Model
                  </label>
                  <select
                    value={geminiModel}
                    onChange={e => setGeminiModel(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; Accurate)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Financial Reasoning)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  </select>
                </div>
              </div>
            </div>

            {/* OpenAI Card */}
            <div className={`p-4 rounded-xl border ${activeAiProvider === 'openai' ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-600" />
                  OpenAI ChatGPT Configuration
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config?.openaiConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {config?.openaiConfigured ? 'Active Key' : 'No Key'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    OpenAI API Key (OPENAI_API_KEY)
                  </label>
                  <div className="relative">
                    <input
                      type={showOpenaiKey ? 'text' : 'password'}
                      value={openaiApiKey}
                      onChange={e => setOpenaiApiKey(e.target.value)}
                      placeholder={config?.openaiConfigured ? '••••••••••••••••••••' : 'sk-proj-...'}
                      className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showOpenaiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    OpenAI Model
                  </label>
                  <select
                    value={openaiModel}
                    onChange={e => setOpenaiModel(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective &amp; High Speed)</option>
                    <option value="gpt-4o">gpt-4o (Frontier Model)</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Test AI Query Box */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[11px] font-semibold text-slate-700 mb-1">
              Verify Multi-AI Query ({activeAiProvider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini'})
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={testAiPrompt}
                onChange={e => setTestAiPrompt(e.target.value)}
                placeholder="Ask financial question..."
                className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={handleTestAi}
                disabled={testingAi}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>{testingAi ? 'Calling...' : 'Test AI'}</span>
              </button>
            </div>
            {aiTestResult && (
              <pre className="mt-2 p-2.5 bg-white border border-slate-200 rounded text-[11px] text-slate-800 whitespace-pre-wrap font-sans">
                {aiTestResult}
              </pre>
            )}
          </div>
        </div>

        {/* 3. Cloudinary Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Cloudinary Document &amp; File Storage</h4>
                <p className="text-xs text-slate-500">Secure cloud storage for sales invoices, purchase bills, and receipts.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {config?.cloudinaryConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cloud Name (CLOUDINARY_CLOUD_NAME)
              </label>
              <input
                type="text"
                value={cloudinaryCloudName}
                onChange={e => setCloudinaryCloudName(e.target.value)}
                placeholder={config?.cloudinaryCloudName || 'your-cloud-name'}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                API Key (CLOUDINARY_API_KEY)
              </label>
              <input
                type="text"
                value={cloudinaryApiKey}
                onChange={e => setCloudinaryApiKey(e.target.value)}
                placeholder={config?.cloudinaryConfigured ? '••••••••••••' : '123456789...'}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                API Secret (CLOUDINARY_API_SECRET)
              </label>
              <div className="relative">
                <input
                  type={showCloudinarySecret ? 'text' : 'password'}
                  value={cloudinaryApiSecret}
                  onChange={e => setCloudinaryApiSecret(e.target.value)}
                  placeholder={config?.cloudinaryConfigured ? '••••••••••••' : 'Secret...'}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showCloudinarySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-600">Test document attachment &amp; CDN distribution:</span>
            <button
              type="button"
              onClick={handleTestCloudinaryUpload}
              disabled={uploadingTestFile}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
            >
              {uploadingTestFile ? 'Uploading...' : 'Test Cloudinary Upload'}
            </button>
          </div>
          {uploadResultUrl && (
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5 break-all">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Asset Uploaded: <a href={uploadResultUrl} target="_blank" rel="noreferrer" className="underline">{uploadResultUrl}</a></span>
            </div>
          )}
        </div>

        {/* 4. Gmail SMTP Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Gmail SMTP (Nodemailer)</h4>
                <p className="text-xs text-slate-500">Automated payment reminders, tax invoices, and verification notifications.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {config?.gmailConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Gmail Address (GMAIL_USER)
              </label>
              <input
                type="email"
                value={gmailUser}
                onChange={e => setGmailUser(e.target.value)}
                placeholder={config?.gmailUser || 'finance@yourcompany.com'}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Google 16-Char App Password (GMAIL_APP_PASSWORD)
              </label>
              <div className="relative">
                <input
                  type={showGmailPass ? 'text' : 'password'}
                  value={gmailAppPassword}
                  onChange={e => setGmailAppPassword(e.target.value)}
                  placeholder={config?.gmailConfigured ? '•••• •••• •••• ••••' : 'xxxx xxxx xxxx xxxx'}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 focus:bg-white font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowGmailPass(!showGmailPass)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showGmailPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                From Sender Display Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={e => setFromName(e.target.value)}
                placeholder="AI Munim Accounts"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="block text-[11px] font-semibold text-slate-700 mb-1">
              Dispatch Verification Test Email
            </span>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                placeholder="Recipient email address (e.g. test@example.com)..."
                className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={sendingTestEmail}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md flex items-center gap-1"
              >
                <Mail className="w-3 h-3" />
                <span>{sendingTestEmail ? 'Sending...' : 'Send Test Email'}</span>
              </button>
            </div>
            {emailStatusMessage && (
              <p className={`mt-2 text-xs font-medium ${emailStatusMessage.startsWith('✓') ? 'text-emerald-700' : 'text-rose-700'}`}>
                {emailStatusMessage}
              </p>
            )}
          </div>
        </div>

        {/* 5. Vercel & Application URL */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Application &amp; Vercel Deployment URL</h4>
              <p className="text-xs text-slate-500">Root domain for document URLs, customer reminder links, and webhook callbacks.</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Base URL (APP_URL)
            </label>
            <input
              type="text"
              value={appUrl}
              onChange={e => setAppUrl(e.target.value)}
              placeholder="https://your-app.vercel.app"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white font-mono"
            />
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Integrations'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

