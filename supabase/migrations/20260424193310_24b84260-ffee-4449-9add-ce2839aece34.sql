-- 1. Interview questions table
CREATE TABLE public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own interview_questions all"
ON public.interview_questions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER interview_questions_set_updated_at
BEFORE UPDATE ON public.interview_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_interview_questions_user ON public.interview_questions(user_id, created_at DESC);

-- 2. Applications: new columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS internship_type TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Storage bucket: uploads (public read, per-user folder write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Authenticated users can upload to their own folder.
-- Path layout: {category}/{user_id}/{filename}
-- foldername(name) -> {category, user_id, ...}; index 2 is user_id (1-based).
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads'
  AND auth.uid()::text = (storage.foldername(name))[2]
);