import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { getIntegrations } from './db.ts';

export async function configureCloudinary(): Promise<boolean> {
  const integrations = await getIntegrations();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || integrations.cloudinaryCloudName;
  const apiKey = process.env.CLOUDINARY_API_KEY || integrations.cloudinaryApiKey;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || integrations.cloudinaryApiSecret;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  return true;
}

export async function uploadToCloudinary(
  fileContent: string, // URL, data URI, or base64
  options?: {
    folder?: string;
    publicId?: string;
    resourceType?: 'auto' | 'image' | 'raw';
  }
): Promise<{
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  error?: string;
}> {
  const configured = await configureCloudinary();
  if (!configured) {
    return {
      success: false,
      error: 'Cloudinary credentials are not configured. Please enter your Cloud Name, API Key, and API Secret in Settings > Integrations.'
    };
  }

  try {
    const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(fileContent, {
      folder: options?.folder || 'ai-munim/documents',
      public_id: options?.publicId,
      resource_type: options?.resourceType || 'auto'
    });

    return {
      success: true,
      url: uploadResult.url,
      secureUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    };
  } catch (err: any) {
    console.error('[Cloudinary Upload Error]', err);
    return {
      success: false,
      error: err?.message || 'Failed to upload document to Cloudinary.'
    };
  }
}

