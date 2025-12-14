-- ============================================
-- SHOPIFY INTEGRATION - Phase 1
-- ============================================

-- Connected Shopify stores
CREATE TABLE IF NOT EXISTS shopify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,              -- "mystore.myshopify.com"
  shop_name TEXT,                         -- Display name from Shopify
  access_token TEXT NOT NULL,             -- Encrypted via Supabase Vault
  scopes TEXT[],                          -- ['read_products', 'write_products']
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disconnected')),
  webhook_id TEXT,                        -- Shopify webhook ID for product updates
  webhook_secret TEXT,                    -- HMAC verification secret
  settings JSONB DEFAULT '{
    "optimization_mode": "preview",
    "schedule": null,
    "auto_optimize_new": false,
    "default_preset_type": null,
    "default_preset_id": null,
    "notify_on_new_products": true,
    "notify_on_completion": true
  }'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

-- Optimization jobs (batch of products)
CREATE TABLE IF NOT EXISTS shopify_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'webhook', 'scheduled')),
  preset_type TEXT NOT NULL CHECK (preset_type IN ('template', 'studio_preset')),
  preset_id UUID,                         -- References template or studio_preset
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'awaiting_approval',
    'approved', 'pushing', 'completed', 'failed', 'cancelled'
  )),
  product_count INT DEFAULT 0,
  image_count INT DEFAULT 0,
  processed_count INT DEFAULT 0,
  pushed_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                 -- Unapproved jobs expire after 7 days
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual images within a job
CREATE TABLE IF NOT EXISTS shopify_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES shopify_sync_jobs(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_image_id TEXT NOT NULL,
  product_title TEXT,
  image_position INT,                     -- Position in product gallery
  original_url TEXT NOT NULL,
  original_width INT,
  original_height INT,
  optimized_url TEXT,                     -- Supabase Storage public URL
  optimized_storage_path TEXT,            -- Path in Supabase Storage bucket
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'processing', 'ready',
    'approved', 'pushing', 'pushed', 'failed', 'skipped'
  )),
  error_message TEXT,
  tokens_used INT,
  processing_time_ms INT,
  push_attempts INT DEFAULT 0,
  last_push_error TEXT,
  pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shopify_stores_user
  ON shopify_stores(user_id);

CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain
  ON shopify_stores(shop_domain);

CREATE INDEX IF NOT EXISTS idx_shopify_stores_status
  ON shopify_stores(status);

CREATE INDEX IF NOT EXISTS idx_shopify_jobs_store
  ON shopify_sync_jobs(store_id);

CREATE INDEX IF NOT EXISTS idx_shopify_jobs_status
  ON shopify_sync_jobs(status);

CREATE INDEX IF NOT EXISTS idx_shopify_jobs_created
  ON shopify_sync_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopify_jobs_expires
  ON shopify_sync_jobs(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'awaiting_approval';

CREATE INDEX IF NOT EXISTS idx_shopify_images_job
  ON shopify_images(job_id);

CREATE INDEX IF NOT EXISTS idx_shopify_images_status
  ON shopify_images(status);

CREATE INDEX IF NOT EXISTS idx_shopify_images_product
  ON shopify_images(shopify_product_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_shopify_stores_updated_at
  BEFORE UPDATE ON shopify_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shopify_jobs_updated_at
  BEFORE UPDATE ON shopify_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shopify_images_updated_at
  BEFORE UPDATE ON shopify_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_images ENABLE ROW LEVEL SECURITY;

-- Shopify Stores: Users can manage their own stores
CREATE POLICY "Users can view own stores"
  ON shopify_stores FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stores"
  ON shopify_stores FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stores"
  ON shopify_stores FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own stores"
  ON shopify_stores FOR DELETE
  USING (user_id = auth.uid());

-- Sync Jobs: Users can manage jobs for their stores
CREATE POLICY "Users can view jobs for own stores"
  ON shopify_sync_jobs FOR SELECT
  USING (store_id IN (
    SELECT id FROM shopify_stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert jobs for own stores"
  ON shopify_sync_jobs FOR INSERT
  WITH CHECK (store_id IN (
    SELECT id FROM shopify_stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update jobs for own stores"
  ON shopify_sync_jobs FOR UPDATE
  USING (store_id IN (
    SELECT id FROM shopify_stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete jobs for own stores"
  ON shopify_sync_jobs FOR DELETE
  USING (store_id IN (
    SELECT id FROM shopify_stores WHERE user_id = auth.uid()
  ));

-- Images: Users can manage images for their jobs
CREATE POLICY "Users can view images for own jobs"
  ON shopify_images FOR SELECT
  USING (job_id IN (
    SELECT j.id FROM shopify_sync_jobs j
    JOIN shopify_stores s ON j.store_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert images for own jobs"
  ON shopify_images FOR INSERT
  WITH CHECK (job_id IN (
    SELECT j.id FROM shopify_sync_jobs j
    JOIN shopify_stores s ON j.store_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can update images for own jobs"
  ON shopify_images FOR UPDATE
  USING (job_id IN (
    SELECT j.id FROM shopify_sync_jobs j
    JOIN shopify_stores s ON j.store_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete images for own jobs"
  ON shopify_images FOR DELETE
  USING (job_id IN (
    SELECT j.id FROM shopify_sync_jobs j
    JOIN shopify_stores s ON j.store_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- ============================================
-- SERVICE ROLE POLICIES (for Edge Functions)
-- ============================================

-- Allow service role to manage all Shopify data
CREATE POLICY "Service role can manage all stores"
  ON shopify_stores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all jobs"
  ON shopify_sync_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all images"
  ON shopify_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get job statistics
CREATE OR REPLACE FUNCTION get_shopify_job_stats(p_job_id UUID)
RETURNS TABLE (
  total INT,
  queued INT,
  processing INT,
  ready INT,
  pushed INT,
  failed INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total,
    COUNT(*) FILTER (WHERE status = 'queued')::INT as queued,
    COUNT(*) FILTER (WHERE status = 'processing')::INT as processing,
    COUNT(*) FILTER (WHERE status = 'ready')::INT as ready,
    COUNT(*) FILTER (WHERE status = 'pushed')::INT as pushed,
    COUNT(*) FILTER (WHERE status = 'failed')::INT as failed
  FROM shopify_images
  WHERE job_id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update job counts from images
CREATE OR REPLACE FUNCTION update_shopify_job_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shopify_sync_jobs
  SET
    processed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status IN ('ready', 'approved', 'pushing', 'pushed')
    ),
    pushed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'pushed'
    ),
    failed_count = (
      SELECT COUNT(*) FROM shopify_images
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'failed'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_shopify_job_counts
  AFTER INSERT OR UPDATE OF status OR DELETE ON shopify_images
  FOR EACH ROW EXECUTE FUNCTION update_shopify_job_counts();

-- ============================================
-- STORAGE BUCKET FOR TEMP IMAGES
-- ============================================

-- Create storage bucket for temporary optimized images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shopify-temp-images',
  'shopify-temp-images',
  true,  -- Public for preview URLs
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view temp images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shopify-temp-images');

CREATE POLICY "Service role can manage temp images"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'shopify-temp-images')
  WITH CHECK (bucket_id = 'shopify-temp-images');
