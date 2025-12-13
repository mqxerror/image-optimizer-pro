import { vi } from 'vitest'

export const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          user: { id: 'test-user-id' }
        }
      }
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test' }
      }),
    }),
  },
}

export const createMockQueueItem = (overrides = {}) => ({
  id: 'test-queue-id',
  organization_id: 'test-org-id',
  project_id: 'test-project-id',
  file_id: 'test-file-id',
  file_name: 'test-image.jpg',
  file_url: null,
  status: 'queued',
  progress: 0,
  task_id: null,
  generated_prompt: null,
  error_message: null,
  retry_count: 0,
  tokens_reserved: 1,
  started_at: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  projects: {
    id: 'test-project-id',
    name: 'Test Project',
    settings: {
      prompt: 'Enhance jewelry image',
      remove_background: true
    }
  },
  ...overrides,
})

export const createMockHistoryItem = (overrides = {}) => ({
  id: 'test-history-id',
  organization_id: 'test-org-id',
  project_id: 'test-project-id',
  file_id: 'test-file-id',
  file_name: 'test-image.jpg',
  original_url: 'https://storage.test.com/original.jpg',
  optimized_url: 'https://storage.test.com/optimized.png',
  optimized_storage_path: 'org/project/optimized_123.png',
  status: 'completed',
  resolution: '2K',
  tokens_used: 1,
  processing_time_sec: 45,
  generated_prompt: 'Enhance this jewelry image',
  error_message: null,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  created_by: 'test-user-id',
  ...overrides,
})

export const createMockGoogleDriveConnection = (overrides = {}) => ({
  id: 'test-connection-id',
  organization_id: 'test-org-id',
  connected_by: 'test-user-id',
  google_email: 'test@gmail.com',
  access_token: 'google-access-token',
  refresh_token: 'google-refresh-token',
  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  is_active: true,
  last_used_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})
