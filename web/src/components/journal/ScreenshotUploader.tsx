'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { validateImageFile, uploadScreenshot, deleteScreenshot } from '@/lib/supabase/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScreenshotUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

export function ScreenshotUploader({
  value = [],
  onChange,
  maxFiles = 5,
  disabled = false,
}: ScreenshotUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxFiles - value.length - uploadingFiles.length;

      if (fileArray.length > remainingSlots) {
        toast.error(`You can only upload ${remainingSlots} more screenshot${remainingSlots !== 1 ? 's' : ''}`);
        return;
      }

      // Validate all files first
      const validatedFiles: File[] = [];
      for (const file of fileArray) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }
        validatedFiles.push(file);
      }

      if (validatedFiles.length === 0) return;

      // Create uploading file entries
      const newUploadingFiles: UploadingFile[] = validatedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload files
      for (const uploadingFile of newUploadingFiles) {
        try {
          const url = await uploadScreenshot(uploadingFile.file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, progress } : f
              )
            );
          });

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, status: 'complete', url, progress: 100 }
                : f
            )
          );

          onChange([...value, url]);
          toast.success(`${uploadingFile.file.name} uploaded successfully`);

          // Remove from uploading list after a short delay
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadingFile.id));
          }, 1000);
        } catch (error) {
          console.error('Upload error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, status: 'error', error: errorMessage }
                : f
            )
          );
          toast.error(`Failed to upload ${uploadingFile.file.name}: ${errorMessage}`);
        }
      }
    },
    [value, onChange, maxFiles, uploadingFiles.length]
  );

  const handleRemove = useCallback(
    async (url: string) => {
      try {
        // Remove from local state immediately for better UX
        onChange(value.filter((u) => u !== url));

        // Try to delete from storage (non-blocking)
        deleteScreenshot(url).catch((error) => {
          console.error('Error deleting screenshot:', error);
          // We don't show an error to the user since the URL is already removed from the entry
        });
      } catch (error) {
        console.error('Error removing screenshot:', error);
        toast.error('Failed to remove screenshot');
      }
    },
    [value, onChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input value so the same file can be selected again
      e.target.value = '';
    },
    [handleFiles]
  );

  const canAddMore = value.length + uploadingFiles.length < maxFiles;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canAddMore && !disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            type="file"
            id="screenshot-upload"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            disabled={disabled}
          />
          <label
            htmlFor="screenshot-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drop screenshots here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 5MB ({value.length}/{maxFiles} uploaded)
            </p>
          </label>
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {file.status === 'complete' && (
                    <ImageIcon className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  {file.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {file.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded Screenshots */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {value.map((url, index) => (
            <div key={url} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
              <img
                src={url}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(url)}
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!canAddMore && value.length === maxFiles && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum of {maxFiles} screenshots reached
        </p>
      )}
    </div>
  );
}
