/**
 * Cloudinary upload utilities for business logos
 *
 * Uses Cloudinary for image hosting because:
 * 1. Reliable CDN - images load fast globally
 * 2. Permanent URLs - won't break in emails
 * 3. Automatic optimization - resizes and compresses
 * 4. HTTPS by default - required for email clients
 */

import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Get configured Cloudinary instance
 * Configures at runtime to ensure env vars are available
 */
function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/**
 * Upload a business logo to Cloudinary
 * @param file - Base64 encoded image or URL
 * @param userId - User ID for organizing uploads
 * @returns Upload result with optimized URL
 */
export async function uploadBusinessLogo(
  file: string,
  userId: string
): Promise<UploadResult> {
  try {
    const cloud = getCloudinary();
    const result = await cloud.uploader.upload(file, {
      folder: 'allwondrous/logos',
      public_id: `logo_${userId}_${Date.now()}`,
      // Optimize for logo use
      transformation: [
        { width: 400, height: 400, crop: 'limit' }, // Max size
        { quality: 'auto:good' }, // Auto quality
        { fetch_format: 'auto' }, // Best format (webp/png)
      ],
      // Resource type for images
      resource_type: 'image',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload logo');
  }
}

/**
 * Delete a logo from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteBusinessLogo(publicId: string): Promise<void> {
  try {
    const cloud = getCloudinary();
    await cloud.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw - deletion failures shouldn't block operations
  }
}

/**
 * Get an optimized URL for email use
 * Returns a URL with specific transformations for email compatibility:
 * - PNG format (widest email client support)
 * - Fixed width for consistent display
 * - HTTPS for security
 */
export function getEmailOptimizedLogoUrl(cloudinaryUrl: string, width: number = 150): string {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary')) {
    return cloudinaryUrl;
  }

  // Insert transformation before the version/public_id
  // Format: .../upload/[transformations]/v1234/path/image.ext
  const uploadIndex = cloudinaryUrl.indexOf('/upload/');
  if (uploadIndex === -1) return cloudinaryUrl;

  const baseUrl = cloudinaryUrl.substring(0, uploadIndex + 8); // includes '/upload/'
  const imagePath = cloudinaryUrl.substring(uploadIndex + 8);

  // Add email-optimized transformations:
  // - w_150: width 150px (good for email headers)
  // - f_png: PNG format (best email compatibility)
  // - q_auto: auto quality
  const transformations = `w_${width},f_png,q_auto`;

  return `${baseUrl}${transformations}/${imagePath}`;
}
