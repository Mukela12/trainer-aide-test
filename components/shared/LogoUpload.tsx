'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LogoUploadProps {
  currentLogo?: string | null;
  onLogoChange: (url: string | null) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * LogoUpload component for uploading business logos
 * Uses Cloudinary for reliable image hosting
 */
export function LogoUpload({
  currentLogo,
  onLogoChange,
  className,
  disabled = false,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setPreviewUrl(base64);

        // Upload to server
        const response = await fetch('/api/logos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Update with Cloudinary URL
        setPreviewUrl(data.url);
        onLogoChange(data.url);
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreviewUrl(currentLogo || null);
    } finally {
      setIsUploading(false);
    }
  }, [currentLogo, onLogoChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, handleFileSelect]);

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      const response = await fetch('/api/logos/upload', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove logo');
      }

      setPreviewUrl(null);
      onLogoChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center',
          'w-40 h-40 rounded-xl border-2 border-dashed',
          'transition-colors cursor-pointer',
          disabled
            ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-wondrous-magenta hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-wondrous-magenta animate-spin" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        ) : previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Business logo"
              className="w-full h-full object-contain rounded-lg p-2"
            />
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove logo"
              >
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <ImageIcon size={32} />
            <span className="text-sm font-medium">Upload Logo</span>
            <span className="text-xs">PNG, JPG up to 5MB</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!previewUrl && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2" size={16} />
          Choose File
        </Button>
      )}
    </div>
  );
}
