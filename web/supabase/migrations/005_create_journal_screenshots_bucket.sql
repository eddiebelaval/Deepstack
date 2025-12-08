-- DeepStack Journal Screenshots Storage Migration
-- Creates a storage bucket for journal entry screenshots

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-screenshots', 'journal-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view all screenshots (public bucket)
CREATE POLICY "Anyone can view screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'journal-screenshots');

-- Allow users to update their own screenshots
CREATE POLICY "Users can update their own screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
