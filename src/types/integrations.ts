export interface IntegrationsConfig {
  databaseUrl?: string;
  activeAiProvider: 'gemini' | 'openai';
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  fromName?: string;
  appUrl?: string;
}

export interface MaskedIntegrationsConfig {
  databaseUrlConfigured: boolean;
  databaseUrlSnippet?: string;
  activeAiProvider: 'gemini' | 'openai';
  geminiConfigured: boolean;
  geminiModel: string;
  openaiConfigured: boolean;
  openaiModel: string;
  cloudinaryConfigured: boolean;
  cloudinaryCloudName?: string;
  gmailConfigured: boolean;
  gmailUser?: string;
  fromName: string;
  appUrl: string;
}

