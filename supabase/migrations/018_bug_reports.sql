-- Bug Reports table for user feedback with screenshots
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by status and user
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can create bug reports (authenticated users)
CREATE POLICY "Users can create bug reports" ON bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own bug reports" ON bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for screenshots (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Users can upload bug screenshots" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: anyone can view (public bucket)
CREATE POLICY "Public can view bug screenshots" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'bug-screenshots');
