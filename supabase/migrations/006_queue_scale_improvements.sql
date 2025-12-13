-- Queue Scale Improvements Migration
-- Adds support for 30K+ images with folder grouping and pagination

-- ============================================
-- ADD NEW COLUMNS TO PROCESSING_QUEUE
-- ============================================
ALTER TABLE processing_queue
ADD COLUMN IF NOT EXISTS folder_path TEXT,
ADD COLUMN IF NOT EXISTS folder_id TEXT,
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'flux-kontext-pro';

-- Add ai_model to processing_history for filtering
ALTER TABLE processing_history
ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- ============================================
-- INDEXES FOR EFFICIENT PAGINATION & GROUPING
-- ============================================
CREATE INDEX IF NOT EXISTS idx_queue_folder_path ON processing_queue(organization_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_queue_folder_id ON processing_queue(organization_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_queue_batch_id ON processing_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_queue_started_at ON processing_queue(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status_org ON processing_queue(organization_id, status, started_at DESC);

-- Composite index for folder stats query
CREATE INDEX IF NOT EXISTS idx_queue_folder_stats ON processing_queue(organization_id, folder_path, status);

-- Index for history filtering
CREATE INDEX IF NOT EXISTS idx_history_ai_model ON processing_history(organization_id, ai_model);
CREATE INDEX IF NOT EXISTS idx_history_completed_at ON processing_history(organization_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_status ON processing_history(organization_id, status);

-- ============================================
-- RPC: GET QUEUE PAGE WITH FILTERS
-- ============================================
CREATE OR REPLACE FUNCTION get_queue_page(
  p_organization_id UUID,
  p_page_size INT DEFAULT 50,
  p_page INT DEFAULT 1,
  p_status TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_folder_path TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  project_id UUID,
  project_name TEXT,
  file_id TEXT,
  file_name TEXT,
  file_url TEXT,
  status TEXT,
  progress INT,
  task_id TEXT,
  generated_prompt TEXT,
  error_message TEXT,
  retry_count INT,
  tokens_reserved DECIMAL,
  folder_path TEXT,
  folder_id TEXT,
  batch_id UUID,
  ai_model TEXT,
  started_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_total BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM processing_queue pq
  WHERE pq.organization_id = p_organization_id
    AND (p_status IS NULL OR pq.status = p_status)
    AND (p_project_id IS NULL OR pq.project_id = p_project_id)
    AND (p_folder_path IS NULL OR pq.folder_path = p_folder_path)
    AND (p_search IS NULL OR pq.file_name ILIKE '%' || p_search || '%');

  RETURN QUERY
  SELECT
    pq.id,
    pq.organization_id,
    pq.project_id,
    p.name AS project_name,
    pq.file_id,
    pq.file_name,
    pq.file_url,
    pq.status,
    pq.progress,
    pq.task_id,
    pq.generated_prompt,
    pq.error_message,
    pq.retry_count,
    pq.tokens_reserved,
    pq.folder_path,
    pq.folder_id,
    pq.batch_id,
    pq.ai_model,
    pq.started_at,
    pq.last_updated,
    v_total AS total_count
  FROM processing_queue pq
  LEFT JOIN projects p ON pq.project_id = p.id
  WHERE pq.organization_id = p_organization_id
    AND (p_status IS NULL OR pq.status = p_status)
    AND (p_project_id IS NULL OR pq.project_id = p_project_id)
    AND (p_folder_path IS NULL OR pq.folder_path = p_folder_path)
    AND (p_search IS NULL OR pq.file_name ILIKE '%' || p_search || '%')
  ORDER BY pq.started_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- ============================================
-- RPC: GET FOLDER STATS FOR QUEUE
-- ============================================
CREATE OR REPLACE FUNCTION get_queue_folder_stats(
  p_organization_id UUID
)
RETURNS TABLE (
  folder_path TEXT,
  folder_id TEXT,
  total_count BIGINT,
  queued_count BIGINT,
  processing_count BIGINT,
  failed_count BIGINT,
  completed_pct DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pq.folder_path,
    pq.folder_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE pq.status = 'queued') AS queued_count,
    COUNT(*) FILTER (WHERE pq.status IN ('processing', 'optimizing')) AS processing_count,
    COUNT(*) FILTER (WHERE pq.status = 'failed') AS failed_count,
    ROUND(
      (COUNT(*) FILTER (WHERE pq.status NOT IN ('queued', 'processing', 'optimizing', 'failed'))::DECIMAL /
       NULLIF(COUNT(*), 0) * 100),
      1
    ) AS completed_pct
  FROM processing_queue pq
  WHERE pq.organization_id = p_organization_id
    AND pq.folder_path IS NOT NULL
  GROUP BY pq.folder_path, pq.folder_id
  ORDER BY pq.folder_path;
END;
$$;

-- ============================================
-- RPC: GET QUEUE STATS (LIGHTWEIGHT)
-- ============================================
CREATE OR REPLACE FUNCTION get_queue_stats(
  p_organization_id UUID
)
RETURNS TABLE (
  total_count BIGINT,
  queued_count BIGINT,
  processing_count BIGINT,
  failed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status = 'queued') AS queued_count,
    COUNT(*) FILTER (WHERE status IN ('processing', 'optimizing')) AS processing_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
  FROM processing_queue
  WHERE organization_id = p_organization_id;
END;
$$;

-- ============================================
-- RPC: BULK INSERT QUEUE ITEMS (CHUNKED)
-- ============================================
CREATE OR REPLACE FUNCTION bulk_insert_queue_items(
  p_items JSONB
)
RETURNS TABLE (
  inserted_count INT,
  batch_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id UUID;
  v_count INT;
BEGIN
  v_batch_id := uuid_generate_v4();

  INSERT INTO processing_queue (
    organization_id,
    project_id,
    file_id,
    file_name,
    file_url,
    folder_path,
    folder_id,
    batch_id,
    ai_model,
    tokens_reserved
  )
  SELECT
    (item->>'organization_id')::UUID,
    (item->>'project_id')::UUID,
    item->>'file_id',
    item->>'file_name',
    item->>'file_url',
    item->>'folder_path',
    item->>'folder_id',
    v_batch_id,
    COALESCE(item->>'ai_model', 'flux-kontext-pro'),
    COALESCE((item->>'tokens_reserved')::DECIMAL, 1.0)
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, v_batch_id;
END;
$$;

-- ============================================
-- RPC: GET HISTORY PAGE WITH FILTERS
-- ============================================
CREATE OR REPLACE FUNCTION get_history_page(
  p_organization_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_page_size INT DEFAULT 50,
  p_page INT DEFAULT 1,
  p_status TEXT DEFAULT NULL,
  p_ai_model TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  project_id UUID,
  file_id TEXT,
  file_name TEXT,
  original_url TEXT,
  optimized_url TEXT,
  optimized_storage_path TEXT,
  status TEXT,
  resolution TEXT,
  tokens_used DECIMAL,
  processing_time_sec INT,
  ai_model TEXT,
  generated_prompt TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_total BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM processing_history ph
  WHERE ph.organization_id = p_organization_id
    AND (p_project_id IS NULL OR ph.project_id = p_project_id)
    AND (p_status IS NULL OR ph.status = p_status)
    AND (p_ai_model IS NULL OR ph.ai_model = p_ai_model)
    AND (p_date_from IS NULL OR ph.completed_at >= p_date_from)
    AND (p_date_to IS NULL OR ph.completed_at <= p_date_to)
    AND (p_search IS NULL OR ph.file_name ILIKE '%' || p_search || '%');

  RETURN QUERY
  SELECT
    ph.id,
    ph.organization_id,
    ph.project_id,
    ph.file_id,
    ph.file_name,
    ph.original_url,
    ph.optimized_url,
    ph.optimized_storage_path,
    ph.status,
    ph.resolution,
    ph.tokens_used,
    ph.processing_time_sec,
    ph.ai_model,
    ph.generated_prompt,
    ph.error_message,
    ph.started_at,
    ph.completed_at,
    ph.created_by,
    v_total AS total_count
  FROM processing_history ph
  WHERE ph.organization_id = p_organization_id
    AND (p_project_id IS NULL OR ph.project_id = p_project_id)
    AND (p_status IS NULL OR ph.status = p_status)
    AND (p_ai_model IS NULL OR ph.ai_model = p_ai_model)
    AND (p_date_from IS NULL OR ph.completed_at >= p_date_from)
    AND (p_date_to IS NULL OR ph.completed_at <= p_date_to)
    AND (p_search IS NULL OR ph.file_name ILIKE '%' || p_search || '%')
  ORDER BY ph.completed_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_queue_page TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_folder_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_insert_queue_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_history_page TO authenticated;
