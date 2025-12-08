# Journal Screenshot Upload Feature

## Overview
The Trade Journal now supports uploading up to 5 screenshots per journal entry. Screenshots are stored in Supabase Storage and displayed as thumbnails in the journal list.

## Components

### ScreenshotUploader
**Location:** `/Users/eddiebelaval/Development/deepstack/web/src/components/journal/ScreenshotUploader.tsx`

Drag-and-drop image uploader with preview thumbnails.

**Features:**
- Drag & drop or click to browse
- Multiple file upload (up to 5 per entry)
- Real-time upload progress indicators
- Image preview thumbnails with remove functionality
- Client-side image compression for files over 2MB
- File validation (type, size)
- Toast notifications for errors/success

**Props:**
```typescript
interface ScreenshotUploaderProps {
  value: string[];           // Array of screenshot URLs
  onChange: (urls: string[]) => void;  // Callback when URLs change
  maxFiles?: number;         // Max screenshots (default: 5)
  disabled?: boolean;        // Disable upload while saving
}
```

**Usage:**
```tsx
<ScreenshotUploader
  value={screenshotUrls}
  onChange={setScreenshotUrls}
  maxFiles={5}
  disabled={isSaving}
/>
```

### Storage Utilities
**Location:** `/Users/eddiebelaval/Development/deepstack/web/src/lib/supabase/storage.ts`

**Functions:**

#### `uploadScreenshot(file: File, onProgress?: (progress: number) => void): Promise<string>`
Upload a single screenshot to Supabase Storage.
- Validates file type and size
- Compresses images over 2MB
- Returns public URL

#### `deleteScreenshot(url: string): Promise<void>`
Delete a screenshot from Supabase Storage.

#### `validateImageFile(file: File): { valid: boolean; error?: string }`
Validate image file before upload.

#### `uploadMultipleScreenshots(files: File[], onProgress?: (fileName: string, progress: number) => void): Promise<string[]>`
Upload multiple screenshots in parallel.

## Storage Bucket

**Bucket Name:** `journal-screenshots`

**File Organization:**
```
journal-screenshots/
  └── {user_id}/
      ├── {timestamp}-{random}.jpg
      ├── {timestamp}-{random}.png
      └── ...
```

**RLS Policies:**
- Users can upload to their own folder (user_id)
- Anyone can view screenshots (public bucket)
- Users can only update/delete their own screenshots

## Database Schema

The `journal_entries` table includes:
```sql
screenshot_urls JSONB DEFAULT '[]'::jsonb
```

This stores an array of public URLs to uploaded screenshots.

## Image Constraints

- **Max file size:** 5MB
- **Accepted formats:** JPEG, PNG, WEBP
- **Compression threshold:** 2MB
- **Compression settings:**
  - Max width: 1920px
  - Quality: 85%
  - Output format: JPEG

## Display

### Journal List
Screenshots are shown as small thumbnails (3 visible + count indicator):
- 12px height thumbnails
- Lazy loading
- Shows first 3 images
- "+N" indicator for additional screenshots

### Journal Entry Dialog
Full screenshot uploader with:
- Drag & drop zone
- Upload progress bars
- Full-size preview thumbnails
- Remove button on hover

## Migration

Run the migration to create the storage bucket:
```bash
npx supabase migration up
```

Or apply manually:
```sql
-- See: supabase/migrations/005_create_journal_screenshots_bucket.sql
```

## Error Handling

All errors are handled gracefully with toast notifications:
- File validation errors
- Upload failures
- Network errors
- Storage permission errors

## Accessibility

- Semantic HTML with proper alt text
- Keyboard navigation support
- ARIA labels on upload input
- Screen reader friendly

## Performance Optimizations

1. **Client-side compression** - Reduces upload time and storage
2. **Lazy loading** - Images load only when visible
3. **Parallel uploads** - Multiple files upload simultaneously
4. **Progressive enhancement** - Works without JavaScript (basic file input)
5. **Optimistic UI** - Immediate feedback on upload start

## Testing Checklist

- [ ] Upload single screenshot
- [ ] Upload multiple screenshots (up to 5)
- [ ] Drag & drop functionality
- [ ] File validation (wrong type, too large)
- [ ] Image compression (upload file > 2MB)
- [ ] Progress indicators
- [ ] Remove screenshot before save
- [ ] Screenshot thumbnails in journal list
- [ ] Edit entry preserves screenshots
- [ ] Delete entry cleans up screenshots
- [ ] Mobile responsive design
- [ ] Accessibility (keyboard, screen reader)

## Future Enhancements

- [ ] Lightbox/modal for full-size screenshot viewing
- [ ] Screenshot annotations
- [ ] Bulk screenshot upload from trade history
- [ ] Screenshot OCR for trade data extraction
- [ ] Screenshot comparison tool
