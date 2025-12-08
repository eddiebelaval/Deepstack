import { supabase, isSupabaseConfigured } from '../supabase';

const JOURNAL_SCREENSHOTS_BUCKET = 'journal-screenshots';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

/**
 * Compress an image file if it exceeds the threshold
 */
async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESSION_THRESHOLD) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920;
        const scaleFactor = maxWidth / img.width;
        const newWidth = img.width > maxWidth ? maxWidth : img.width;
        const newHeight = img.width > maxWidth ? img.height * scaleFactor : img.height;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // Quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Validate an image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted formats: ${ACCEPTED_FORMATS.join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Upload a screenshot to Supabase Storage
 */
export async function uploadScreenshot(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Compress if needed
  onProgress?.(10);
  const processedFile = await compressImage(file);
  onProgress?.(30);

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = processedFile.name.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${timestamp}-${randomString}.${extension}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .upload(fileName, processedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading screenshot:', error);
    throw error;
  }

  onProgress?.(90);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .getPublicUrl(data.path);

  onProgress?.(100);

  return urlData.publicUrl;
}

/**
 * Delete a screenshot from Supabase Storage
 */
export async function deleteScreenshot(url: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  // Extract path from URL
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split(`/${JOURNAL_SCREENSHOTS_BUCKET}/`);
  if (pathParts.length < 2) {
    throw new Error('Invalid screenshot URL');
  }

  const filePath = pathParts[1];

  const { error } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting screenshot:', error);
    throw error;
  }
}

/**
 * Upload multiple screenshots
 */
export async function uploadMultipleScreenshots(
  files: File[],
  onProgress?: (fileName: string, progress: number) => void
): Promise<string[]> {
  const uploadPromises = files.map(async (file) => {
    try {
      const url = await uploadScreenshot(file, (progress) => {
        onProgress?.(file.name, progress);
      });
      return url;
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}
